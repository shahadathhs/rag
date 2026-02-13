import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument } from 'mongoose';

export type ProductDocument = Product & MongooseDocument;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  price?: number;

  @Prop()
  sku?: string;

  @Prop()
  category?: string;

  @Prop()
  imageUrl?: string;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ name: 1 });
ProductSchema.index({ sku: 1 }, { sparse: true });
ProductSchema.index({ category: 1 }, { sparse: true });
