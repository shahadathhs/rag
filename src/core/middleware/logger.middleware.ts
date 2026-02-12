import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

// ANSI color codes
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;

      let statusColor = colors.green;
      if (statusCode >= 400 && statusCode < 500) {
        statusColor = colors.yellow;
      } else if (statusCode >= 500) {
        statusColor = colors.red;
      }

      console.info(
        `${colors.cyan}[${method}]${colors.reset} ${originalUrl} ${statusColor}${statusCode}${colors.reset} ${duration}ms`,
      );
    });

    next();
  }
}
