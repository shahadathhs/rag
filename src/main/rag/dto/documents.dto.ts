import { ApiProperty } from '@nestjs/swagger';

export class UploadDocumentDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Document file (PDF, TXT, DOCX, MD)' })
  file: any;
}
