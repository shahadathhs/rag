import { QueueJobName, QueueName } from '@/lib/queue/types/queue-name.enum';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ProductIndexJobPayload } from '../types/payload.interface';

@Injectable()
export class ProductIndexQueueService {
  private readonly logger = new Logger(ProductIndexQueueService.name);

  constructor(
    @InjectQueue(QueueName.PRODUCT_INDEX)
    private readonly queue: Queue,
  ) {}

  async enqueue(payload: ProductIndexJobPayload): Promise<string> {
    const job = await this.queue.add(QueueJobName.PRODUCT_INDEX, payload, {
      removeOnComplete: true,
      removeOnFail: { count: 5 },
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
    this.logger.log(
      `Enqueued product index job ${job.id} (${payload.data.length} items)`,
    );
    return job.id ?? '';
  }
}
