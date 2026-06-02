import { NextFunction, Request, Response } from 'express';
import { StagingFanartModel, MediaGroupModel, MediaModel, CrawlerStateModel, MVMediaModel, ArtistModel, ArtistMediaModel } from '../models/index.js';
import { MVService } from '../services/mv.service.js';
import { nanoid } from 'nanoid';
import { Op, Sequelize } from 'sequelize';
import { runCrawler } from '../scripts/fetch-zutomayo-art-tweets.js';
import { moveFileInR2, uploadBufferToR2 } from '../services/r2.service.js';
import { errorEventEmitter } from '../services/error-events.service.js';
import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const mvService = new MVService();

const generateShortId = () => nanoid(16);
export type StagingReviewAction = 'approve' | 'hold' | 'reject';
type StagingStatus = 'pending' | 'on_hold' | 'reviewed' | 'approved' | 'rejected';

async function fetchMediaToBuffer(url: string): Promise<{ buffer: Buffer; contentType: string; ext: string } | null> {
  let fetchUrl = url;
  if (fetchUrl.includes('pbs.twimg.com')) {
    fetchUrl = fetchUrl.replace(/&name=[a-z0-9]+/i, '');
    fetchUrl = fetchUrl.replace(/\?name=[a-z0-9]+/i, '?');
    fetchUrl = fetchUrl.includes('?') ? `${fetchUrl}&name=orig` : `${fetchUrl}?name=orig`;
    fetchUrl = fetchUrl.replace('?&', '?');
  }

  try {
    const res = await fetch(fetchUrl);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let contentType = res.headers.get('content-type') || 'application/octet-stream';
    const extMatch = url.match(/\.(jpg|jpeg|png|gif|webp|avif|mp4|m4v|mov|m3u8)/i);
    let ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    if (url.includes('format=png')) ext = 'png';
    if (url.includes('format=webp')) ext = 'webp';
    if (url.includes('format=mp4')) ext = 'mp4';
    
    return { buffer, contentType, ext };
  } catch (err) {
    return null;
  }
}

export const triggerCrawler = async (req: Request, res: Response) => {
  const searchTerms = req.body.searchTerms as string | undefined;
  const startDate = req.body.startDate as string | undefined;
  const endDate = req.body.endDate as string | undefined;
  const maxItems = req.body.maxItems ? parseInt(req.body.maxItems as string, 10) : undefined;
  const contentType = (req.body.contentType as string) || 'fanart';

  if (!searchTerms || typeof searchTerms !== 'string' || !searchTerms.trim()) {
    throw new AppError(400, 'searchTerms is required');
  }

  if (!startDate || !endDate) {
    throw new AppError(400, 'startDate and endDate are required');
  }
  
  runCrawler(searchTerms, startDate, endDate, maxItems, undefined, contentType).then(async () => {
    try {
      const { NotificationService } = await import('../services/notification.service.js');
      await NotificationService.send({
        type: 'crawler-complete',
        title: '爬蟲任務完成',
        body: `搜尋: ${searchTerms}\n期間: ${startDate} ~ ${endDate}`,
      });
    } catch {}
  }).catch(err => {
    logger.error({ err }, '[Crawler Error] Background crawler failed');
    errorEventEmitter.emitError({
      source: 'cron',
      message: `Background crawler failed: ${err instanceof Error ? err.message : String(err)}`,
      stack: err instanceof Error ? err.stack : undefined,
      details: { phase: 'fanart-crawler', searchTerms, startDate, endDate },
    });
  });

  res.json({
    success: true,
    message: 'Crawler started in background',
    searchTerms,
    startDate,
    endDate,
    maxItems
  });
};

export const getProgress = async (req: Request, res: Response) => {
  const username = 'staging-fanart';
  let syncProgress = null;
  
  const crawlerState = await CrawlerStateModel.findOne({ where: { username } });
  if (crawlerState) {
    syncProgress = {
      total_crawled: crawlerState.getDataValue('total_crawled'),
      pagination_token: crawlerState.getDataValue('pagination_token'),
      status: crawlerState.getDataValue('status'),
      current_run_processed: crawlerState.getDataValue('current_run_processed'),
      current_run_total: crawlerState.getDataValue('current_run_total'),
    };
  }

  const counts = await StagingFanartModel.findAll({
    attributes: [
      'status',
      [Sequelize.fn('COUNT', Sequelize.col('status')), 'count']
    ],
    group: ['status']
  });

  const statusCounts = {
    pending: 0,
    on_hold: 0,
    reviewed: 0,
    approved: 0,
    rejected: 0,
  };

  counts.forEach((row: any) => {
    const status = row.get('status') as string;
    const count = parseInt(row.get('count') as string, 10);
    if (status in statusCounts) {
      statusCounts[status as keyof typeof statusCounts] = count;
    }
  });

  res.json({
    success: true,
    data: {
      syncProgress,
      statusCounts
    }
  });
};

