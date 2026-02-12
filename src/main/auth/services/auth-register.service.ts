import { successResponse, TResponse } from '@/common/utils/response.util';
import { AppError } from '@/core/error/handle-error.app';
import { HandleError } from '@/core/error/handle-error.decorator';
import { User, UserDocument } from '@/lib/database/schemas/user.schema';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RegisterDto } from '../dto/register.dto';

@Injectable()
export class AuthRegisterService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly utils: AuthUtilsService,
  ) {}

  @HandleError('Registration failed', 'User')
  async register(dto: RegisterDto): Promise<TResponse<any>> {
    const { email, password, name } = dto;

    // Check if user email already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new AppError(400, 'User already exists with this email');
    }

    // Create new user with verified status
    const newUser = await this.userModel.create({
      email,
      name,
      password: await this.utils.hash(password),
      isVerified: true, // Auto-verify for simplified auth
    });

    // Generate JWT tokens
    const { accessToken, refreshToken } =
      await this.utils.generateTokenPairAndSave({
        sub: newUser._id,
        email: newUser.email,
        role: newUser.role,
      });

    // Return sanitized response with tokens
    return successResponse(
      {
        user: await this.utils.sanitizeUser(newUser),
        accessToken,
        refreshToken,
      },
      'Registration successful. You are now logged in.',
    );
  }
}
