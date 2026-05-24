import { Request, Response } from 'express';
import { StagingFanartModel, MediaGroupModel, MediaModel, MVMediaModel, ArtistModel, ArtistMediaModel } from '../models/index.js';
import { TwitterService } from '../services/twitter.service.js';
import { MVService } from '../services/mv.service.js';
import { moveFileInR2, uploadBufferToR2 } from '../services/r2.service.js';
import { extractTweetId } from '../services/twitter.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { nanoid } from 'nanoid';
import { Op } from 'sequelize';
import crypto from 'crypto';

const mvService = new MVService();
const generateShortId = () => nanoid(16);

// ── 速率保護：每 IP 3 秒 cooldown ──
const lastParseTime = new Map<string, number>();
const PARSE_COOLDOWN_MS = 3000;

// ── parse-tweet ──
export const parseTweet = async (req: Request, res: Response) => {
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  if (!url) {
    throw new AppError(400, 'URL_REQUIRED', '推文網址為必填');
  }

  const tweetId = extractTweetId(url);
  if (!tweetId) {
    throw new AppError(400, 'INVALID_URL', '無效的推文網址格式');
  }

  // 速率保護
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const lastTime = lastParseTime.get(clientIp) || 0;
  if (now - lastTime < PARSE_COOLDOWN_MS) {
    throw new AppError(429, 'COOLDOWN', `請求過於頻繁，請 ${PARSE_COOLDOWN_MS / 1000} 秒後再試`);
  }
  lastParseTime.set(clientIp, now);

  // 呼叫現有的 Twitter 解析邏輯
  const mediaList = await TwitterService.extractMediaFromTweet(url);
  if (mediaList.length === 0) {
    throw new AppError(404, 'NO_MEDIA', '此推文未找到任何媒體');
  }

  const first = mediaList[0];

  // 檢查 staging 是否已存在
  const existingMediaUrls = mediaList.map(m => m.url);
  const existingStaging = await StagingFanartModel.findAll({
    where: { media_url: { [Op.in]: existingMediaUrls } },
    attributes: ['id', 'media_url', 'status'],
  });

  const existingMap = new Map(
    existingStaging.map((s: any) => [s.getDataValue('media_url'), {
      id: s.getDataValue('id'),
      status: s.getDataValue('status'),
    }])
  );

  res.json({
    success: true,
    data: {
      tweet_id: tweetId,
      author_name: first.user_name || null,
      author_handle: first.user_screen_name || null,
      text: first.text || null,
      date: first.date || null,
      hashtags: first.hashtags || [],
      like_count: first.like_count,
      retweet_count: first.retweet_count,
      view_count: first.view_count,
      media: mediaList.map(m => ({
        url: m.url,
        type: m.type === 'photo' ? 'image' : (m.type || 'image'),
        thumbnail: m.thumbnail || null,
        width: (m as any).width || null,
        height: (m as any).height || null,
        tweet_id: m.tweet_id || tweetId,
        already_exists: existingMap.has(m.url),
        existing_status: existingMap.get(m.url)?.status || null,
      })),
    },
  });
};

