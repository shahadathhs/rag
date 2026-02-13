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

  @ApiOperation({ summary: 'Bulk upload products (superadmin only)' })
  @Post('bulk')
  @HttpCode(HttpStatus.ACCEPTED)
  async uploadBulk(@Body() dto: BulkUploadProductsDto) {
    return this.adminProductService.uploadProductBulk(dto.products);
  }

  @ApiOperation({ summary: 'List products (global catalog, superadmin only)' })
  @Get()
  async getProducts(@Query() pagination: PaginationDto) {
    return this.adminProductService.getProducts(pagination);
  }
}
