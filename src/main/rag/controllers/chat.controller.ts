import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Sse,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '@/core/jwt/jwt.guard';
import { GetUser } from '@/core/jwt/jwt.decorator';
import { RagChatService } from '../services/rag-chat.service';
import { CreateConversationDto, SendMessageDto } from '../dto/rag.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';

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
    return this.ragChat.createConversation(userId, dto.title);
  }

  @ApiOperation({ summary: 'Get all conversations' })
  @Get('conversations')
  async getConversations(
    @GetUser('sub') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.ragChat.getConversations(userId, pagination);
  }

  @ApiOperation({ summary: 'Get conversation messages' })
  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') conversationId: string,
    @GetUser('sub') userId: string,
  ) {
    return this.ragChat.getMessages(conversationId, userId);
  }

  @ApiOperation({ summary: 'Send chat message' })
  @Post('conversations/:id')
  async chat(
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
    @GetUser('sub') userId: string,
  ) {
    return this.ragChat.chat(conversationId, dto.message, userId);
  }

  @ApiOperation({ summary: 'Stream chat response (SSE)' })
  @ApiQuery({ name: 'message', required: true, description: 'User message' })
  @Sse('conversations/:id/stream')
  streamChat(
    @Param('id') conversationId: string,
    @Query('message') message: string,
    @GetUser('sub') userId: string,
  ): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          for await (const chunk of this.ragChat.streamChat(
            conversationId,
            message,
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
