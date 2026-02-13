import { Global, Module } from '@nestjs/common';
import { SuperAdminService } from './services/super-admin.service';

@Global()
@Module({
  imports: [],
  providers: [SuperAdminService],
})
export class SeedModule {}
