import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { RequestWithUser } from '../types/moddlewareRequest.types';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP REQUEST');
  private readonly logDir = 'C:\\wazuh-logs';
  private readonly logFile = path.join(this.logDir, 'nest-requests.json');

  constructor() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (e) {
      console.error('❌ Errore creazione cartella log:', e);
    }
  }

  use(req: RequestWithUser, res: Response, next: NextFunction): void {
    const start = Date.now();

    res.on('finish', () => {
      const durationMs = Date.now() - start;

      const event = {
        type: 'http_request',
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        duration_ms: durationMs,
        ip: req.ip,
        user_agent: req.get('user-agent') || '',
        user: req.user?.userId ?? 'anonymous',
        role: req.user?.role ?? undefined,
        app: 'webapp-backend',
      };

      const consoleMsg = `endpoint:${req.method} ${event.path} statusCode:${res.statusCode} ip:${req.ip} user:${event.user} (${durationMs}ms)`;
      this.logger.log(consoleMsg);

      const jsonLine = JSON.stringify(event) + '\n';
      fs.appendFile(this.logFile, jsonLine, (err) => {
        if (err) console.error('❌ Errore scrittura log su file:', err);
      });
    });

    next();
  }
}
