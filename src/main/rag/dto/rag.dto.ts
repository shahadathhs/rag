import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadDocumentDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;
}

export class CreateConversationDto {
  @ApiProperty({ example: 'My Research Chat' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: [], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentIds?: string[];
}

export class ChatMessageDto {
  @ApiProperty({ example: 'What is the main topic of the document?' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsNotEmpty()
  @IsString()
  conversationId: string;
}
