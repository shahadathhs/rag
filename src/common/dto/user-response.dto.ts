import { UserRole, UserStatus } from '@/lib/database/enums';
import { Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id: string;

  // ===== Identity =====
  @Expose()
  name: string;

  @Expose()
  email: string;

  // ===== Settings =====
  @Expose()
  role: UserRole;

  @Expose()
  status: UserStatus;

  @Expose()
  isVerified: boolean;

  // ===== Activity =====
  @Expose()
  lastLoginAt?: Date;

  @Expose()
  lastActiveAt?: Date;

  // ===== Meta =====
  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
