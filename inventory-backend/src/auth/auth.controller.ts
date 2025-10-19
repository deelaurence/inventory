import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    console.log('AuthController - Login attempt for email:', loginDto.email);
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    console.log('AuthController - User validation result:', user ? 'Success' : 'Failed');
    if (!user) {
      console.log('AuthController - Login failed - Invalid credentials');
      throw new UnauthorizedException('Invalid credentials');
    }
    const result = await this.authService.login(user);
    console.log('AuthController - Login successful, returning token');
    return result;
  }
}
