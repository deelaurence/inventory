import { Controller, Get, Post, Put, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { UpdateEmailDto } from './dto/update-email.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UserType, UserStatus } from './schemas/user.schema';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Admin endpoints
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  async getAllUsers() {
    const users = await this.usersService.findAll();
    return users.map(user => ({
      id: (user as any)._id.toString(),
      name: user.name,
      email: user.email,
      userType: user.userType || UserType.USER,
      status: user.status || UserStatus.ACTIVE,
      createdAt: (user as any).createdAt,
    }));
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  async createUser(@Body() createUserDto: CreateUserDto) {
    const existingUser = await this.usersService.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new Error('Email already exists');
    }

    const user = await this.usersService.create(
      createUserDto.name,
      createUserDto.email,
      createUserDto.password,
      createUserDto.userType || UserType.USER,
    );

    return {
      id: (user as any)._id.toString(),
      name: user.name,
      email: user.email,
      userType: user.userType,
      message: 'User created successfully',
    };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/suspend')
  async suspendUser(@Param('id') id: string, @Request() req) {
    // Prevent admin from suspending themselves
    const currentUserId = req.user.sub;
    if (id === currentUserId) {
      throw new Error('Cannot suspend your own account');
    }

    const user = await this.usersService.suspendUser(id);
    return {
      id: (user as any)._id.toString(),
      name: user.name,
      email: user.email,
      status: user.status,
      message: 'User suspended successfully',
    };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/unsuspend')
  async unsuspendUser(@Param('id') id: string) {
    const user = await this.usersService.unsuspendUser(id);
    return {
      id: (user as any)._id.toString(),
      name: user.name,
      email: user.email,
      status: user.status,
      message: 'User unsuspended successfully',
    };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':id/user-type')
  async updateUserType(@Param('id') id: string, @Body('userType') userType: UserType, @Request() req) {
    // Prevent admin from demoting themselves
    const currentUserId = req.user.sub;
    if (id === currentUserId && userType !== UserType.ADMIN) {
      throw new Error('Cannot change your own user type');
    }

    const user = await this.usersService.updateUserType(id, userType);
    return {
      id: (user as any)._id.toString(),
      name: user.name,
      email: user.email,
      userType: user.userType,
      message: 'User type updated successfully',
    };
  }

  // Migration endpoint - make all existing users admin
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('migrate/make-all-admin')
  async makeAllUsersAdmin() {
    const count = await this.usersService.makeAllUsersAdmin();
    return { message: `${count} users updated to admin` };
  }

  // Profile endpoints
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    const userId = req.user.sub;
    const user = await this.usersService.findById(userId);
    return {
      id: req.user.sub,
      email: req.user.email,
      name: user?.name,
      userType: user?.userType || UserType.USER,
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
