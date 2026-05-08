import { Request, Response, NextFunction } from 'express';
import { errorEventEmitter } from '../services/error-events.service.js';
import { NotificationService } from '../services/notification.service.js';
import { logger } from '../utils/logger.js';

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
