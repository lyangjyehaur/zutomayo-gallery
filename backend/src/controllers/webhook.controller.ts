import { Request, Response, NextFunction } from 'express';
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
      res.status(403).json({ success: false, error: 'Webhook not configured' });
      return;
    }
    logger.warn('Waline webhook: WALINE_WEBHOOK_SECRET not set — requests are unauthenticated (dev only)');
    next();
    return;
  }

  if (!providedToken || providedToken !== expectedToken) {
    logger.warn({ ip: req.ip }, 'Waline webhook rejected: invalid or missing token');
    res.status(403).json({ success: false, error: 'Invalid webhook token' });
    return;
  }

  next();
};

export const handleWalineWebhook = async (req: Request, res: Response) => {
  try {
    const { BARK_KEY } = process.env;
    if (!BARK_KEY) {
      logger.warn('Waline Webhook received, but BARK_KEY is not configured');
      return res.status(200).json({ success: true, message: 'BARK_KEY not set' });
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
    const title = encodeURIComponent(`畫廊新留言: ${nick}`);
    const body = encodeURIComponent(`${comment}\n\n頁面: ${url}`);
    
    // 如果 BARK_KEY 包含完整的 URL (例如 https://api.day.app/xxx)，就直接使用
    // 如果只有 key，就拼上預設的 https://api.day.app
    let barkUrl = '';
    if (BARK_KEY.startsWith('http')) {
       barkUrl = `${BARK_KEY}/${title}/${body}`;
    } else {
       barkUrl = `https://api.day.app/${BARK_KEY}/${title}/${body}`;
    }

    // 加上圖示和分組參數
    barkUrl += '?group=Waline&icon=https://gallery.ztmr.club/favicon.ico';

    logger.info({ barkUrl }, 'Sending to Bark');
    const response = await fetch(barkUrl);
    
    if (response.ok) {
      return res.status(200).json({ success: true, message: 'Bark notification sent' });
    } else {
      const errText = await response.text();
      logger.error({ status: response.status, body: errText }, 'Bark API Error');
      return res.status(500).json({ success: false, error: 'Failed to send Bark notification' });
    }
  } catch (error) {
    logger.error({ err: error }, 'Error handling Waline webhook');
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
