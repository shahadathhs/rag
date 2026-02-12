import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DocumentChunk,
  DocumentChunkDocument,
} from '@/lib/database/schemas/document-chunk.schema';
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

  async searchSimilarChunks(
    query: string,
    userId: string,
    limit = 5,
  ): Promise<SearchResult[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding =
        await this.embeddingService.generateEmbedding(query);

      // Get all chunks for the user
      const chunks = await this.chunkModel
        .find({ userId })
        .populate('documentId')
        .lean();

      // Calculate cosine similarity for each chunk
      const results: SearchResult[] = chunks.map((chunk) => ({
        chunk: chunk as DocumentChunkDocument,
        score: this.cosineSimilarity(queryEmbedding, chunk.embedding),
      }));

      // Sort by score and return top results
      return results.sort((a, b) => b.score - a.score).slice(0, limit);
    } catch (error) {
      this.logger.error('Failed to search similar chunks', error);
      throw error;
    }
  }

  async searchInDocuments(
    query: string,
    documentIds: string[],
    limit = 5,
  ): Promise<SearchResult[]> {
    try {
      const queryEmbedding =
        await this.embeddingService.generateEmbedding(query);

      const chunks = await this.chunkModel
        .find({ documentId: { $in: documentIds } })
        .populate('documentId')
        .lean();

      const results: SearchResult[] = chunks.map((chunk) => ({
        chunk: chunk as DocumentChunkDocument,
        score: this.cosineSimilarity(queryEmbedding, chunk.embedding),
      }));

      return results.sort((a, b) => b.score - a.score).slice(0, limit);
    } catch (error) {
      this.logger.error('Failed to search in documents', error);
      throw error;
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
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
