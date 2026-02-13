import type { PaginationDto } from '@/common/dto/pagination.dto';
import type {
  TPaginatedResponse,
  TResponse,
} from '@/common/utils/response.util';
import {
  successPaginatedResponse,
  successResponse,
} from '@/common/utils/response.util';
import {
  Product,
  ProductDocument,
} from '@/lib/database/schemas/product.schema';
import { ProductIndexQueueService } from '@/lib/queue/services/product-index-queue.service';
import { ProductIndexingService } from '@/main/rag/services/product-indexing.service';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { CreateProductDto } from '../dto/product.dto';

@Injectable()
export class AdminProductService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly productIndexQueue: ProductIndexQueueService,
    private readonly productIndexingService: ProductIndexingService,
  ) {}

  async uploadProductSingle(
    dto: CreateProductDto,
  ): Promise<TResponse<ProductDocument>> {
    const product = await this.productIndexingService.addOne({
      name: dto.name,
      description: dto.description,
      price: dto.price,
      sku: dto.sku,
      category: dto.category,
      imageUrl: dto.imageUrl,
      metadata: dto.metadata,
    });
    return successResponse(product, 'Product created');
  }

  async uploadProductBulk(
    dtos: CreateProductDto[],
  ): Promise<TResponse<{ message: string }>> {
    const data = dtos.map((d) => ({
      name: d.name,
      ...(d.description != null && { description: d.description }),
      ...(d.price != null && { price: Number(d.price) }),
      ...(d.sku != null && { sku: d.sku }),
      ...(d.category != null && { category: d.category }),
      ...(d.imageUrl != null && { imageUrl: d.imageUrl }),
      ...(d.metadata != null && { metadata: d.metadata }),
    }));
    await this.productIndexQueue.enqueue({ data });
    return successResponse(
      { message: 'Bulk upload accepted; indexing in progress' },
      'Bulk upload accepted; indexing in progress',
    );
  }

  async getProducts(
    pagination: PaginationDto,
  ): Promise<TPaginatedResponse<ProductDocument>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.productModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(),
    ]);

    return successPaginatedResponse(
      data,
      { page, limit, total },
      'Products retrieved',
    );
  }
}
