import { QueueEventsEnum } from '@/common/enum/queue-events.enum';
import { BaseGateway } from '@/core/socket/base.gateway';
import { User } from '@/lib/database/schemas/user.schema';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { WebSocketGateway } from '@nestjs/websockets';
import { Model } from 'mongoose';
import { Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:5173',
      'http://localhost:5174',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  },
  namespace: '/queue',
})
@Injectable()
export class QueueGateway extends BaseGateway {
  constructor(
    protected readonly configService: ConfigService,
    @InjectModel(User.name) protected readonly userModel: Model<User>,
    protected readonly jwtService: JwtService,
  ) {
    super(configService, userModel, jwtService, QueueGateway.name);
  }

  /** --- BASIC QUEUE FUNCTIONALITY --- */
  public getClients(userId: string): Set<Socket> {
    return this.clients.get(userId) || new Set();
  }

  public async emitToUser(userId: string, event: QueueEventsEnum, data: any) {
    const clients = this.getClients(userId);
    clients.forEach((client) => client.emit(event, data));
    this.logger.log(`Event ${event} sent to user ${userId}`);
  }

  public async emitToMultipleUsers(
    userIds: string[],
    event: QueueEventsEnum,
    data: any,
  ) {
    userIds.forEach((id) => this.emitToUser(id, event, data));
  }
}