export const getStagingFanarts = async (req: Request, res: Response) => {
  const status = (req.query.status as string) || 'pending';
  const allowedStatuses = new Set(['pending', 'on_hold', 'reviewed', 'approved', 'rejected']);
  if (!allowedStatuses.has(status)) {
    throw new AppError(400, 'Invalid status');
  }

  const contentType = req.query.contentType as string | undefined;
  const mediaType = req.query.mediaType as string | undefined;
  const authorHandle = typeof req.query.authorHandle === 'string' ? req.query.authorHandle.trim() : '';
  const where: any = { status };
  if (contentType && (contentType === 'fanart' || contentType === 'official' || contentType === 'cosplay')) {
    where.content_type = contentType;
  }
  if (mediaType && ['image', 'video', 'gif'].includes(mediaType)) {
    where.media_type = mediaType;
  }
  if (authorHandle) {
    where.author_handle = authorHandle;
  }

  const sort = (req.query.sort as string) || 'newest';
  let order: any[];
  switch (sort) {
    case 'oldest':
      order = [['crawled_at', 'ASC']];
      break;
    case 'likes_desc':
      order = [['like_count', 'DESC']];
      break;
    case 'likes_asc':
      order = [['like_count', 'ASC']];
      break;
    case 'views_desc':
      order = [['view_count', 'DESC']];
      break;
    default:
      order = [['crawled_at', 'DESC']];
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;

  const { count, rows } = await StagingFanartModel.findAndCountAll({
    where,
    order,
    limit,
    offset
  });

  res.json({
    success: true,
    data: rows,
    meta: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    }
  });
};

export const listAuthorHandles = async (req: Request, res: Response) => {
  const handles = await StagingFanartModel.findAll({
    attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('author_handle')), 'author_handle']],
    where: { author_handle: { [Op.ne]: null } },
    order: [['author_handle', 'ASC']],
    raw: true,
  }) as unknown as Array<{ author_handle: string | null }>;

  res.json({
    success: true,
    data: handles.map(h => h.author_handle).filter(Boolean)
  });
};

