import { Global, Module } from '@nestjs/common';
import { AuthUtilsService } from './services/auth-utils.service';

@Global()
@Module({
  providers: [AuthUtilsService],
  exports: [AuthUtilsService],
})
export class UtilsModule {}
