import crypto from 'crypto';
import pino from 'pino';
import { pinoHttp } from 'pino-http';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  redact: [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers["x-admin-password"]',
    'res.headers["set-cookie"]',
    'password',
    'ADMIN_PASSWORD',
    'SESSION_SECRET',
    'DB_PASS',
    'R2_SECRET_ACCESS_KEY',
  ],
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req: any, res: any) => {
    const headerId = req.headers['x-request-id'];
    const id = typeof headerId === 'string' && headerId.trim() ? headerId.trim() : crypto.randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  autoLogging: {
    ignore: (req: any) => req.url === '/health' || req.url === '/api/system/status',
  },
});
