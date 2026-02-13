import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';
import { SeedModule } from './seed/seed.module';
import { UtilsModule } from './utils/utils.module';

@Module({
  imports: [DatabaseModule, UtilsModule, SeedModule, QueueModule],
  exports: [],
  providers: [],
})
export class LibModule {}
