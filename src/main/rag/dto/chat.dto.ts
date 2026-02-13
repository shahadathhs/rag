import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ example: 'My Research Chat' })
  @IsNotEmpty()
  @IsString()
  title: string;
}

export class SendMessageDto {
  @ApiProperty({ example: 'What is the main topic of the document?' })
  @IsNotEmpty()
  @IsString()
  message: string;
}
