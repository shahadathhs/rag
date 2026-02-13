import { Module } from '@nestjs/common';
import { QueueModule } from '@/lib/queue/queue.module';
import { RagModule } from '@/main/rag/rag.module';
import { AdminProductsController } from './admin-products.controller';
import { AdminProductService } from './services/admin-product.service';

@Module({
  imports: [QueueModule, RagModule],
  controllers: [AdminProductsController],
  providers: [AdminProductService],
})
export class AdminModule {}
