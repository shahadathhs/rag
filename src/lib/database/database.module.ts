import { ENVEnum } from '@/common/enum/env.enum';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import {
  FileInstance,
  FileInstanceSchema,
} from './schemas/file-instance.schema';
import {
  RefreshToken,
  RefreshTokenSchema,
} from './schemas/refresh-token.schema';
import { User, UserSchema } from './schemas/user.schema';

import { UserRepository } from './repository/user.repository';

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
      { name: FileInstance.name, schema: FileInstanceSchema },
    ]),
  ],
  providers: [UserRepository],
  exports: [MongooseModule, UserRepository],
})
export class DatabaseModule {}
