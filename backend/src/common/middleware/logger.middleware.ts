import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, response, Response } from 'express';
import { NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  logger = new Logger('HTTP REQUEST');

  use(req: Request, res: Response, next: NextFunction): void {
    const { ip, method, originalUrl } = req;
    const userAgent = req.get('user-agent') || '';
    res.on('finish', () => {
      const { statusCode } = response;

      this.logger.log(
        `${method} ${originalUrl} ${statusCode} - ${userAgent} ${ip}`,
      );
    });

    next();
  }
}
