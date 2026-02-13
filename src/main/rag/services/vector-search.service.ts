import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import {
  DocumentChunk,
  DocumentChunkDocument,
} from '@/lib/database/schemas/document-chunk.schema';
import {
  ProductChunk,
  ProductChunkDocument,
} from '@/lib/database/schemas/product-chunk.schema';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmbeddingService } from './embedding.service';

export interface SearchResult {
  chunk: DocumentChunkDocument;
  score: number;
}

export interface ProductSearchResult {
  chunk: ProductChunkDocument;
  score: number;
}

@Injectable()
export class VectorSearchService {
  private readonly logger = new Logger(VectorSearchService.name);

  constructor(
    @InjectModel(DocumentChunk.name)
    private readonly chunkModel: Model<DocumentChunkDocument>,
    @InjectModel(ProductChunk.name)
    private readonly productChunkModel: Model<ProductChunkDocument>,
    private readonly embeddingService: EmbeddingService,
  ) {}

  @HandleError('Error searching similar chunks', 'userId')
  async searchSimilarChunks(
    query: string,
    userId: string,
    limit = 5,
  ): Promise<SearchResult[]> {
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);

    this.logger.debug(
      'Query embedding generated',
      JSON.stringify(queryEmbedding),
    );

    const chunks = await this.chunkModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('documentId')
      .lean();

    this.logger.debug('Chunks found', JSON.stringify(chunks));

    const results: SearchResult[] = chunks.map((chunk) => ({
      chunk: chunk as DocumentChunkDocument,
      score: this.cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    this.logger.debug('Results found', JSON.stringify(results));

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  @HandleError('Error searching product chunks', 'query')
  async searchProductChunks(
    query: string,
    limit = 5,
  ): Promise<ProductSearchResult[]> {
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);

    const chunks = await this.productChunkModel.find().lean();

    if (chunks.length === 0) return [];

    const results: ProductSearchResult[] = chunks.map((chunk) => ({
      chunk: chunk as ProductChunkDocument,
      score: this.cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  @HandleError('Error searching in documents', 'documentIds')
  async searchInDocuments(
    query: string,
    documentIds: string[],
    limit = 5,
  ): Promise<SearchResult[]> {
    if (documentIds.length === 0) {
      return [];
    }

    const queryEmbedding = await this.embeddingService.generateEmbedding(query);

    this.logger.debug('Query embedding generated');

    const objectIds = documentIds.map((id) => new Types.ObjectId(id));
    const chunks = await this.chunkModel
      .find({ documentId: { $in: objectIds } })
      .populate('documentId')
      .lean();

    this.logger.debug('Chunks found');

    if (chunks.length === 0) {
      this.logger.warn(
        `No chunks found for documentIds: ${documentIds.join(', ')}`,
      );
      return [];
    }

    const results: SearchResult[] = chunks.map((chunk) => ({
      chunk: chunk as DocumentChunkDocument,
      score: this.cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    this.logger.debug('Results found');

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new AppError(400, 'Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
