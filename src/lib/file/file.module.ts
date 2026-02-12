import { Global, Module } from '@nestjs/common';
import { FileService } from './services/file.service';
import { MulterService } from './services/multer.service';

@Global()
@Module({
  providers: [FileService, MulterService],
  exports: [FileService, MulterService],
})
export class FileModule {}
