import {
  Controller,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '@/core/jwt/jwt.guard';
import { GetUser } from '@/core/jwt/jwt.decorator';
import { successResponse } from '@/common/utils/response.util';
import { DocumentProcessorService } from '../services/document-processor.service';

const multerOptions = {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + uniqueSuffix);
    },
  }),
};

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentProcessor: DocumentProcessorService) {}

  @ApiOperation({ summary: 'Upload and process document' })
  @ApiConsumes('multipart/form-data')
  @Post()
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @GetUser('sub') userId: string,
  ) {
    const document = await this.documentProcessor.processDocument(file, userId);
    return successResponse(
      document,
      'Document uploaded and processing started',
    );
  }

  @ApiOperation({ summary: 'Delete document' })
  @Delete(':id')
  async deleteDocument(
    @Param('id') documentId: string,
    @GetUser('sub') userId: string,
  ) {
    await this.documentProcessor.deleteDocument(documentId, userId);
    return successResponse(null, 'Document deleted successfully');
  }
}
