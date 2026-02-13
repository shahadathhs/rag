import { QueueName } from '@/lib/queue/types/queue-name.enum';
import { RagModule } from '@/main/rag/rag.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ProductIndexQueueService } from './services/product-index-queue.service';
import { ProductIndexWorker } from './worker/product-index.worker';

@Module({
  imports: [
    BullModule.registerQueue({ name: QueueName.PRODUCT_INDEX }),
    RagModule,
  ],
  providers: [ProductIndexWorker, ProductIndexQueueService],
  exports: [ProductIndexQueueService],
})
export class QueueModule {}
