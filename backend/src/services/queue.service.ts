import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { TwitterMonitorService } from './twitter-monitor.service.js';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const isProduction = process.env.NODE_ENV === 'production';
const hasRedisUrl = !!process.env.REDIS_URL;

// 只有在生產環境或明確設定了 Redis 時才啟動 BullMQ，避免本地開發沒有 Redis 時卡住
export let twitterQueue: Queue | null = null;
export let bullBoardAdapter: ExpressAdapter | null = null;
let connection: Redis | null = null;

if (isProduction || hasRedisUrl) {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  twitterQueue = new Queue('twitter-monitor', { connection });

  // 初始化 Bull-Board 介面
  bullBoardAdapter = new ExpressAdapter();
  bullBoardAdapter.setBasePath('/api/admin/queues');
  createBullBoard({
    queues: [new BullMQAdapter(twitterQueue)],
    serverAdapter: bullBoardAdapter,
  });

  const worker = new Worker('twitter-monitor', async (job: Job) => {
    console.log(`[BullMQ] Processing job ${job.id} of type ${job.name}`);
    if (job.name === 'check-rss') {
      // 呼叫原本的檢查邏輯
      await TwitterMonitorService.checkRss();
    }
  }, { connection });

  worker.on('completed', job => {
    console.log(`[BullMQ] Job ${job.id} has completed!`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[BullMQ] Job ${job?.id} has failed with ${err.message}`);
  });
}

export const initQueues = async () => {
  if (!twitterQueue) {
    console.log('[BullMQ] Skipped initialization in development environment without Redis');
    return;
  }

  const CRON_SCHEDULE = process.env.TWITTER_MONITOR_CRON || '0 * * * *';
  
  // 清除舊的重複任務
  const repeatableJobs = await twitterQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await twitterQueue.removeRepeatableByKey(job.key);
  }

  if (!process.env.TWITTER_RSS_URL) {
    console.log('[BullMQ] TWITTER_RSS_URL is not set. Scheduled monitor disabled.');
    return;
  }

  // 設定新的排程任務
  await twitterQueue.add('check-rss', {}, {
    repeat: {
      pattern: CRON_SCHEDULE
    }
  });

  console.log(`[BullMQ] Twitter Monitor scheduled with pattern: ${CRON_SCHEDULE}`);
};
