import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserType, UserStatus } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async create(name: string, email: string, password: string, userType: UserType = UserType.USER): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new this.userModel({ name, email, password: hashedPassword, userType });
    return user.save();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().select('-password').sort({ createdAt: -1 }).exec();
  }

  async suspendUser(userId: string): Promise<UserDocument> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.status = UserStatus.SUSPENDED;
    return user.save();
  }

  async unsuspendUser(userId: string): Promise<UserDocument> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.status = UserStatus.ACTIVE;
    return user.save();
  }

  async updateUserType(userId: string, userType: UserType): Promise<UserDocument> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.userType = userType;
    return user.save();
  }

  async makeAllUsersAdmin(): Promise<number> {
    // Update all users to admin and ensure they have active status
    const result = await this.userModel.updateMany(
      {},
      { $set: { userType: UserType.ADMIN, status: UserStatus.ACTIVE } }
    ).exec();

    return result.modifiedCount;
  }

  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async updateEmail(userId: string, newEmail: string): Promise<UserDocument> {
    // Check if email is already taken
    const existingUser = await this.findByEmail(newEmail);
    if (existingUser && (existingUser as any)._id.toString() !== userId) {
      throw new ConflictException('Email is already in use');
    }

    const user = await this.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    user.email = newEmail;
    return user.save();
  }

  async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<UserDocument> {
    const user = await this.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.validatePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    return user.save();
  }
}
