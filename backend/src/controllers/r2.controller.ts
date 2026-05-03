import { Request, Response } from 'express';
import { mediaQueue } from '../services/queue.service.js';
import { runR2Sync } from '../services/r2-sync.service.js';

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
