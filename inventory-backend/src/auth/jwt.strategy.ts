import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { JWT_CONFIG } from './jwt.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    console.log('JWT Strategy - Using secret:', JWT_CONFIG.secret);
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_CONFIG.secret,
    });
  }

  async validate(payload: any) {
    console.log('JWT Strategy - Validating payload:', payload);
    const user = await this.usersService.findByEmail(payload.email);
    console.log('JWT Strategy - User found:', user ? 'Yes' : 'No');
    if (!user) {
      console.log('JWT Strategy - User not found, throwing UnauthorizedException');
      throw new UnauthorizedException();
    }
    const result = { sub: (user as any)._id, email: user.email };
    console.log('JWT Strategy - Returning user:', result);
    return result;
  }
}
