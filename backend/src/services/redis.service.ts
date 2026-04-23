import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// 建立 Redis 客戶端
export const redisClient = createClient({
  url: redisUrl,
});

// 錯誤處理
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

// 連線成功
redisClient.on('connect', () => {
  console.log('Redis Client Connected');
});

redisClient.on('ready', () => {
  console.log('Redis Client Ready');
});

// 啟動連線函數
export const initRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    // 即使 Redis 連線失敗，也不要讓整個應用程式崩潰，它會自動重試
  }
};
