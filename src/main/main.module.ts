import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { RagModule } from './rag/rag.module';

@Module({
  imports: [AuthModule, RagModule, AdminModule],
})
export class MainModule {}
