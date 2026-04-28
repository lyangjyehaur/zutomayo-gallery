import { Request, Response } from 'express';
import { StagingFanartModel, MediaGroupModel, MediaModel, CrawlerStateModel, MVMediaModel } from '../models/index.js';
import { MVService } from '../services/mv.service.js';
import { nanoid } from 'nanoid';
import { Sequelize } from 'sequelize';
import { runCrawler } from '../scripts/fetch-zutomayo-art-tweets.js';
import { moveFileInR2, uploadBufferToR2 } from '../services/r2.service.js';
import crypto from 'crypto';

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
  try {
    const searchTerms = req.body.searchTerms as string | undefined;
    const startDate = req.body.startDate as string | undefined;
    const endDate = req.body.endDate as string | undefined;
    const maxItems = req.body.maxItems ? parseInt(req.body.maxItems as string, 10) : undefined;

    if (!searchTerms || typeof searchTerms !== 'string' || !searchTerms.trim()) {
      res.status(400).json({ success: false, error: 'searchTerms is required' });
      return;
    }

    if (!startDate || !endDate) {
      res.status(400).json({ success: false, error: 'startDate and endDate are required' });
      return;
    }
    
    runCrawler(searchTerms, startDate, endDate, maxItems).catch(err => {
      console.error(`[Crawler Error] Background crawler failed:`, err);
    });

    res.json({
      success: true,
      message: 'Crawler started in background',
      searchTerms,
      startDate,
      endDate,
      maxItems
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getProgress = async (req: Request, res: Response) => {
  try {
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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getPendingStagingFanarts = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const { count, rows } = await StagingFanartModel.findAndCountAll({
      where: { status: 'pending' },
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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const approveStagingFanart = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { mvs } = req.body;
    const staging = await StagingFanartModel.findByPk(id);

    if (!staging) {
      return res.status(404).json({ success: false, error: 'Staging fanart not found' });
    }

    if (staging.get('status') !== 'pending') {
      return res.status(400).json({ success: false, error: 'Only pending fanarts can be approved' });
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
      console.log(`[Approve] 正在從 Twitter 下載媒體: ${mediaUrl}`);
      const fetchedMedia = await fetchMediaToBuffer(mediaUrl);
      if (fetchedMedia) {
        const hash = crypto.createHash('md5').update(mediaUrl).digest('hex');
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
          console.error(`[Approve] R2 上傳失敗: ${mediaUrl}`);
        }
      } else {
        console.error(`[Approve] 媒體下載失敗: ${mediaUrl}`);
      }
    }

    let [group] = await MediaGroupModel.findOrCreate({
      where: { source_url: originalUrl },
      defaults: {
        id: generateShortId(),
        source_url: originalUrl,
        post_date: postDate || crawledAt || new Date(),
        source_text: sourceText || '',
        like_count: likeCount || 0,
        retweet_count: retweetCount || 0,
        view_count: viewCount || 0,
        hashtags: hashtags || [],
        status: 'unorganized'
      }
    });

    let existingMedia = await MediaModel.findOne({ where: { original_url: mediaUrl } });
    if (!existingMedia) {
      existingMedia = await MediaModel.create({
        id: generateShortId(),
        type: 'fanart',
        media_type: mediaType || 'image',
        url: finalR2Url || mediaUrl,
        original_url: mediaUrl,
        width: mediaWidth || null,
        height: mediaHeight || null,
        group_id: group.get('id')
      });
    }

    if (mvs && Array.isArray(mvs) && mvs.length > 0) {
      for (const mvId of mvs) {
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
      
      // 有關聯 MV，清除 MV 緩存
      const mvService = new MVService();
      mvService.clearCache();
    }

    await staging.update({ status: 'approved' });

    res.json({ success: true, message: 'Approved and moved to MediaGroup successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const rejectStagingFanart = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const staging = await StagingFanartModel.findByPk(id);

    if (!staging) {
      return res.status(404).json({ success: false, error: 'Staging fanart not found' });
    }

    await staging.update({ status: 'rejected' });

    res.json({ success: true, message: 'Rejected successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
