import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Types } from 'mongoose';

export type DocumentChunkDocument = DocumentChunk & MongooseDocument;

@Schema({ timestamps: true })
export class DocumentChunk {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Document' })
  documentId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true, type: [Number] })
  embedding: number[]; // 384 dimensions for all-MiniLM-L6-v2

  @Prop({ required: true })
  chunkIndex: number;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: 0 })
  tokenCount: number;
}

export const DocumentChunkSchema = SchemaFactory.createForClass(DocumentChunk);

// Create index for vector search
DocumentChunkSchema.index({ embedding: 1 });
DocumentChunkSchema.index({ documentId: 1, chunkIndex: 1 });
DocumentChunkSchema.index({ userId: 1 });
