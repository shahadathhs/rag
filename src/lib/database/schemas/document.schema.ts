import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Types } from 'mongoose';

export type DocumentDocument = Document & MongooseDocument;

@Schema({ timestamps: true })
export class Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true, enum: ['pdf', 'txt', 'docx', 'md'] })
  fileType: string;

  @Prop({ required: true })
  fileSize: number;

  @Prop({ required: true })
  filePath: string;

  @Prop({ required: true, default: 0 })
  totalChunks: number;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({
    default: 'processing',
    enum: ['processing', 'completed', 'failed'],
  })
  status: string;

  @Prop()
  errorMessage?: string;
}

export const DocumentSchema = SchemaFactory.createForClass(Document);
