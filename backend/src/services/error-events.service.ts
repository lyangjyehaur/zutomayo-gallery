import { BackendErrorLogModel } from '../models/index.js';
import { logger } from '../utils/logger.js';

export interface BackendErrorEvent {
  id: string;
  timestamp: string;
  source: 'request' | 'uncaught' | 'unhandled_rejection' | 'cron' | 'queue';
  message: string;
  stack?: string;
  statusCode?: number;
  code?: string;
  method?: string;
  url?: string;
  requestId?: string;
  ip?: string;
  details?: unknown;
}

class ErrorEventEmitter {
  emitError(event: Omit<BackendErrorEvent, 'id' | 'timestamp'>): BackendErrorEvent {
    const full: BackendErrorEvent = {
      ...event,
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };

    BackendErrorLogModel.create({
      source: full.source,
      message: full.message,
      stack: full.stack || null,
      status_code: full.statusCode || null,
      error_code: full.code || null,
      method: full.method || null,
      url: full.url || null,
      request_id: full.requestId || null,
      ip: full.ip || null,
      details: full.details || null,
    }).catch((dbErr) => {
      logger.warn({ dbErr }, 'Failed to write error log to DB');
    });

    return full;
  }
}

export const errorEventEmitter = new ErrorEventEmitter();
