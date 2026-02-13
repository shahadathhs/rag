import { Module } from '@nestjs/common';
import { ChatController } from './controllers/chat.controller';
import { DocumentsController } from './controllers/documents.controller';
import { DocumentProcessorService } from './services/document-processor.service';
import { EmbeddingService } from './services/embedding.service';
import { OllamaService } from './services/ollama.service';
import { ProductIndexingService } from './services/product-indexing.service';
import { RagChatService } from './services/rag-chat.service';
import { VectorSearchService } from './services/vector-search.service';

@Module({
  imports: [],
  controllers: [DocumentsController, ChatController],
  providers: [
    EmbeddingService,
    OllamaService,
    VectorSearchService,
    DocumentProcessorService,
    RagChatService,
    ProductIndexingService,
  ],
  exports: [
    EmbeddingService,
    OllamaService,
    VectorSearchService,
    DocumentProcessorService,
    RagChatService,
    ProductIndexingService,
  ],
})
export class RagModule {}
