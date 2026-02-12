import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Types } from 'mongoose';

export type RagMessageDocument = RagMessage & MongooseDocument;

@Schema({ timestamps: true })
export class RagMessage {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Conversation' })
  conversationId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ['user', 'assistant'] })
  role: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'DocumentChunk' }], default: [] })
  sourceChunkIds?: Types.ObjectId[];

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const RagMessageSchema = SchemaFactory.createForClass(RagMessage);

RagMessageSchema.index({ conversationId: 1, createdAt: 1 });
RagMessageSchema.index({ userId: 1 });
