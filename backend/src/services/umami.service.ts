import { logger } from '../utils/logger.js';

interface UmamiEventPayload {
  website: string;
  name: string;
  data?: Record<string, string | number | boolean>;
}

const UMAMI_API_URL = process.env.UMAMI_API_URL || '';
const UMAMI_WEBSITE_ID = process.env.UMAMI_WEBSITE_ID || '';

/**
 * Umami 是否已配置 (API URL + Website ID)
 */
export const isUmamiConfigured = (): boolean => {
  return !!(UMAMI_API_URL && UMAMI_WEBSITE_ID);
};

/**
 * 發送 Umami 追蹤事件 (服務端)
 * 轉發 User-Agent 和 X-Forwarded-For 以正確歸屬訪客
 * Fire-and-forget：不阻塞 API 回應
 */
export const trackUmamiEvent = async (
  eventName: string,
  data: Record<string, string | number | boolean>,
  userAgent?: string,
  clientIp?: string,
): Promise<void> => {
  if (!isUmamiConfigured()) {
    logger.debug({ eventName }, 'Umami not configured, skipping event tracking');
    return;
  }

  try {
    const payload: UmamiEventPayload = {
      website: UMAMI_WEBSITE_ID,
      name: eventName,
      data,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (userAgent) headers['User-Agent'] = userAgent;
    if (clientIp) headers['X-Forwarded-For'] = clientIp;

    // Fire and forget
    fetch(`${UMAMI_API_URL}/api/send`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: 'event', payload }),
    }).then((response) => {
      if (!response.ok) {
        logger.warn({ status: response.status, eventName }, 'Umami event tracking failed');
      }
    }).catch((err) => {
      logger.warn({ err, eventName }, 'Umami event tracking error');
    });
  } catch (err) {
    logger.warn({ err, eventName }, 'Umami event tracking error');
  }
};
