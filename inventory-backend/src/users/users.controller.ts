import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateEmailDto } from './dto/update-email.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return {
      id: req.user.id,
      email: req.user.email,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile/email')
  async updateEmail(@Request() req, @Body() updateEmailDto: UpdateEmailDto) {
    const userId = req.user.id || req.user.sub;
    const updatedUser = await this.usersService.updateEmail(userId, updateEmailDto.email);
    return {
      id: (updatedUser as any)._id.toString(),
      email: updatedUser.email,
      message: 'Email updated successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile/password')
  async updatePassword(@Request() req, @Body() updatePasswordDto: UpdatePasswordDto) {
    const userId = req.user.id || req.user.sub;
    await this.usersService.updatePassword(
      userId,
      updatePasswordDto.currentPassword,
      updatePasswordDto.newPassword,
    );
    return {
      message: 'Password updated successfully',
    };
  }
}
