import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl } = req;
    
    // Log request start
    console.log(`[${new Date().toISOString()}] ${method} ${originalUrl} - Started`);
    
    // Override res.end to capture response details
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any): any {
      const processingTime = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      // Log request completion
      console.log(`[${new Date().toISOString()}] ${method} ${originalUrl} - ${statusCode} - ${processingTime}ms`);
      
      // Call original end method
      return originalEnd.call(this, chunk, encoding);
    };
    
    next();
  }
}
