import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../services/redis.service.js';

/**
 * 建立 Redis API 快取 Middleware
 * @param duration 快取時間（秒）
 */
export const cacheMiddleware = (duration: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 只快取 GET 請求
    if (req.method !== 'GET') {
      return next();
    }

    // 如果 Redis 沒有連線（例如開發環境），直接放行
    if (!redisClient.isOpen) {
      return next();
    }

    // 使用 URL 作為快取 Key
    const key = `api-cache:${req.originalUrl || req.url}`;

    try {
      const cachedResponse = await redisClient.get(key);
      if (cachedResponse) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Content-Type', 'application/json');
        return res.send(cachedResponse);
      }

      res.setHeader('X-Cache', 'MISS');

      // 覆寫 res.json 攔截回應內容
      const originalJson = res.json.bind(res);
      res.json = (body: any): Response => {
        // 將結果存入 Redis
        redisClient.setEx(key, duration, JSON.stringify(body)).catch(err => {
          console.error('[Redis Cache] Failed to save cache:', err);
        });
        
        // 恢復原本的 res.json 並回傳
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error('[Redis Cache] Error:', error);
      next();
    }
  };
};
