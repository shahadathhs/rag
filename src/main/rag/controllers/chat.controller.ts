import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Sse,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '@/core/jwt/jwt.guard';
import { GetUser } from '@/core/jwt/jwt.decorator';
import { successResponse } from '@/common/utils/response.util';
import { RagChatService } from '../services/rag-chat.service';
import { CreateConversationDto, ChatMessageDto } from '../dto/rag.dto';

interface MessageEvent {
  data: string;
}

@ApiTags('RAG Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly ragChat: RagChatService) {}

  @ApiOperation({ summary: 'Create new conversation' })
  @Post('conversations')
  async createConversation(
    @Body() dto: CreateConversationDto,
    @GetUser('sub') userId: string,
  ) {
    const conversation = await this.ragChat.createConversation(
      userId,
      dto.title,
      dto.documentIds,
    );
    return successResponse(conversation, 'Conversation created');
  }

  @ApiOperation({ summary: 'Get all conversations' })
  @Get('conversations')
  async getConversations(@GetUser('sub') userId: string) {
    const conversations = await this.ragChat.getConversations(userId);
    return successResponse(conversations, 'Conversations retrieved');
  }

  @ApiOperation({ summary: 'Get conversation messages' })
  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') conversationId: string,
    @GetUser('sub') userId: string,
  ) {
    const messages = await this.ragChat.getMessages(conversationId, userId);
    return successResponse(messages, 'Messages retrieved');
  }

  @ApiOperation({ summary: 'Send chat message' })
  @Post()
  async chat(@Body() dto: ChatMessageDto, @GetUser('sub') userId: string) {
    const result = await this.ragChat.chat(
      dto.conversationId,
      dto.message,
      userId,
    );
    return successResponse(result, 'Response generated');
  }

  @ApiOperation({ summary: 'Stream chat response (SSE)' })
  @Sse('stream')
  async streamChat(
    @Body() dto: ChatMessageDto,
    @GetUser('sub') userId: string,
  ): Promise<Observable<MessageEvent>> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          for await (const chunk of this.ragChat.streamChat(
            dto.conversationId,
            dto.message,
            userId,
          )) {
            subscriber.next({ data: chunk });
          }
          subscriber.complete();
        } catch (error) {
          subscriber.error(error);
        }
      })();
    });
  }
}
