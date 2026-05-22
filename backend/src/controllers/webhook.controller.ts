import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { applyStagingReviewAction } from './staging-fanart.controller.js';
import { errorEventEmitter } from '../services/error-events.service.js';
import { NotificationService } from '../services/notification.service.js';
import { parseFanartReviewCallbackData } from '../services/telegram-bot.service.js';
import { logger } from '../utils/logger.js';

const TELEGRAM_SECRET_HEADER = 'x-telegram-bot-api-secret-token';

function isValidSecret(provided: string | undefined, expected: string): boolean {
  if (!provided) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

export const verifyTelegramWebhook = (req: Request, res: Response, next: NextFunction): void => {
  const expectedToken = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expectedToken) {
    logger.warn('Telegram webhook rejected: TELEGRAM_WEBHOOK_SECRET not configured');
    res.status(403).json({
      success: false,
      error: 'Telegram webhook secret is not configured',
      code: 'TELEGRAM_WEBHOOK_SECRET_NOT_CONFIGURED',
    });
    return;
  }

  const providedToken = req.header(TELEGRAM_SECRET_HEADER);
  if (!isValidSecret(providedToken, expectedToken)) {
    logger.warn({ ip: req.ip }, 'Telegram webhook rejected: invalid secret token');
    res.status(403).json({
      success: false,
      error: 'Telegram webhook secret invalid',
      code: 'INVALID_TELEGRAM_WEBHOOK_SECRET',
    });
    return;
  }

  next();
};

export const handleTelegramWebhook = async (req: Request, res: Response) => {
  const callbackQuery = req.body?.callback_query;
  if (!callbackQuery) {
    return res.status(200).json({ success: true, message: 'Ignored non-callback update' });
  }

  const parsed = parseFanartReviewCallbackData(callbackQuery.data);
  if (!parsed) {
    await answerTelegramCallback(callbackQuery.id, '不支援的審核動作');
    return res.status(200).json({ success: true, message: 'Ignored unsupported callback' });
  }

  try {
    const result = await applyStagingReviewAction(parsed.stagingId, parsed.action);
    const actionLabel = parsed.action === 'approve' ? '批准' : parsed.action === 'hold' ? '暫存觀察' : '拒絕';
    const suffix = result.alreadyProcessed ? '（已處理過）' : '';
    await answerTelegramCallback(callbackQuery.id, `${actionLabel}完成${suffix}`);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    await answerTelegramCallback(callbackQuery.id, '審核動作無法套用');
    throw err;
  }
};

async function answerTelegramCallback(callbackQueryId: unknown, text: string): Promise<void> {
  if (typeof callbackQueryId !== 'string' || !callbackQueryId) return;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text.substring(0, 200),
        show_alert: false,
      }),
    });
  } catch (err) {
    logger.warn({ err }, 'Failed to answer Telegram callback query');
  }
}

/**
 * Waline webhook token 驗證中間件
 * Waline 不支持內建簽名驗證，使用路徑 token 方式保護端點
 * 配置 Waline WEBHOOK 時設為: https://your-domain/api/webhook/waline/<WALINE_WEBHOOK_SECRET>
 * 若未配置 WALINE_WEBHOOK_SECRET，生產環境拒絕請求，開發環境放行但警告
 */
export const verifyWalineWebhook = (req: Request, res: Response, next: NextFunction): void => {
  const expectedToken = process.env.WALINE_WEBHOOK_SECRET;
  const providedToken = req.params.token;

  if (!expectedToken) {
    if (process.env.NODE_ENV === 'production') {
      logger.warn('Waline webhook rejected: WALINE_WEBHOOK_SECRET not configured in production');
      res.status(403).json({ success: false, error: 'Webhook 服務尚未設定' });
      return;
    }
    logger.warn('Waline webhook: WALINE_WEBHOOK_SECRET not set — requests are unauthenticated (dev only)');
    next();
    return;
  }

  if (!providedToken || providedToken !== expectedToken) {
    logger.warn({ ip: req.ip }, 'Waline webhook rejected: invalid or missing token');
    res.status(403).json({ success: false, error: 'Webhook 權杖無效' });
    return;
  }

  next();
};

export const handleWalineWebhook = async (req: Request, res: Response) => {
  try {
    const barkConfigured = process.env.BARK_URL || process.env.BARK_KEY;
    if (!barkConfigured) {
      logger.warn('Waline Webhook received, but BARK_URL / BARK_KEY is not configured');
      return res.status(200).json({ success: true, message: 'BARK not configured' });
    }

    const payload = req.body;
    logger.info({ payload: JSON.stringify(payload).substring(0, 500) }, 'Received Waline webhook');

    // 解析 Waline 的 webhook 數據格式
    // Waline 的 webhook 結構通常是 { type: 'new_comment', data: { comment: { nick: '...', comment: '...', url: '...' } } }
    let commentData = payload?.data?.comment || payload?.data || payload;
    
    // 過濾掉可能的心跳測試或非評論事件
    if (payload.type && payload.type !== 'new_comment') {
       return res.status(200).json({ success: true, message: 'Ignored non-comment event' });
    }

    const nick = commentData.nick || '匿名';
    // 去除 HTML 標籤
    const rawComment = commentData.comment || '無內容';
    const comment = rawComment.replace(/<[^>]*>?/gm, ''); 
    const url = commentData.url || '';

    // 組合 Bark 推送內容
    const sent = await NotificationService.sendBarkNotification({
      title: `畫廊新留言: ${nick}`,
      body: `${comment}\n\n頁面: ${url}`,
      url: undefined,
      extraParams: 'group=Waline&icon=https://gallery.ztmr.club/favicon.ico',
    });

    if (sent) {
      return res.status(200).json({ success: true, message: 'Bark notification sent' });
    } else {
      return res.status(500).json({ success: false, error: '通知發送失敗' });
    }
  } catch (error) {
    logger.error({ err: error }, 'Error handling Waline webhook');
    errorEventEmitter.emitError({
      source: 'request',
      message: `Waline webhook handler failed: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      statusCode: 500,
      method: req.method,
      url: req.originalUrl,
    });
    return res.status(500).json({ success: false, error: '系統暫時發生錯誤，請稍後再試' });
  }
};
