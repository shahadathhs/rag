import { ENVEnum } from '@/common/enum/env.enum';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UserRepository } from './repository/user.repository';
import {
  Conversation,
  ConversationSchema,
} from './schemas/conversation.schema';
import { Document, DocumentSchema } from './schemas/document.schema';
import {
  DocumentChunk,
  DocumentChunkSchema,
} from './schemas/document-chunk.schema';
import { Product, ProductSchema } from './schemas/product.schema';
import {
  ProductChunk,
  ProductChunkSchema,
} from './schemas/product-chunk.schema';
import { RagMessage, RagMessageSchema } from './schemas/rag-message.schema';
import {
  RefreshToken,
  RefreshTokenSchema,
} from './schemas/refresh-token.schema';
import { User, UserSchema } from './schemas/user.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>(ENVEnum.MONGODB_URI),
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: Document.name, schema: DocumentSchema },
      { name: DocumentChunk.name, schema: DocumentChunkSchema },
      { name: Product.name, schema: ProductSchema },
      { name: ProductChunk.name, schema: ProductChunkSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: RagMessage.name, schema: RagMessageSchema },
    ]),
  ],
  providers: [UserRepository],
  exports: [MongooseModule, UserRepository],
})
export class DatabaseModule {}
