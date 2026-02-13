import {
  ProductChunk,
  ProductChunkDocument,
} from '@/lib/database/schemas/product-chunk.schema';
import {
  Product,
  ProductDocument,
} from '@/lib/database/schemas/product.schema';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmbeddingService } from './embedding.service';

const MAX_CHUNK_LENGTH = 500;

/** Plain product-like object for bulk index (from JSON/API) */
export interface ProductInput {
  name: string;
  description?: string;
  price?: number;
  sku?: string;
  category?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ProductIndexingService {
  private readonly logger = new Logger(ProductIndexingService.name);

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(ProductChunk.name)
    private readonly productChunkModel: Model<ProductChunkDocument>,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /** Add a single product and its chunk (sync, for single upload). */
  async addOne(input: ProductInput): Promise<ProductDocument> {
    const product = await this.productModel.create({
      name: input.name,
      description: input.description,
      price: input.price,
      sku: input.sku,
      category: input.category,
      imageUrl: input.imageUrl,
      metadata: input.metadata,
    });

    const content = this.productToChunkText(product);
    const truncated =
      content.length > MAX_CHUNK_LENGTH
        ? content.slice(0, MAX_CHUNK_LENGTH)
        : content;

    const embedding = await this.embeddingService.generateEmbedding(truncated);

    await this.productChunkModel.create({
      productId: product._id,
      content: truncated,
      embedding,
      chunkIndex: 0,
      tokenCount: truncated.length,
    });

    this.logger.log(`Added product: ${product.name} (${product._id})`);
    return product;
  }

  /** Replace entire catalog with new data (used by bulk job). */
  async index(data: Record<string, unknown>[]): Promise<void> {
    await this.productChunkModel.deleteMany({});
    await this.productModel.deleteMany({});

    if (data.length === 0) {
      this.logger.log('Product catalog cleared (0 products)');
      return;
    }

    const docs = data.map((item) => this.normalizeToProduct(item));
    const products = await this.productModel.insertMany(docs);

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const content = this.productToChunkText(product);
      const truncated =
        content.length > MAX_CHUNK_LENGTH
          ? content.slice(0, MAX_CHUNK_LENGTH)
          : content;

      const embedding =
        await this.embeddingService.generateEmbedding(truncated);

      await this.productChunkModel.create({
        productId: product._id,
        content: truncated,
        embedding,
        chunkIndex: i,
        tokenCount: truncated.length,
      });
    }

    this.logger.log(`Product catalog indexed: ${products.length} products`);
  }

  private normalizeToProduct(item: Record<string, unknown>): { name: string; description?: string; price?: number; sku?: string; category?: string; imageUrl?: string; metadata?: Record<string, unknown> } {
    const name =
      typeof item.name === 'string'
        ? item.name.trim()
        : typeof item.title === 'string'
          ? item.title.trim()
          : String(item.id ?? item.sku ?? 'Unnamed').trim();
    if (!name) {
      throw new Error('Product name is required (item must have name or title)');
    }
    const price =
      typeof item.price === 'number'
        ? item.price
        : typeof item.price === 'string'
          ? Number.parseFloat(item.price)
          : undefined;
    const description =
      typeof item.description === 'string' ? item.description : undefined;
    const sku = typeof item.sku === 'string' ? item.sku : undefined;
    const category =
      typeof item.category === 'string' ? item.category : undefined;
    const imageUrl =
      typeof item.imageUrl === 'string' ? item.imageUrl : undefined;
    const metadata =
      item.metadata && typeof item.metadata === 'object'
        ? (item.metadata as Record<string, unknown>)
        : undefined;

    const doc: { name: string; description?: string; price?: number; sku?: string; category?: string; imageUrl?: string; metadata?: Record<string, unknown> } = { name };
    if (description != null) doc.description = description;
    if (price != null && !Number.isNaN(price)) doc.price = price;
    if (sku != null) doc.sku = sku;
    if (category != null) doc.category = category;
    if (imageUrl != null) doc.imageUrl = imageUrl;
    if (metadata != null) doc.metadata = metadata;
    return doc;
  }

  private productToChunkText(product: {
    name?: string;
    description?: string;
    price?: number;
    sku?: string;
    category?: string;
    imageUrl?: string;
    metadata?: Record<string, unknown>;
  }): string {
    const parts: string[] = [`name: ${product.name ?? 'Unnamed'}`];
    if (product.description) parts.push(`description: ${product.description}`);
    if (product.price != null) parts.push(`price: ${product.price}`);
    if (product.sku) parts.push(`sku: ${product.sku}`);
    if (product.category) parts.push(`category: ${product.category}`);
    if (product.metadata && Object.keys(product.metadata).length > 0) {
      parts.push(`metadata: ${JSON.stringify(product.metadata)}`);
    }
    return parts.join(' | ');
  }
}
