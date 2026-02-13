import { QueueJobName, QueueName } from '@/lib/queue/types/queue-name.enum';
import { ProductIndexingService } from '@/main/rag/services/product-indexing.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ProductIndexJobPayload } from '../types/payload.interface';

@Processor(QueueName.PRODUCT_INDEX, { concurrency: 1 })
export class ProductIndexWorker extends WorkerHost {
  private readonly logger = new Logger(ProductIndexWorker.name);

  constructor(private readonly productIndexingService: ProductIndexingService) {
    super();
  }

  async process(job: Job<ProductIndexJobPayload>): Promise<void> {
    if (job.name !== QueueJobName.PRODUCT_INDEX) return;

    const { data, replace } = job.data;

    this.logger.log(
      `Processing product index job (${data.length} items, ${replace ? 'replace' : 'add'})`,
    );

    try {
      if (replace) {
        await this.productIndexingService.index(data);
      } else {
        await this.productIndexingService.addMany(data);
      }
    } catch (err) {
      this.logger.error(
        `Failed to index products: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw err;
    }
  }
}