// ── submit ──
export const submitFromShortcut = async (req: Request, res: Response) => {
  const { url, content_type, assignments } = req.body || {};

  if (!url || typeof url !== 'string') {
    throw new AppError(400, 'URL_REQUIRED', '推文網址為必填');
  }

  const validContentTypes = ['fanart', 'official', 'collaboration', 'cosplay'];
  const ct = typeof content_type === 'string' ? content_type.trim() : 'fanart';
  if (!validContentTypes.includes(ct)) {
    throw new AppError(400, 'INVALID_CONTENT_TYPE', `content_type 必須是 ${validContentTypes.join(' / ')}`);
  }

  if (!Array.isArray(assignments) || assignments.length === 0) {
    throw new AppError(400, 'ASSIGNMENTS_REQUIRED', '至少需要一筆媒體作業');
  }

  const tweetId = extractTweetId(url);
  if (!tweetId) {
    throw new AppError(400, 'INVALID_URL', '無效的推文網址格式');
  }

  // 過濾掉 skip 的項目
  const activeAssignments = assignments.filter((a: any) => a && !a.skip && a.media_url);
  if (activeAssignments.length === 0) {
    throw new AppError(400, 'ALL_SKIPPED', '所有媒體都被跳過，沒有可提交的項目');
  }

  // 先解析推文取得完整媒體資訊
  const mediaList = await TwitterService.extractMediaFromTweet(url);
  const mediaMap = new Map(mediaList.map(m => [m.url, m]));

  const results: Array<{ media_url: string; media_id?: string; error?: string }> = [];
  const createdMediaIds: string[] = [];
  let group: any = null;

  // 確保同一推文共用一個 MediaGroup
  const originalUrl = `https://x.com/i/status/${tweetId}`;
  const firstMedia = mediaList[0];

  for (const assignment of activeAssignments) {
    const mediaUrl = assignment.media_url;
    const mvId = typeof assignment.mv_id === 'string' ? assignment.mv_id.trim() || null : null;
    const artistId = typeof assignment.artist_id === 'string' ? assignment.artist_id.trim() || null : null;
    const tag = typeof assignment.tag === 'string' ? assignment.tag.trim() || null : null;

    try {
      // 從解析結果取得媒體資訊
      const mediaInfo = mediaMap.get(mediaUrl);
      if (!mediaInfo) {
        results.push({ media_url: mediaUrl, error: '此媒體不在推文解析結果中' });
        continue;
      }

      const mediaType = mediaInfo.type === 'photo' ? 'image' : (mediaInfo.type || 'image');

      // 建立或取得 MediaGroup（同一推文共用）
      if (!group) {
        [group] = await MediaGroupModel.findOrCreate({
          where: { source_url: originalUrl },
          defaults: {
            id: generateShortId(),
            source_url: originalUrl,
            post_date: firstMedia.date ? new Date(firstMedia.date) : new Date(),
            source_text: firstMedia.text || '',
            author_name: firstMedia.user_name || null,
            author_handle: firstMedia.user_screen_name || null,
            like_count: firstMedia.like_count || 0,
            retweet_count: firstMedia.retweet_count || 0,
            view_count: firstMedia.view_count || 0,
            hashtags: firstMedia.hashtags || [],
            status: 'unorganized',
          },
        });
      }

      // ── R2 上傳 ──
      let r2Folder = 'fanart';
      if (ct === 'official' && mvId) r2Folder = `mvs/${mvId}`;
      else if (ct === 'collaboration') r2Folder = 'collaboration';
      else if (ct === 'cosplay') r2Folder = 'cosplay';

      // 下載媒體
      let finalR2Url: string | null = null;
      let fetchUrl = mediaUrl;
      if (fetchUrl.includes('pbs.twimg.com')) {
        fetchUrl = fetchUrl.replace(/&name=[a-z0-9]+/i, '');
        fetchUrl = fetchUrl.replace(/\?name=[a-z0-9]+/i, '?');
        fetchUrl = fetchUrl.includes('?') ? `${fetchUrl}&name=orig` : `${fetchUrl}?name=orig`;
        fetchUrl = fetchUrl.replace('?&', '?');
      }

      const fetchRes = await fetch(fetchUrl);
      if (!fetchRes.ok) {
        results.push({ media_url: mediaUrl, error: `媒體下載失敗 (${fetchRes.status})` });
        continue;
      }

      const arrayBuffer = await fetchRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentTypeHeader = fetchRes.headers.get('content-type') || 'application/octet-stream';
      const extMatch = mediaUrl.match(/\.(jpg|jpeg|png|gif|webp|avif|mp4|m4v|mov)/i);
      let ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
      if (mediaUrl.includes('format=png')) ext = 'png';
      if (mediaUrl.includes('format=webp')) ext = 'webp';

      const hash = crypto.createHash('sha256').update(mediaUrl).digest('hex').substring(0, 16);
      const fileName = `${r2Folder}/${hash}.${ext}`;
      const r2Url = await uploadBufferToR2(buffer, fileName, contentTypeHeader, {
        metadata: { 'original-url': mediaUrl, 'tweet-id': tweetId, source: 'shortcut' },
      });

      if (!r2Url) {
        results.push({ media_url: mediaUrl, error: 'R2 上傳失敗' });
        continue;
      }
      finalR2Url = r2Url;

      // 影片縮圖處理
      let thumbnailR2Url: string | null = null;
      if (mediaType === 'video' && mediaInfo.thumbnail) {
        const thumbRes = await fetch(mediaInfo.thumbnail);
        if (thumbRes.ok) {
          const thumbBuf = Buffer.from(await thumbRes.arrayBuffer());
          const thumbContentType = thumbRes.headers.get('content-type') || 'image/jpeg';
          const thumbHash = crypto.createHash('sha256').update(mediaInfo.thumbnail).digest('hex').substring(0, 16);
          const thumbFileName = `${r2Folder}/videos/thumbs/${thumbHash}.jpg`;
          thumbnailR2Url = await uploadBufferToR2(thumbBuf, thumbFileName, thumbContentType, {
            metadata: { source: 'shortcut_thumb' },
          });
        }
      }

      // ── 建立 Media ──
      const tags = tag ? [tag] : [];
      let existingMedia = await MediaModel.findOne({ where: { original_url: mediaUrl } });
      if (!existingMedia) {
        existingMedia = await MediaModel.create({
          id: generateShortId(),
          type: ct,
          media_type: mediaType,
          url: ct === 'collaboration' ? mediaUrl : (finalR2Url || mediaUrl),
          original_url: mediaUrl,
          thumbnail_url: mediaType === 'video' ? thumbnailR2Url : null,
          width: (mediaInfo as any).width || null,
          height: (mediaInfo as any).height || null,
          tags,
          group_id: group.getDataValue('id'),
        });
      } else {
        await existingMedia.update({ type: ct, tags });
      }

      const mediaId = existingMedia.getDataValue('id') as string;
      createdMediaIds.push(mediaId);

      // ── 依 content_type 分流關聯 ──
      if (ct === 'official' && mvId) {
        await MVMediaModel.findOrCreate({
          where: { mv_id: mvId, media_id: mediaId },
          defaults: { mv_id: mvId, media_id: mediaId, usage: 'gallery', order_index: 0 },
        });
        mvService.clearCache();
      } else if (ct === 'collaboration') {
        let artist: any = null;
        if (artistId) {
          artist = await ArtistModel.findByPk(artistId);
        }
        if (!artist && firstMedia.user_screen_name) {
          artist = await ArtistModel.findOne({
            where: { twitter: { [Op.iLike]: firstMedia.user_screen_name } } as any,
          });
        }
        if (artist) {
          await ArtistMediaModel.findOrCreate({
            where: { artist_id: artist.getDataValue('id'), media_id: mediaId },
            defaults: { artist_id: artist.getDataValue('id'), media_id: mediaId },
          });
        }
      } else if (ct === 'fanart' || ct === 'cosplay') {
        // fanart/cosplay 可選掛 MV
        if (mvId) {
          await MVMediaModel.findOrCreate({
            where: { mv_id: mvId, media_id: mediaId },
            defaults: { mv_id: mvId, media_id: mediaId, usage: 'gallery', order_index: 0 },
          });
          mvService.clearCache();
        }
      }

      results.push({ media_url: mediaUrl, media_id: mediaId });
    } catch (err: any) {
      logger.error({ err, mediaUrl }, '[Shortcut] 單筆媒體處理失敗');
      results.push({ media_url: mediaUrl, error: err.message || '處理失敗' });
    }
  }

  const hasErrors = results.some(r => r.error);
  res.status(hasErrors && createdMediaIds.length === 0 ? 500 : 200).json({
    success: createdMediaIds.length > 0,
    data: {
      group_id: group?.getDataValue('id') || null,
      media_ids: createdMediaIds,
      results,
    },
  });
};

// ── 取得 MV 列表（供 Shortcut 選擇用）──
export const listMvsForShortcut = async (_req: Request, res: Response) => {
  const mvs = await mvService.getAllMVs({});
  res.json({
    success: true,
    data: mvs.map((mv: any) => ({
      id: mv.id,
      title: mv.title,
      cover_image_url: mv.cover_image_url || null,
    })),
  });
};

// ── 取得 Artist 列表（供 Shortcut 選擇用）──
export const listArtistsForShortcut = async (_req: Request, res: Response) => {
  const artists = await ArtistModel.findAll({
    attributes: ['id', 'name', 'twitter'],
    order: [['name', 'ASC']],
  });
  res.json({
    success: true,
    data: artists.map((a: any) => ({
      id: a.getDataValue('id'),
      name: a.getDataValue('name'),
      twitter: a.getDataValue('twitter'),
    })),
  });
};
