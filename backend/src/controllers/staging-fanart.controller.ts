import { Request, Response } from 'express';
import { StagingFanartModel, MediaGroupModel, MediaModel, CrawlerStateModel } from '../models/index.js';
import { nanoid } from 'nanoid';
import { Sequelize } from 'sequelize';
import { runCrawler } from '../scripts/fetch-zutomayo-art-tweets.js';
import { moveFileInR2 } from '../services/r2.service.js';

const generateShortId = () => nanoid(16);

export const triggerCrawler = async (req: Request, res: Response) => {
  try {
    const username = req.body.username || 'zutomayo_art';
    const month = req.body.month;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const maxItems = req.body.maxItems;
    
    // 背景執行，不 await
    runCrawler(username, month, startDate, endDate, maxItems).catch(err => {
      console.error(`[Crawler Error] Background crawler failed for ${username}:`, err);
    });

    res.json({
      success: true,
      message: 'Crawler started in background',
      username,
      month,
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
    const username = (req.query.username as string) || 'zutomayo_art';
    let syncProgress = null;
    
    const crawlerState = await CrawlerStateModel.findOne({ where: { username } });
    if (crawlerState) {
      syncProgress = {
        total_crawled: crawlerState.getDataValue('total_crawled'),
        pagination_token: crawlerState.getDataValue('pagination_token'),
        status: crawlerState.getDataValue('status'),
        current_run_processed: crawlerState.getDataValue('current_run_processed'),
        current_run_total: crawlerState.getDataValue('current_run_total'),
        last_crawled_month: crawlerState.getDataValue('last_crawled_month')
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
    }

    // Find or create MediaGroup
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

    // Create Media if not exists
    const existingMedia = await MediaModel.findOne({ where: { original_url: mediaUrl } });
    if (!existingMedia) {
      await MediaModel.create({
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

    // Update staging status
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
