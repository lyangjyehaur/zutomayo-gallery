import { Request, Response } from 'express';
import { mediaQueue } from '../services/queue.service.js';
import { runR2Sync } from '../services/r2-sync.service.js';
import { uploadVideoToR2, deleteVideoFromR2, ALLOWED_VIDEO_FORMATS, MAX_VIDEO_FILE_SIZE } from '../services/r2.service.js';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

const heroVideoUploadSchema = z.object({
  mvId: z.string().min(1, 'MV ID 不能為空'),
  fileName: z.string().min(1, '檔案名稱不能為空'),
});

const heroVideoDeleteSchema = z.object({
  videoUrl: z.string().url('無效的影片 URL'),
});

let isSyncing = false;

export const syncImagesToR2 = async (req: Request, res: Response): Promise<void> => {
  if (mediaQueue) {
    try {
      const job = await mediaQueue.add('sync-images-to-r2', {}, { jobId: 'sync-images-to-r2' });
      res.json({ success: true, message: 'R2 image synchronization task enqueued.', jobId: job.id });
      return;
    } catch (e: any) {
      res.status(409).json({ success: false, message: e?.message || 'Failed to enqueue task.' });
      return;
    }
  }

  if (isSyncing) {
    res.status(409).json({ success: false, message: 'A sync task is already running.' });
    return;
  }

  isSyncing = true;
  res.json({ success: true, message: 'Started R2 image synchronization in the background.' });

  void (async () => {
    try {
      console.log('[R2 Sync] Starting background synchronization task...');
      const result = await runR2Sync();
      console.log(`[R2 Sync] Finished. Success: ${result.successCount}, Fail: ${result.failCount}, Skipped: ${result.skippedCount}`);
    } catch (error) {
      console.error('[R2 Sync] Fatal error during synchronization:', error);
    } finally {
      isSyncing = false;
    }
  })();
};

export const uploadHeroVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      res.status(400).json({ success: false, error: '請使用 multipart/form-data 格式上傳' });
      return;
    }

    const file = req.file;
    const mvId = req.body.mvId as string;

    if (!file) {
      res.status(400).json({ success: false, error: '請選擇要上傳的影片檔案' });
      return;
    }

    if (!mvId) {
      res.status(400).json({ success: false, error: 'MV ID 不能為空' });
      return;
    }

    const result = await uploadVideoToR2(file.buffer, mvId, file.originalname);

    if (result.url) {
      logger.info({ mvId, fileName: file.originalname }, '[Hero Video] Upload successful');
      res.json({
        success: true,
        data: {
          url: result.url,
          fileName: file.originalname,
          size: file.size,
        }
      });
    } else {
      res.status(400).json({ success: false, error: result.error || '上傳失敗' });
    }
  } catch (error) {
    logger.error({ err: error }, '[Hero Video] Upload error');
    res.status(500).json({ success: false, error: '伺服器錯誤' });
  }
};

export const deleteHeroVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = heroVideoDeleteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: '無效的請求參數',
        details: parsed.error.errors,
      });
      return;
    }

    const { videoUrl } = parsed.data;
    const success = await deleteVideoFromR2(videoUrl);

    if (success) {
      logger.info({ videoUrl }, '[Hero Video] Deleted successfully');
      res.json({ success: true, message: '影片已成功刪除' });
    } else {
      res.status(400).json({ success: false, error: '刪除失敗' });
    }
  } catch (error) {
    logger.error({ err: error }, '[Hero Video] Delete error');
    res.status(500).json({ success: false, error: '伺服器錯誤' });
  }
};

export const getHeroVideoConfig = async (_req: Request, res: Response): Promise<void> => {
  res.json({
    success: true,
    data: {
      allowedFormats: ALLOWED_VIDEO_FORMATS,
      maxFileSize: MAX_VIDEO_FILE_SIZE,
      maxFileSizeMB: MAX_VIDEO_FILE_SIZE / (1024 * 1024),
    }
  });
};
