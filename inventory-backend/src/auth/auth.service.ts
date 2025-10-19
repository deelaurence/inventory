import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    console.log('AuthService - Found user:', user);
    if (user && await this.usersService.validatePassword(password, user.password)) {
      // Convert Mongoose document to plain object
      const userObj = JSON.parse(JSON.stringify(user));
      const { password: _, ...result } = userObj;
      console.log('AuthService - User validated, returning:', result);
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user._id };
    console.log('AuthService - Creating JWT with payload:', payload);
    const token = this.jwtService.sign(payload);
    console.log('AuthService - Generated token:', token);
    const result = {
      access_token: token,
      user: {
        id: user._id,
        email: user.email,
      },
    };
    console.log('AuthService - Returning login result:', result);
    return result;
  }
}