async function promoteStagingFanart(staging: any, options?: { mvs?: unknown; mvId?: string; artistId?: string }) {
  const originalUrl = staging.get('original_url') as string;
  const mediaUrl = staging.get('media_url') as string;
  const r2Url = staging.get('r2_url') as string;
  const mediaType = staging.get('media_type') as string;
  const crawledAt = staging.get('crawled_at') as Date;
  const postDate = staging.get('post_date') as Date;
  const sourceText = staging.get('source_text') as string;
  const likeCount = staging.get('like_count') as number;
  const retweetCount = staging.get('retweet_count') as number;
  const viewCount = staging.get('view_count') as number;
  const hashtags = staging.get('hashtags') as string[];
  const authorName = staging.get('author_name') as any;
  const authorHandle = staging.get('author_handle') as any;
  const retweetedByHandle = staging.get('retweeted_by_handle') as string;
  const mediaWidth = staging.get('media_width') as number;
  const mediaHeight = staging.get('media_height') as number;
  const contentType = (staging.get('content_type') as string) || 'fanart';
  const { mvId, artistId, mvs } = options || {};

  // ── 前置驗證：official 類型必須有 mvId ──
  if (contentType === 'official' && (!mvId || typeof mvId !== 'string')) {
    throw new AppError(400, 'MV_REQUIRED', 'Official 內容必須選擇一個 MV');
  }

  // ── 根據 content_type 決定 R2 路徑 ──
  let r2Folder = 'fanart';
  if (contentType === 'official' && mvId) {
    r2Folder = `mvs/${mvId}`;
  } else if (contentType === 'collaboration') {
    r2Folder = 'collaboration';
  } else if (contentType === 'cosplay') {
    r2Folder = 'cosplay';
  }

  let finalR2Url = r2Url;
  // 確保 R2 URL 有協議頭
  if (finalR2Url && !finalR2Url.startsWith('http')) {
    finalR2Url = `https://${finalR2Url}`;
  }

  let finalThumbnailR2Url = staging.get('thumbnail_url') as string | null;
  if (r2Url && r2Url.includes('crawler/')) {
    const crawlerIndex = r2Url.indexOf('crawler/');
    if (crawlerIndex !== -1) {
      const oldKey = r2Url.substring(crawlerIndex);
      const newKey = `${r2Folder}/${oldKey.split('/').pop()}`;
      const newR2Url = await moveFileInR2(oldKey, newKey);
      
      if (newR2Url) {
        finalR2Url = newR2Url;
        await staging.update({ r2_url: newR2Url });
      }
    }
  } else if (!r2Url) {
    const fetchedMedia = await fetchMediaToBuffer(mediaUrl);
    if (fetchedMedia) {
      const hash = crypto.createHash('sha256').update(mediaUrl).digest('hex').substring(0, 16);
      const fileName = `${r2Folder}/${hash}.${fetchedMedia.ext}`;
      const newR2Url = await uploadBufferToR2(
        fetchedMedia.buffer,
        fileName,
        fetchedMedia.contentType,
        {
          metadata: {
            'original-url': mediaUrl,
            'tweet-id': staging.get('tweet_id') as string,
            source: 'approved_staging'
          }
        }
      );
      if (!newR2Url) {
        throw new AppError(409, 'STAGING_FANART_MEDIA_R2_FAILED', '媒體 R2 上傳失敗，請稍後重試');
      }
      finalR2Url = newR2Url;
      await staging.update({ r2_url: newR2Url });
    } else {
      throw new AppError(409, 'STAGING_FANART_MEDIA_DOWNLOAD_FAILED', '媒體下載失敗，請稍後重試');
    }
  }

  if (mediaType === 'video') {
    const originalThumbnailUrl = (staging.get('original_thumbnail_url') as string) || (staging.get('thumbnail_url') as string) || null;
    if (originalThumbnailUrl) {
      const fetchedThumb = await fetchMediaToBuffer(originalThumbnailUrl);
      if (fetchedThumb) {
        const thumbHash = crypto.createHash('sha256').update(originalThumbnailUrl).digest('hex').substring(0, 16);
        const thumbFileName = `${r2Folder}/videos/thumbs/${thumbHash}.${fetchedThumb.ext}`;
        const thumbR2Url = await uploadBufferToR2(
          fetchedThumb.buffer,
          thumbFileName,
          fetchedThumb.contentType,
          {
            metadata: {
              'original-url': originalThumbnailUrl,
              'tweet-id': staging.get('tweet_id') as string,
              source: 'approved_staging_thumb'
            }
          }
        );
        if (!thumbR2Url) {
          throw new AppError(409, 'STAGING_FANART_THUMB_R2_FAILED', '影片縮圖 R2 上傳失敗，請稍後重試');
        }
        finalThumbnailR2Url = thumbR2Url;
        await staging.update({
          thumbnail_url: thumbR2Url,
          original_thumbnail_url: originalThumbnailUrl,
        });
      } else {
        throw new AppError(409, 'STAGING_FANART_THUMB_DOWNLOAD_FAILED', '影片縮圖下載失敗，請稍後重試');
      }
    }
  }

  const stagingThumbnailUrl = staging.get('thumbnail_url') as any;

  let [group] = await MediaGroupModel.findOrCreate({
    where: { source_url: originalUrl },
    defaults: {
      id: generateShortId(),
      source_url: originalUrl,
      post_date: postDate || crawledAt || new Date(),
      source_text: sourceText || '',
      author_name: authorName || null,
      author_handle: authorHandle || null,
      like_count: likeCount || 0,
      retweet_count: retweetCount || 0,
      view_count: viewCount || 0,
      retweeted_by_handle: retweetedByHandle || null,
      hashtags: hashtags || [],
      status: 'unorganized'
    }
  });

  if ((authorName || authorHandle || retweetedByHandle) && (!group.get('author_name') || !group.get('author_handle') || group.get('retweeted_by_handle') !== retweetedByHandle)) {
    const updateData: any = {};
    if (authorName && !group.get('author_name')) updateData.author_name = authorName;
    if (authorHandle && !group.get('author_handle')) updateData.author_handle = authorHandle;
    if (retweetedByHandle && group.get('retweeted_by_handle') !== retweetedByHandle) updateData.retweeted_by_handle = retweetedByHandle;
    if (Object.keys(updateData).length > 0) await group.update(updateData);
  }

  const allowedTags = new Set(['tag:collab', 'tag:acane', 'tag:real', 'tag:uniguri', 'tag:other']);
  const rawMvs = Array.isArray(mvs) ? mvs : [];
  const mvIds = rawMvs.filter((v: any) => typeof v === 'string' && !v.startsWith('tag:'));
  const tags = Array.from(
    new Set(
      rawMvs
        .filter((v: any) => typeof v === 'string' && v.startsWith('tag:') && allowedTags.has(v))
        .map((v: string) => v)
    )
  );

  let existingMedia = await MediaModel.findOne({ where: { original_url: mediaUrl } });
  if (!existingMedia) {
    existingMedia = await MediaModel.create({
      id: generateShortId(),
      type: contentType,
      media_type: mediaType || 'image',
      url: contentType === 'collaboration' ? mediaUrl : (finalR2Url || mediaUrl),
      original_url: mediaUrl,
      thumbnail_url: mediaType === 'video' ? (finalThumbnailR2Url || null) : null,
      original_thumbnail_url: mediaType === 'video' ? (staging.get('original_thumbnail_url') as string || stagingThumbnailUrl || null) : null,
      width: mediaWidth || null,
      height: mediaHeight || null,
      tags,
      group_id: group.get('id')
    });
  } else {
    const currentTags = existingMedia.get('tags') as any;
    const nextTags = Array.from(
      new Set([...(Array.isArray(currentTags) ? currentTags : []), ...tags])
    );
    const updateData: any = { tags: nextTags, type: contentType };
    if (mediaType === 'video' && stagingThumbnailUrl && !existingMedia.get('thumbnail_url')) {
      updateData.thumbnail_url = stagingThumbnailUrl;
    }
    if (mediaType === 'video' && (staging.get('original_thumbnail_url') as string) && !existingMedia.get('original_thumbnail_url')) {
      updateData.original_thumbnail_url = staging.get('original_thumbnail_url') as string;
    }
    await existingMedia.update(updateData);
  }

  const mediaId = existingMedia.get('id') as string;

  // ── 依 content_type 分流關聯邏輯 ──
  if (contentType === 'official') {
    // official：單選 MV（已於函數開頭驗證 mvId 必填）
    await MVMediaModel.findOrCreate({
      where: { mv_id: mvId, media_id: mediaId },
      defaults: { mv_id: mvId, media_id: mediaId, usage: 'gallery', order_index: 0 }
    });
    mvService.clearCache();

  } else if (contentType === 'collaboration') {
    // collaboration：優先用手動選擇的 artistId，否則自動匹配
    let artist: any = null;
    if (artistId) {
      artist = await ArtistModel.findByPk(artistId);
    }
    if (!artist) {
      const handle = (authorHandle as string || '').toLowerCase();
      if (handle) {
        artist = await ArtistModel.findOne({ where: { twitter: { [Op.iLike]: handle } } });
      }
    }
    if (artist) {
      const aId = artist.get('id') as string;
      await ArtistMediaModel.findOrCreate({
        where: { artist_id: aId, media_id: mediaId },
        defaults: { artist_id: aId, media_id: mediaId }
      });
      logger.info(`[promote] collaboration linked artist "${artist.get('name')}" → media ${mediaId}`);
    } else {
      logger.warn(`[promote] collaboration: no artist found, media ${mediaId} created without artist link`);
    }

  } else {
    // fanart / cosplay：多選 MV（可選）
    if (mvIds.length > 0) {
      for (const id of mvIds) {
        await MVMediaModel.findOrCreate({
          where: { mv_id: id, media_id: mediaId },
          defaults: { mv_id: id, media_id: mediaId, usage: 'gallery', order_index: 0 }
        });
      }
      mvService.clearCache();
    }
  }

  if ((contentType === 'official' || mvIds.length > 0 || tags.length > 0) && group.get('status') === 'unorganized') {
    await group.update({ status: 'organized' });
  }

  await staging.update({ status: 'approved' });
}

