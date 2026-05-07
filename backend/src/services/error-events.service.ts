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

const ERROR_THRESHOLD = parseInt(process.env.ERROR_NOTIFICATION_THRESHOLD || '10', 10);
const ERROR_WINDOW_MS = parseInt(process.env.ERROR_NOTIFICATION_WINDOW_MS || String(5 * 60 * 1000), 10);

class ErrorEventEmitter {
  private recentErrors: Array<{ timestamp: number; source: string }> = [];
  private lastNotificationAt = 0;
  private notificationCooldownMs = 15 * 60 * 1000;

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

    const now = Date.now();
    this.recentErrors.push({ timestamp: now, source: full.source });
    this.recentErrors = this.recentErrors.filter(e => now - e.timestamp < ERROR_WINDOW_MS);

    if (
      this.recentErrors.length >= ERROR_THRESHOLD &&
      now - this.lastNotificationAt > this.notificationCooldownMs
    ) {
      this.lastNotificationAt = now;
      this.sendThresholdNotification().catch(() => {});
    }

    return full;
  }

  private async sendThresholdNotification() {
    try {
      const { NotificationService } = await import('./notification.service.js');
      const serverErrors = this.recentErrors.filter(e => e.source !== 'request').length;
      await NotificationService.send({
        type: 'error-threshold',
        title: '⚠️ 系統異常警告',
        body: `過去 ${Math.round(ERROR_WINDOW_MS / 60000)} 分鐘內累積 ${this.recentErrors.length} 個錯誤（其中 ${serverErrors} 個為伺服器端錯誤），已超過閾值 ${ERROR_THRESHOLD}`,
      });
    } catch {}
  }
}

export const errorEventEmitter = new ErrorEventEmitter();
