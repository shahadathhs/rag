import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
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
  ApiBody,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '@/core/jwt/jwt.guard';
import { GetUser } from '@/core/jwt/jwt.decorator';
import { DocumentProcessorService } from '../services/document-processor.service';
import { UploadDocumentDto } from '../dto/documents.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';

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
  @ApiBody({ type: UploadDocumentDto })
  @Post()
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @GetUser('sub') userId: string,
  ) {
    return this.documentProcessor.processDocument(file, userId);
  }

  @ApiOperation({ summary: 'Get my uploaded documents' })
  @Get()
  async getMyDocuments(
    @GetUser('sub') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.documentProcessor.getMyDocuments(userId, pagination);
  }

  @ApiOperation({ summary: 'Delete document' })
  @Delete(':id')
  async deleteDocument(
    @Param('id') documentId: string,
    @GetUser('sub') userId: string,
  ) {
    return this.documentProcessor.deleteDocument(documentId, userId);
  }
}
