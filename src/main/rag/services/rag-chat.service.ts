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
import {
  successResponse,
  successPaginatedResponse,
} from '@/common/utils/response.util';
import type {
  TResponse,
  TPaginatedResponse,
} from '@/common/utils/response.util';
import type { PaginationDto } from '@/common/dto/pagination.dto';

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
    const context = searchResults.map((r) => r.chunk.content).join('\n\n');
    const prompt = this.assemblePrompt(message, context);

    const response = await this.ollama.generateResponse(prompt);

    const { documentChunkIds, productChunkIds } =
      this.splitChunkIds(searchResults);

    await this.messageModel.create({
      conversationId,
      userId,
      role: 'assistant',
      content: response,
      sourceChunkIds: documentChunkIds,
      metadata: {
        retrievalScores: searchResults.map((r) => r.score),
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
        sources: searchResults.map((r) => ({
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
    const context = searchResults.map((r) => r.chunk.content).join('\n\n');
    const prompt = this.assemblePrompt(message, context);

    let fullResponse = '';

    for await (const chunk of this.ollama.streamResponse(prompt)) {
      fullResponse += chunk;
      yield chunk;
    }

    const { documentChunkIds, productChunkIds } =
      this.splitChunkIds(searchResults);

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

  private assemblePrompt(userMessage: string, context: string): string {
    const contextBlock = context.trim()
      ? `The following passages were retrieved as relevant (documents and product catalog):\n\n${context}`
      : "No relevant passages were found in the user's documents or product catalog.";
    return `You are a helpful assistant. Use ONLY the context below to answer the user's question.

IMPORTANT: If any passage in the context clearly relates to or answers the question, you MUST answer from that passage. Only say "I couldn't find relevant information" when no passage in the context relates to the question at all.

${contextBlock}

User question: ${userMessage}

Answer using the context above when it is relevant. If nothing in the context relates to the question, say so briefly.`;
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