export const approveStagingFanart = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { mvs, mvId, artistId } = req.body;
  const staging = await StagingFanartModel.findByPk(id);

  if (!staging) {
    throw new AppError(404, 'STAGING_FANART_NOT_FOUND', 'Staging fanart not found');
  }

  const currentStatus = String(staging.get('status'));
  if (currentStatus === 'approved') {
    res.json({
      success: true,
      message: 'Already approved',
      data: { id, action: 'approve', status: currentStatus, changed: false, alreadyProcessed: true },
    });
    return;
  }

  if (!['pending', 'on_hold', 'reviewed'].includes(currentStatus)) {
    throw new AppError(400, 'Only pending, on-hold, or reviewed fanarts can be approved');
  }

  await promoteStagingFanart(staging, { mvs, mvId, artistId });

  res.json({
    success: true,
    message: 'Approved and moved to MediaGroup successfully',
    data: { id, action: 'approve', status: 'approved', changed: true, alreadyProcessed: false },
  });
};

export const rejectStagingFanart = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await applyStagingReviewAction(id, 'reject');
  res.json({ success: true, message: result.alreadyProcessed ? 'Already rejected' : 'Rejected successfully', data: result });
};

export const holdStagingFanart = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await applyStagingReviewAction(id, 'hold');
  res.json({ success: true, message: result.alreadyProcessed ? 'Already on hold' : 'Put on hold successfully', data: result });
};

