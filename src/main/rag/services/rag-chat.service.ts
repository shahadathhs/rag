import type { PaginationDto } from '@/common/dto/pagination.dto';
import type {
  TPaginatedResponse,
  TResponse,
} from '@/common/utils/response.util';
import {
  successPaginatedResponse,
  successResponse,
} from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import {
  Conversation,
  ConversationDocument,
} from '@/lib/database/schemas/conversation.schema';
import {
  RagMessage,
  RagMessageDocument,
} from '@/lib/database/schemas/rag-message.schema';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OllamaService } from './ollama.service';
import { VectorSearchService } from './vector-search.service';

@Injectable()
export class RagChatService {
  private readonly logger = new Logger(RagChatService.name);

  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(RagMessage.name)
    private readonly messageModel: Model<RagMessageDocument>,
    private readonly vectorSearch: VectorSearchService,
    private readonly ollama: OllamaService,
  ) {}

  @HandleError('Error chatting', 'conversationId')
  async chat(
    conversationId: string,
    message: string,
    userId: string,
  ): Promise<TResponse<{ response: string; sources: any[] }>> {
    const conversation = await this.conversationModel.findOne({
      _id: new Types.ObjectId(conversationId),
      userId: new Types.ObjectId(userId),
    });

    if (!conversation) {
      throw new AppError(404, 'Conversation not found');
    }

    // Save user message
    await this.messageModel.create({
      conversationId,
      userId,
      role: 'user',
      content: message,
    });

    const searchResults = await this.retrieveContext(message, userId);
    const { context, resultsForResponse } =
      this.buildContextForPrompt(searchResults);
    const messages = this.assembleChatMessages(message, context);

    const response = await this.ollama.generateChatResponse(messages);

    this.logger.log('Response:', response);

    const { documentChunkIds, productChunkIds } =
      this.splitChunkIds(resultsForResponse);

    await this.messageModel.create({
      conversationId,
      userId,
      role: 'assistant',
      content: response,
      sourceChunkIds: documentChunkIds,
      metadata: {
        retrievalScores: resultsForResponse.map((r) => r.score),
        ...(productChunkIds.length > 0 && {
          sourceProductChunkIds: productChunkIds,
        }),
      },
    });

    // Update conversation
    await this.conversationModel.updateOne(
      { _id: conversationId },
      {
        $inc: { messageCount: 2 },
        lastMessageAt: new Date(),
      },
    );

    return successResponse(
      {
        response,
        sources: resultsForResponse.map((r) => ({
          content: r.chunk.content,
          score: r.score,
          documentId: 'documentId' in r.chunk ? r.chunk.documentId : undefined,
          productId: 'productId' in r.chunk ? r.chunk.productId : undefined,
        })),
      },
      'Response generated',
    );
  }

  @HandleError('Error streaming chat', 'conversationId')
  async *streamChat(
    conversationId: string,
    message: string,
    userId: string,
  ): AsyncGenerator<string> {
    const conversation = await this.conversationModel.findOne({
      _id: new Types.ObjectId(conversationId),
      userId: new Types.ObjectId(userId),
    });

    if (!conversation) {
      throw new AppError(404, 'Conversation not found');
    }

    // Save user message
    await this.messageModel.create({
      conversationId,
      userId,
      role: 'user',
      content: message,
    });

    const searchResults = await this.retrieveContext(message, userId);
    const { context, resultsForResponse } =
      this.buildContextForPrompt(searchResults);
    const prompt = this.assemblePromptForStream(message, context);

    let fullResponse = '';

    for await (const chunk of this.ollama.streamResponse(prompt)) {
      fullResponse += chunk;
      yield chunk;
    }

    this.logger.log('Full response:', fullResponse);

    const { documentChunkIds, productChunkIds } =
      this.splitChunkIds(resultsForResponse);

    await this.messageModel.create({
      conversationId,
      userId,
      role: 'assistant',
      content: fullResponse,
      sourceChunkIds: documentChunkIds,
      metadata: {
        ...(productChunkIds.length > 0 && {
          sourceProductChunkIds: productChunkIds,
        }),
      },
    });

    // Update conversation
    await this.conversationModel.updateOne(
      { _id: conversationId },
      {
        $inc: { messageCount: 2 },
        lastMessageAt: new Date(),
      },
    );
  }

  /** Keep only passages above relevance threshold so the model isn't confused by weak matches. */
  private buildContextForPrompt(
    searchResults: Array<{
      chunk: { content: string; _id: any; documentId?: any; productId?: any };
      score: number;
    }>,
  ): {
    context: string;
    resultsForResponse: typeof searchResults;
  } {
    const minScore = 0.28;
    const filtered =
      searchResults.length > 0 && searchResults[0].score >= minScore
        ? searchResults.filter((r) => r.score >= minScore)
        : searchResults;
    const context = filtered.map((r) => r.chunk.content).join('\n\n');
    return { context, resultsForResponse: filtered };
  }

  private async retrieveContext(
    message: string,
    userId: string,
  ): Promise<
    Array<{
      chunk: { content: string; _id: any; documentId?: any; productId?: any };
      score: number;
    }>
  > {
    const limitPerSource = 4;
    const totalLimit = 8;

    const [userResults, productResults] = await Promise.all([
      this.vectorSearch.searchSimilarChunks(message, userId, limitPerSource),
      this.vectorSearch.searchProductChunks(message, limitPerSource),
    ]);

    const combined = [
      ...userResults.map((r) => ({ chunk: r.chunk, score: r.score })),
      ...productResults.map((r) => ({ chunk: r.chunk, score: r.score })),
    ].sort((a, b) => b.score - a.score);

    return combined.slice(0, totalLimit);
  }

  private splitChunkIds(
    results: Array<{
      chunk: { _id: any; documentId?: any; productId?: any };
      score: number;
    }>,
  ): { documentChunkIds: Types.ObjectId[]; productChunkIds: Types.ObjectId[] } {
    const documentChunkIds: Types.ObjectId[] = [];
    const productChunkIds: Types.ObjectId[] = [];
    for (const r of results) {
      if ('documentId' in r.chunk && r.chunk.documentId != null) {
        documentChunkIds.push(r.chunk._id);
      } else if ('productId' in r.chunk && r.chunk.productId != null) {
        productChunkIds.push(r.chunk._id);
      }
    }
    return { documentChunkIds, productChunkIds };
  }

  /** Default system prompt for RAG: clear rules and format so the model answers from context only. */
  private static readonly RAG_SYSTEM_PROMPT = `You are a RAG assistant. You answer only from the context provided. Do not use outside knowledge or guess.

Rules:
1. Use ONLY information from the context in the user message. If the answer is in the context, give a clear, concise answer and mention the relevant details (e.g. price, description, category).
2. Product catalog entries in the context look like: name: [Product Name] | description: ... | price: ... | sku: ... | category: ...
   When the user asks about a product (e.g. "Smart Alarm Clock", "Sleep Tracker"), find the passage that starts with "name: [that product name]" and answer from it. Include description, price, category when present. Do not say you couldn't find it if that passage exists.
3. Document passages are excerpts from uploaded docs. When they relate to the question, summarize or quote the relevant part. Do not invent details.
4. Only say "I couldn't find relevant information" or "There is nothing in the context about that" when no passage in the context relates to the question. If any passage clearly matches, you must answer from it.
5. Keep answers focused. No long intros or disclaimers unless the context is empty.`;

  /** Chat API: system + user messages for better instruction following. */
  private assembleChatMessages(
    userMessage: string,
    context: string,
  ): Array<{ role: 'system' | 'user'; content: string }> {
    const userContent = context.trim()
      ? `Context:\n\n${context}\n\n---\nQuestion: ${userMessage}\n\nAnswer from the context above:`
      : `Context: [None]\n\nQuestion: ${userMessage}\n\nReply that you couldn't find relevant information in the provided documents or product catalog.`;

    return [
      { role: 'system', content: RagChatService.RAG_SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ];
  }

  /** Single prompt for streaming (generate API). Uses same rules as system prompt inline. */
  private assemblePromptForStream(userMessage: string, context: string): string {
    const contextBlock = context.trim()
      ? `Context:\n\n${context}`
      : 'Context: [None]';
    return `${RagChatService.RAG_SYSTEM_PROMPT}

${contextBlock}

---
Question: ${userMessage}

Answer from the context above (or say you found nothing relevant if the context is empty or unrelated):`;
  }

  async createConversation(
    userId: string,
    title: string,
  ): Promise<TResponse<ConversationDocument>> {
    const conversation = await this.conversationModel.create({
      userId: new Types.ObjectId(userId),
      title,
      messageCount: 0,
    });
    return successResponse(conversation, 'Conversation created');
  }

  async getConversations(
    userId: string,
    pagination: PaginationDto,
  ): Promise<TPaginatedResponse<ConversationDocument>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.conversationModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.conversationModel.countDocuments({
        userId: new Types.ObjectId(userId),
      }),
    ]);

    return successPaginatedResponse(
      data,
      { page, limit, total },
      'Conversations retrieved',
    );
  }

  async getMessages(
    conversationId: string,
    userId: string,
  ): Promise<TResponse<RagMessageDocument[]>> {
    const conversation = await this.conversationModel.findOne({
      _id: new Types.ObjectId(conversationId),
      userId: new Types.ObjectId(userId),
    });

    if (!conversation) {
      throw new AppError(404, 'Conversation not found');
    }

    const messages = await this.messageModel
      .find({ conversationId })
      .sort({ createdAt: 1 })
      .populate('sourceChunkIds')
      .exec();

    return successResponse(messages, 'Messages retrieved');
  }
}
