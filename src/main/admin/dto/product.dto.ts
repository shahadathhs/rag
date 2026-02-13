import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'Wireless Headphones' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Noise-cancelling over-ear headphones' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 99.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 'WH-1000XM5' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: 'Electronics' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.png' })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Extra fields (e.g. stock, brand)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class BulkUploadProductsDto {
  @ApiProperty({ type: [CreateProductDto], description: 'Products to upload' })
  @IsArray()
  @ArrayMinSize(1, { message: 'products must contain at least one item' })
  @ValidateNested({ each: true })
  @Type(() => CreateProductDto)
  products: CreateProductDto[];
}