export const reparseStagingFanart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const record = await StagingFanartModel.findByPk(id);
    if (!record) {
      res.status(404).json({ success: false, error: 'NOT_FOUND' });
      return;
    }

    const originalUrl = String(record.get('original_url') || '');
    if (!originalUrl) {
      res.status(400).json({ success: false, error: 'NO_URL' });
      return;
    }

    const { TwitterService } = await import('../services/twitter.service.js');
    const mediaList = await TwitterService.extractMediaFromTweet(originalUrl, undefined, { fetch: globalThis.fetch });

    if (!mediaList || mediaList.length === 0) {
      res.status(422).json({ success: false, error: 'EXTRACT_FAILED' });
      return;
    }

    const firstMedia = mediaList[0];
    const newTweetId = firstMedia.tweet_id || '';
    const newAuthorHandle = firstMedia.user_screen_name || '';
    const newAuthorName = firstMedia.user_name || '';
    const newMediaUrl = firstMedia.url || '';
    const newThumbnail = firstMedia.thumbnail || null;

    const update: Record<string, unknown> = {};
    const setIfChanged = (field: string, value: unknown) => {
      if (String(record.get(field) ?? '') !== String(value ?? '')) {
        update[field] = value;
      }
    };

    if (newTweetId && newTweetId !== String(record.get('tweet_id') || '')) {
      update.tweet_id = newTweetId;
      const handleForUrl = newAuthorHandle || String(record.get('author_handle') || '');
      update.original_url = handleForUrl
        ? `https://x.com/${handleForUrl}/status/${newTweetId}`
        : `https://x.com/i/status/${newTweetId}`;
    }
    if (newAuthorHandle) setIfChanged('author_handle', newAuthorHandle);
    if (newAuthorName) setIfChanged('author_name', newAuthorName);
    if (newMediaUrl) setIfChanged('media_url', newMediaUrl);
    if (newThumbnail) {
      setIfChanged('thumbnail_url', newThumbnail);
      setIfChanged('original_thumbnail_url', newThumbnail);
    }
    if (firstMedia.like_count !== undefined && firstMedia.like_count !== null) setIfChanged('like_count', firstMedia.like_count);
    if (firstMedia.retweet_count !== undefined && firstMedia.retweet_count !== null) setIfChanged('retweet_count', firstMedia.retweet_count);
    if (firstMedia.view_count !== undefined && firstMedia.view_count !== null) setIfChanged('view_count', firstMedia.view_count);

    if (Object.keys(update).length === 0) {
      res.json({ success: true, data: record, message: 'NO_CHANGES' });
      return;
    }

    await record.update(update);

    const updated = await StagingFanartModel.findByPk(id);
    res.json({ success: true, data: updated, updatedFields: Object.keys(update) });
  } catch (error) {
    next(error);
  }
};

