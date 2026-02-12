import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { pipeline, env } from '@xenova/transformers';

// Disable local model downloads, use cached models
env.allowLocalModels = false;
env.useBrowserCache = false;

@Injectable()
export class EmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingService.name);
  private extractor: any;
  private readonly modelName = 'Xenova/all-MiniLM-L6-v2';
  private readonly dimensions = 384;

  async onModuleInit() {
    this.logger.log('Initializing embedding model...');
    try {
      this.extractor = await pipeline('feature-extraction', this.modelName);
      this.logger.log(
        `Embedding model loaded: ${this.modelName} (${this.dimensions}d)`,
      );
    } catch (error) {
      this.logger.error('Failed to load embedding model', error);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.extractor) {
      throw new Error('Embedding model not initialized');
    }

    try {
      const output = await this.extractor(text, {
        pooling: 'mean',
        normalize: true,
      });

      return Array.from(output.data);
    } catch (error) {
      this.logger.error('Failed to generate embedding', error);
      throw error;
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  getDimensions(): number {
    return this.dimensions;
  }
}
