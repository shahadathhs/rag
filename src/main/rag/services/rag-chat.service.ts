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

    const searchResults = await this.retrieveContext(
      conversation,
      message,
      userId,
    );
    const context = searchResults.map((r) => r.chunk.content).join('\n\n');
    const prompt = this.assemblePrompt(message, context);

    const response = await this.ollama.generateResponse(prompt);

    // Save assistant message
    await this.messageModel.create({
      conversationId,
      userId,
      role: 'assistant',
      content: response,
      sourceChunkIds: searchResults.map((r) => r.chunk._id),
      metadata: {
        retrievalScores: searchResults.map((r) => r.score),
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
          documentId: r.chunk.documentId,
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

    const searchResults = await this.retrieveContext(
      conversation,
      message,
      userId,
    );
    const context = searchResults.map((r) => r.chunk.content).join('\n\n');
    const prompt = this.assemblePrompt(message, context);

    let fullResponse = '';

    // Stream response
    for await (const chunk of this.ollama.streamResponse(prompt)) {
      fullResponse += chunk;
      yield chunk;
    }

    // Save assistant message
    await this.messageModel.create({
      conversationId,
      userId,
      role: 'assistant',
      content: fullResponse,
      sourceChunkIds: searchResults.map((r) => r.chunk._id),
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
    conversation: ConversationDocument,
    message: string,
    userId: string,
  ): Promise<Array<{ chunk: any; score: number }>> {
    const limit = 8;
    let searchResults =
      conversation.documentIds.length > 0
        ? await this.vectorSearch.searchInDocuments(
            message,
            conversation.documentIds.map((id) => id.toString()),
            limit,
          )
        : await this.vectorSearch.searchSimilarChunks(message, userId, limit);

    if (searchResults.length === 0 && conversation.documentIds.length > 0) {
      searchResults = await this.vectorSearch.searchSimilarChunks(
        message,
        userId,
        limit,
      );
    }
    return searchResults;
  }

  private assemblePrompt(userMessage: string, context: string): string {
    const contextBlock = context.trim()
      ? `Context from the user's documents:\n${context}`
      : "No relevant passages were found in the user's uploaded documents.";
    return `You are a helpful assistant. Answer based only on the following. If there is no relevant context, say clearly that you could not find relevant information in the provided documents and suggest the user upload or check their documents.

${contextBlock}

User question: ${userMessage}

Answer (based on the context above, or say you found nothing relevant):`;
  }

  async createConversation(
    userId: string,
    title: string,
    documentIds: string[] = [],
  ): Promise<TResponse<ConversationDocument>> {
    const conversation = await this.conversationModel.create({
      userId: new Types.ObjectId(userId),
      title,
      documentIds: documentIds.map((id) => new Types.ObjectId(id)),
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