export async function applyStagingReviewAction(id: string, action: StagingReviewAction) {
  const staging = await StagingFanartModel.findByPk(id);

  if (!staging) {
    throw new AppError(404, 'STAGING_FANART_NOT_FOUND', 'Staging fanart not found');
  }

  const currentStatus = String(staging.get('status')) as StagingStatus;
  let changed = false;
  let alreadyProcessed = false;

  if (action === 'hold') {
    if (currentStatus === 'on_hold') {
      alreadyProcessed = true;
    } else if (currentStatus === 'pending' || currentStatus === 'reviewed') {
      await staging.update({ status: 'on_hold' });
      changed = true;
    } else {
      throw new AppError(409, 'INVALID_REVIEW_STATE_TRANSITION', 'Invalid review state transition');
    }
  } else if (action === 'reject') {
    if (currentStatus === 'rejected') {
      alreadyProcessed = true;
    } else if (currentStatus === 'pending' || currentStatus === 'on_hold' || currentStatus === 'reviewed') {
      await staging.update({ status: 'rejected' });
      changed = true;
    } else {
      throw new AppError(409, 'INVALID_REVIEW_STATE_TRANSITION', 'Invalid review state transition');
    }
  } else if (action === 'approve') {
    if (currentStatus === 'approved' || currentStatus === 'reviewed') {
      alreadyProcessed = true;
    } else if (currentStatus === 'pending' || currentStatus === 'on_hold') {
      await staging.update({ status: 'reviewed' });
      changed = true;
    } else {
      throw new AppError(409, 'INVALID_REVIEW_STATE_TRANSITION', 'Invalid review state transition');
    }
  } else {
    throw new AppError(400, 'INVALID_REVIEW_ACTION', 'Invalid action');
  }

  await staging.reload();

  return {
    id,
    action,
    status: staging.get('status'),
    changed,
    alreadyProcessed,
  };
}

export const restoreStagingFanart = async (req: Request, res: Response) => {
  const { id } = req.params;
  const staging = await StagingFanartModel.findByPk(id);

  if (!staging) {
    throw new AppError(404, 'STAGING_FANART_NOT_FOUND', 'Staging fanart not found');
  }

  if (!['rejected', 'on_hold'].includes(String(staging.get('status')))) {
    throw new AppError(400, 'Only rejected or on-hold fanarts can be restored');
  }

  await staging.update({ status: 'pending' });
  res.json({ success: true, message: 'Restored to pending successfully' });
};

export const batchRestoreStagingFanarts = async (req: Request, res: Response) => {
  const rawIds = (req.body as any)?.ids;
  const ids = Array.isArray(rawIds) ? rawIds.filter((v: any) => typeof v === 'string' && v.trim()) : [];
  const rawStatuses = (req.body as any)?.statuses;
  const requestedStatuses = Array.isArray(rawStatuses)
    ? rawStatuses.filter((v: any) => v === 'rejected' || v === 'on_hold')
    : [];
  const statuses = requestedStatuses.length > 0 ? requestedStatuses : ['rejected', 'on_hold'];

  if (ids.length === 0) {
    throw new AppError(400, 'ids is required');
  }

  const [updatedCount] = await StagingFanartModel.update(
    { status: 'pending' },
    { where: { id: { [Op.in]: ids }, status: { [Op.in]: statuses } } }
  );

  res.json({
    success: true,
    message: `Restored ${updatedCount} items`,
    data: { updatedCount }
  });
};

export const updateStagingContentType = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content_type } = req.body;

  if (!content_type || !['fanart', 'official', 'collaboration', 'cosplay'].includes(content_type)) {
    throw new AppError(400, 'INVALID_CONTENT_TYPE', 'content_type must be fanart, official, collaboration, or cosplay');
  }

  const staging = await StagingFanartModel.findByPk(id);
  if (!staging) {
    throw new AppError(404, 'STAGING_FANART_NOT_FOUND', 'Staging fanart not found');
  }

  await staging.update({ content_type });
  res.json({ success: true, data: { id, content_type } });
};

export const lookupArtistByHandle = async (req: Request, res: Response) => {
  const handle = (req.query.handle as string || '').toLowerCase().replace(/^@/, '');
  if (!handle) {
    res.json({ success: true, data: null });
    return;
  }

  const artist = await ArtistModel.findOne({ where: { twitter: { [Op.iLike]: handle } } });
  if (artist) {
    res.json({
      success: true,
      data: { id: artist.get('id'), name: artist.get('name'), twitter: artist.get('twitter') }
    });
  } else {
    res.json({ success: true, data: null });
  }
};

export const listArtists = async (req: Request, res: Response) => {
  const artists = await ArtistModel.findAll({ order: [['name', 'ASC']] });
  res.json({
    success: true,
    data: artists.map(a => ({ id: a.get('id'), name: a.get('name'), twitter: a.get('twitter') }))
  });
};
