import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ example: 'My Research Chat' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({
    example: [],
    description: 'Optional document IDs to scope the conversation',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentIds?: string[];
}

export class SendMessageDto {
  @ApiProperty({ example: 'What is the main topic of the document?' })
  @IsNotEmpty()
  @IsString()
  message: string;
}
