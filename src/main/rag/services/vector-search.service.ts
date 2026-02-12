import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import {
  DocumentChunk,
  DocumentChunkDocument,
} from '@/lib/database/schemas/document-chunk.schema';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmbeddingService } from './embedding.service';

interface SearchResult {
  chunk: DocumentChunkDocument;
  score: number;
}

@Injectable()
export class VectorSearchService {
  private readonly logger = new Logger(VectorSearchService.name);

  constructor(
    @InjectModel(DocumentChunk.name)
    private readonly chunkModel: Model<DocumentChunkDocument>,
    private readonly embeddingService: EmbeddingService,
  ) {}

  @HandleError('Error searching similar chunks', 'userId')
  async searchSimilarChunks(
    query: string,
    userId: string,
    limit = 5,
  ): Promise<SearchResult[]> {
      // Generate embedding for the query
      const queryEmbedding =
        await this.embeddingService.generateEmbedding(query);

      this.logger.log('Query embedding generated', JSON.stringify(queryEmbedding));

      // Get all chunks for the user
      const chunks = await this.chunkModel
        .find({ userId })
        .populate('documentId')
        .lean();

      this.logger.log('Chunks found', JSON.stringify(chunks));

      // Calculate cosine similarity for each chunk
      const results: SearchResult[] = chunks.map((chunk) => ({
        chunk: chunk as DocumentChunkDocument,
        score: this.cosineSimilarity(queryEmbedding, chunk.embedding),
      }));

      this.logger.log('Results found', JSON.stringify(results));

      // Sort by score and return top results
      return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  @HandleError('Error searching in documents', 'documentIds')
  async searchInDocuments(
    query: string,
    documentIds: string[],
    limit = 5,
  ): Promise<SearchResult[]> {
      const queryEmbedding =
        await this.embeddingService.generateEmbedding(query);

      this.logger.log('Query embedding generated', JSON.stringify(queryEmbedding));

      const chunks = await this.chunkModel
        .find({ documentId: { $in: documentIds } })
        .populate('documentId')
        .lean();

      this.logger.log('Chunks found', JSON.stringify(chunks));

      const results: SearchResult[] = chunks.map((chunk) => ({
        chunk: chunk as DocumentChunkDocument,
        score: this.cosineSimilarity(queryEmbedding, chunk.embedding),
      }));

      this.logger.log('Results found', JSON.stringify(results));

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
