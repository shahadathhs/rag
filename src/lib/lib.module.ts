import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { UtilsModule } from './utils/utils.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [DatabaseModule, UtilsModule, SeedModule],
  exports: [],
  providers: [],
})
export class LibModule {}
