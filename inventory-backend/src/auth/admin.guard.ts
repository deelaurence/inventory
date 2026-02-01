import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UserType } from '../users/schemas/user.schema';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (user.userType !== UserType.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
