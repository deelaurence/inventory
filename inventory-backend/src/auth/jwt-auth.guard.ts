import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    console.log('JwtAuthGuard - Checking authentication...');
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    console.log('JwtAuthGuard - Handle request - Error:', err);
    console.log('JwtAuthGuard - Handle request - User:', user);
    console.log('JwtAuthGuard - Handle request - Info:', info);
    
    if (err || !user) {
      console.log('JwtAuthGuard - Authentication failed');
      throw err || new UnauthorizedException();
    }
    
    console.log('JwtAuthGuard - Authentication successful');
    return user;
  }
}
