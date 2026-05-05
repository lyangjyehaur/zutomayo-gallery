import { createClient } from 'redis';
import { logger } from '../utils/logger.js';

const isProduction = process.env.NODE_ENV === 'production';
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// 建立 Redis 客戶端
export const redisClient = createClient({
  url: redisUrl,
});

// 錯誤處理
redisClient.on('error', (err) => {
  // 在開發環境不印出錯誤以避免洗版
  if (isProduction) {
    logger.error({ err }, 'Redis Client Error');
  }
});

// 連線成功
redisClient.on('connect', () => {
  logger.info('Redis Client Connected');
});

redisClient.on('ready', () => {
  logger.info('Redis Client Ready');
});

// 啟動連線函數
export const initRedis = async () => {
  // 只有在生產環境或明確提供 REDIS_URL 時才嘗試連線
  if (isProduction || process.env.REDIS_URL) {
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to connect to Redis');
      // 即使 Redis 連線失敗，也不要讓整個應用程式崩潰，它會自動重試
    }
  } else {
    logger.info('[Redis] Skipped connection in development environment');
  }
};

export const isRedisAvailable = () => redisClient.isOpen;

export const deleteKeysByPattern = async (pattern: string) => {
  if (!redisClient.isOpen) return 0;
  let deleted = 0;
  const batch: string[] = [];
  for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: 200 })) {
    batch.push(String(key));
    if (batch.length >= 200) {
      deleted += await redisClient.del(batch);
      batch.length = 0;
    }
  }
  if (batch.length > 0) {
    deleted += await redisClient.del(batch);
  }
  return deleted;
};
