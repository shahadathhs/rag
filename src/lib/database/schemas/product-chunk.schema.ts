import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument, Types } from 'mongoose';

export type ProductChunkDocument = ProductChunk & MongooseDocument;

@Schema({ timestamps: true })
export class ProductChunk {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Product' })
  productId: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true, type: [Number] })
  embedding: number[];

  @Prop({ required: true })
  chunkIndex: number;

  @Prop({ default: 0 })
  tokenCount: number;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const ProductChunkSchema = SchemaFactory.createForClass(ProductChunk);

ProductChunkSchema.index({ embedding: 1 });
ProductChunkSchema.index({ productId: 1 });
