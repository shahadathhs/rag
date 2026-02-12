import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthGetProfileService } from './services/auth-get-profile.service';
import { AuthLoginService } from './services/auth-login.service';
import { AuthLogoutService } from './services/auth-logout.service';
import { AuthRegisterService } from './services/auth-register.service';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [
    AuthRegisterService,
    AuthLoginService,
    AuthLogoutService,
    AuthGetProfileService,
  ],
})
export class AuthModule {}
