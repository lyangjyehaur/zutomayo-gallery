import { Request, Response } from 'express';
import { StagingFanartModel, MediaGroupModel, MediaModel, CrawlerStateModel, MVMediaModel } from '../models/index.js';
import { MVService } from '../services/mv.service.js';
import { nanoid } from 'nanoid';
import { Op, Sequelize } from 'sequelize';
import { runCrawler } from '../scripts/fetch-zutomayo-art-tweets.js';
import { moveFileInR2, uploadBufferToR2 } from '../services/r2.service.js';
import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const mvService = new MVService();

const generateShortId = () => nanoid(16);

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

  if (!searchTerms || typeof searchTerms !== 'string' || !searchTerms.trim()) {
    throw new AppError(400, 'searchTerms is required');
  }

  if (!startDate || !endDate) {
    throw new AppError(400, 'startDate and endDate are required');
  }
  
  runCrawler(searchTerms, startDate, endDate, maxItems).catch(err => {
    logger.error({ err }, '[Crawler Error] Background crawler failed');
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
  const allowedStatuses = new Set(['pending', 'approved', 'rejected']);
  if (!allowedStatuses.has(status)) {
    throw new AppError(400, 'Invalid status');
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;

  const { count, rows } = await StagingFanartModel.findAndCountAll({
    where: { status },
    order: [['crawled_at', 'DESC'], ['created_at', 'DESC']],
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

export const approveStagingFanart = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { mvs } = req.body;
  const staging = await StagingFanartModel.findByPk(id);

  if (!staging) {
    throw new AppError(404, 'Staging fanart not found');
  }

  if (staging.get('status') !== 'pending') {
    throw new AppError(400, 'Only pending fanarts can be approved');
  }

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
  const mediaWidth = staging.get('media_width') as number;
  const mediaHeight = staging.get('media_height') as number;

  let finalR2Url = r2Url;
  if (r2Url && r2Url.includes('crawler/')) {
    const crawlerIndex = r2Url.indexOf('crawler/');
    if (crawlerIndex !== -1) {
      const oldKey = r2Url.substring(crawlerIndex);
      const newKey = `fanart/${oldKey.split('/').pop()}`;
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
      const fileName = `fanart/${hash}.${fetchedMedia.ext}`;
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
      if (newR2Url) {
        finalR2Url = newR2Url;
        await staging.update({ r2_url: newR2Url });
      } else {
        logger.error({ mediaUrl }, '[Approve] R2 upload failed');
      }
    } else {
      logger.error({ mediaUrl }, '[Approve] Media download failed');
    }
  }

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
      hashtags: hashtags || [],
      status: 'unorganized'
    }
  });

  if ((authorName || authorHandle) && (!group.get('author_name') || !group.get('author_handle'))) {
    const updateData: any = {};
    if (authorName && !group.get('author_name')) updateData.author_name = authorName;
    if (authorHandle && !group.get('author_handle')) updateData.author_handle = authorHandle;
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

  const stagingThumbnailUrl = staging.get('thumbnail_url') as any;

  let existingMedia = await MediaModel.findOne({ where: { original_url: mediaUrl } });
  if (!existingMedia) {
    existingMedia = await MediaModel.create({
      id: generateShortId(),
      type: 'fanart',
      media_type: mediaType || 'image',
      url: finalR2Url || mediaUrl,
      original_url: mediaUrl,
      thumbnail_url: mediaType === 'video' ? (stagingThumbnailUrl || null) : null,
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
    const updateData: any = { tags: nextTags };
    if (mediaType === 'video' && stagingThumbnailUrl && !existingMedia.get('thumbnail_url')) {
      updateData.thumbnail_url = stagingThumbnailUrl;
    }
    await existingMedia.update(updateData);
  }

  if (mvIds.length > 0) {
    for (const mvId of mvIds) {
      await MVMediaModel.findOrCreate({
        where: { mv_id: mvId, media_id: existingMedia.get('id') },
        defaults: {
          mv_id: mvId,
          media_id: existingMedia.get('id'),
          usage: 'gallery',
          order_index: 0
        }
      });
    }
    
    mvService.clearCache();
  }

  if ((mvIds.length > 0 || tags.length > 0) && group.get('status') === 'unorganized') {
    await group.update({ status: 'organized' });
  }

  await staging.update({ status: 'approved' });

  res.json({ success: true, message: 'Approved and moved to MediaGroup successfully' });
};

export const rejectStagingFanart = async (req: Request, res: Response) => {
  const { id } = req.params;
  const staging = await StagingFanartModel.findByPk(id);

  if (!staging) {
    throw new AppError(404, 'Staging fanart not found');
  }

  if (staging.get('status') !== 'pending') {
    throw new AppError(400, 'Only pending fanarts can be rejected');
  }

  await staging.update({ status: 'rejected' });

  res.json({ success: true, message: 'Rejected successfully' });
};

export const restoreStagingFanart = async (req: Request, res: Response) => {
  const { id } = req.params;
  const staging = await StagingFanartModel.findByPk(id);

  if (!staging) {
    throw new AppError(404, 'Staging fanart not found');
  }

  if (staging.get('status') !== 'rejected') {
    throw new AppError(400, 'Only rejected fanarts can be restored');
  }

  await staging.update({ status: 'pending' });
  res.json({ success: true, message: 'Restored to pending successfully' });
};

export const batchRestoreStagingFanarts = async (req: Request, res: Response) => {
  const rawIds = (req.body as any)?.ids;
  const ids = Array.isArray(rawIds) ? rawIds.filter((v: any) => typeof v === 'string' && v.trim()) : [];

  if (ids.length === 0) {
    throw new AppError(400, 'ids is required');
  }

  const [updatedCount] = await StagingFanartModel.update(
    { status: 'pending' },
    { where: { id: { [Op.in]: ids }, status: 'rejected' } }
  );

  res.json({
    success: true,
    message: `Restored ${updatedCount} items`,
    data: { updatedCount }
  });
};
