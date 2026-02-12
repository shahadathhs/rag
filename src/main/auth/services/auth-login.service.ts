import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { User, UserDocument } from '@/lib/database/schemas/user.schema';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class AuthLoginService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly utils: AuthUtilsService,
  ) {}

  @HandleError('Login failed', 'User')
  async login(dto: LoginDto): Promise<TResponse<any>> {
    const { email, password } = dto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const isPasswordCorrect = await this.utils.compare(password, user.password);
    if (!isPasswordCorrect) {
      throw new AppError(400, 'Invalid password');
    }

    // Update last login and active timestamps
    const updatedUser = await this.userModel.findOneAndUpdate(
      { email },
      {
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
      },
      { new: true },
    );

    if (!updatedUser) {
      throw new AppError(404, 'User not found');
    }

    // Generate token
    const token = await this.utils.generateTokenPairAndSave({
      email,
      role: updatedUser.role,
      sub: updatedUser._id,
    });

    return successResponse(
      {
        user: await this.utils.sanitizeUser(updatedUser),
        token,
      },
      'Logged in successfully',
    );
  }
}
