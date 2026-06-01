import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { TwitterMonitorService, collectFeedTargets, processFeed } from './twitter-monitor.service.js';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { runR2Sync } from './r2-sync.service.js';
import { errorEventEmitter } from './error-events.service.js';
import { logger } from '../utils/logger.js';
import { SysConfigModel } from '../models/index.js';

const isProduction = process.env.NODE_ENV === 'production';
const hasRedisUrl = !!process.env.REDIS_URL;

// 只有在生產環境或明確設定了 Redis 時才啟動 BullMQ，避免本地開發沒有 Redis 時卡住
export let twitterQueue: Queue | null = null;
export let mediaQueue: Queue | null = null;
export let bullBoardAdapter: ExpressAdapter | null = null;
let connection: Redis | null = null;

if (isProduction || hasRedisUrl) {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  twitterQueue = new Queue('twitter-monitor', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });
  mediaQueue = new Queue('media-tasks', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 50,
      removeOnFail: 200,
    },
  });

  // 初始化 Bull-Board 介面
  bullBoardAdapter = new ExpressAdapter();
  bullBoardAdapter.setBasePath('/api/admin/queues');
  createBullBoard({
    queues: [new BullMQAdapter(twitterQueue), new BullMQAdapter(mediaQueue)],
    serverAdapter: bullBoardAdapter,
  });

  // Twitter monitor worker：支援 check-rss（協調）和 check-feed（單 feed 處理）
  const worker = new Worker('twitter-monitor', async (job: Job) => {
    logger.info({ jobId: job.id, jobName: job.name }, '[BullMQ] Processing job');

    if (job.name === 'check-rss') {
      // 協調 job：收集所有 feed URL，拆成獨立的 check-feed job
      const feedTargets = await collectFeedTargets();
      logger.info({ feedCount: feedTargets.length }, '[Twitter Monitor] Enqueuing feed jobs');

      for (const target of feedTargets) {
        await twitterQueue!.add('check-feed', { feedUrl: target.feedUrl, contentType: target.contentType, separateTopic: target.separateTopic }, {
          attempts: 2,
          backoff: { type: 'exponential', delay: 3000 },
        });
      }

      await job.updateProgress(100);
      return { enqueuedFeeds: feedTargets.length };
    }

    if (job.name === 'check-feed') {
      const { feedUrl, contentType, separateTopic } = job.data as { feedUrl: string; contentType?: string; separateTopic?: boolean };
      const result = await processFeed(feedUrl, contentType || 'fanart', separateTopic || false);
      await job.updateProgress(100);
      return result;
    }
  }, { connection, concurrency: 3 });

  worker.on('completed', (job, returnvalue) => {
    logger.info({ jobId: job.id, result: returnvalue }, '[BullMQ] Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, '[BullMQ] Job failed');
    errorEventEmitter.emitError({
      source: 'queue',
      message: `[twitter-monitor] Job ${job?.id ?? '?'} failed: ${err.message}`,
      stack: err.stack,
      details: { jobId: job?.id, jobName: job?.name, queueName: 'twitter-monitor' },
    });
  });

  const mediaWorker = new Worker('media-tasks', async (job: Job) => {
    logger.info({ jobId: job.id, jobName: job.name }, '[BullMQ] Processing job');
    if (job.name === 'sync-images-to-r2') {
      const result = await runR2Sync();
      await job.updateProgress(100);
      return result;
    }
    return null;
  }, { connection, concurrency: 1 });

  mediaWorker.on('completed', (job, returnvalue) => {
    logger.info({ jobId: job.id, result: returnvalue }, '[BullMQ] Job completed');
  });

  mediaWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, '[BullMQ] Job failed');
    errorEventEmitter.emitError({
      source: 'queue',
      message: `[media-tasks] Job ${job?.id ?? '?'} failed: ${err.message}`,
      stack: err.stack,
      details: { jobId: job?.id, jobName: job?.name, queueName: 'media-tasks' },
    });
  });
}

let cachedCronSchedule = process.env.TWITTER_MONITOR_CRON || '0 * * * *';

/**
 * 從 DB 載入 twitter_monitor_config，更新 cron schedule。
 */
export const refreshQueueConfig = async () => {
  try {
    const row = await SysConfigModel.findByPk('twitter_monitor_config');
    const db = row?.get('value') as any;
    if (db && db.monitor_cron) {
      cachedCronSchedule = db.monitor_cron;
    }
  } catch (err) {
    logger.warn({ err }, '[Queue] Failed to load twitter_monitor_config from DB, using defaults');
  }
};

export const initQueues = async () => {
  if (!twitterQueue) {
    logger.info('[BullMQ] Skipped initialization in development environment without Redis');
    return;
  }

  await refreshQueueConfig();
  const CRON_SCHEDULE = cachedCronSchedule;
  
  // 清除舊的重複任務
  const repeatableJobs = await twitterQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await twitterQueue.removeRepeatableByKey(job.key);
  }

  // 設定新的排程任務：check-rss 作為協調 job，實際 feed 處理拆成獨立 job
  await twitterQueue.add('check-rss', {}, {
    repeat: {
      pattern: CRON_SCHEDULE
    }
  });

  logger.info({ pattern: CRON_SCHEDULE }, '[BullMQ] Twitter Monitor scheduled (check-rss → per-feed jobs, concurrency=3)');
};
