import { PaginationDto } from '@/common/dto/pagination.dto';
import { ValidateSuperAdmin } from '@/core/jwt/jwt.decorator';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BulkUploadProductsDto, CreateProductDto } from './dto/product.dto';
import { AdminProductService } from './services/admin-product.service';

@ApiTags('Admin - Products')
@ApiBearerAuth()
@ValidateSuperAdmin()
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly adminProductService: AdminProductService) {}

  @ApiOperation({ summary: 'Create a single product (superadmin only)' })
  @Post()
  async uploadSingle(@Body() dto: CreateProductDto) {
    return this.adminProductService.uploadProductSingle(dto);
  }

  @ApiOperation({
    summary: 'Bulk replace catalog (superadmin only)',
    description:
      'Replaces the entire product catalog with the payload. All existing products and chunks are removed first.',
  })
  @Post('bulk')
  @HttpCode(HttpStatus.ACCEPTED)
  async uploadBulk(@Body() dto: BulkUploadProductsDto) {
    return this.adminProductService.uploadProductBulk(dto.products);
  }

  @ApiOperation({
    summary: 'Bulk add products (superadmin only)',
    description:
      'Adds the given products to the existing catalog. Existing products and chunks are kept.',
  })
  @Post('bulk/add')
  @HttpCode(HttpStatus.ACCEPTED)
  async uploadBulkAdd(@Body() dto: BulkUploadProductsDto) {
    return this.adminProductService.uploadProductBulkAdd(dto.products);
  }

  @ApiOperation({ summary: 'List products (global catalog, superadmin only)' })
  @Get()
  async getProducts(@Query() pagination: PaginationDto) {
    return this.adminProductService.getProducts(pagination);
  }
}
