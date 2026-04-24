import cron from 'node-cron';
import Parser from 'rss-parser';
import { MediaGroupModel, MediaModel, SysConfigModel } from '../models/index.js';
import { nanoid } from 'nanoid';
const generateShortId = () => nanoid(16);
import { TwitterService } from './twitter.service.js';
import { backupImageToR2 } from './r2.service.js';
import fetch from 'node-fetch';

const parser = new Parser();

export const TwitterMonitorService = {
  start: () => {
    // 讀取環境變數
    const TWITTER_RSS_URL = process.env.TWITTER_RSS_URL;
    const BARK_URL = process.env.BARK_URL; // 例如: https://api.day.app/YOUR_KEY
    const CRON_SCHEDULE = process.env.TWITTER_MONITOR_CRON || '0 * * * *'; // 預設每小時執行一次

    if (!TWITTER_RSS_URL) {
      console.log('[Twitter Monitor] TWITTER_RSS_URL is not set. Monitor disabled.');
      return;
    }

    console.log(`[Twitter Monitor] Started. Cron: ${CRON_SCHEDULE}, RSS: ${TWITTER_RSS_URL}`);

    cron.schedule(CRON_SCHEDULE, async () => {
      console.log('[Twitter Monitor] Running check...');
      try {
        const feed = await parser.parseURL(TWITTER_RSS_URL);

        for (const item of feed.items) {
          // 確保是推文網址
          if (!item.link) continue;
          
          // 檢查是否已經處理過
          const existing = await MediaGroupModel.findOne({ where: { source_url: item.link } });
          if (existing) continue;

          console.log(`[Twitter Monitor] New tweet found: ${item.link}`);

          // 使用現有的 vxtwitter 解析真實媒體
          let mediaList = [];
          try {
            mediaList = await TwitterService.extractMediaFromTweet(item.link);
          } catch (e) {
            console.error(`[Twitter Monitor] Failed to extract media for ${item.link}:`, e);
            continue;
          }

          // 如果有媒體（圖片、影片等），則存入 fanarts 標記為未整理
          if (mediaList && mediaList.length > 0) {
            const id = `fanart-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const firstMedia = mediaList[0];
            const tweetText = firstMedia.text || item.title || '';
            const tweetAuthor = firstMedia.user_name || item.creator || '';
            const tweetHandle = firstMedia.user_screen_name || '';
            const tweetDate = firstMedia.date || item.isoDate || new Date().toISOString();

            // 背景上傳到 R2
            const updatedMediaList = await Promise.all(mediaList.map(async (media) => {
              if (media.type === 'image' && media.url.includes('pbs.twimg.com')) {
                const r2Url = await backupImageToR2(media.url, 'fanarts', {
                  metadata: {
                    'fanart-id': id,
                    'author-handle': tweetHandle || 'unknown',
                    'source-tweet': item.link || 'unknown'
                  }
                });
                if (r2Url) {
                  return { ...media, url: r2Url, original_url: media.url };
                }
              } else if (media.type === 'video' && media.url.includes('video.twimg.com')) {
                const r2Url = await backupImageToR2(media.url, 'fanarts/videos', {
                  metadata: {
                    'fanart-id': id,
                    'author-handle': tweetHandle || 'unknown',
                    'source-tweet': item.link || 'unknown'
                  }
                });
                
                // 同時備份影片的預覽圖 (thumbnail)
                let r2ThumbnailUrl = media.thumbnail;
                if (media.thumbnail && media.thumbnail.includes('pbs.twimg.com')) {
                  const thumbRes = await backupImageToR2(media.thumbnail, 'fanarts/videos/thumbs', {
                    metadata: { 'fanart-id': id }
                  });
                  if (thumbRes) r2ThumbnailUrl = thumbRes;
                }

                if (r2Url) {
                  return { ...media, url: r2Url, original_url: media.url, thumbnail: r2ThumbnailUrl, original_thumbnail: media.thumbnail };
                }
              }
              return media;
            }));

            const groupId = generateShortId();
            await MediaGroupModel.create({
              id: groupId,
              source_url: item.link,
              source_text: tweetText,
              author_name: tweetAuthor,
              author_handle: tweetHandle,
              post_date: new Date(tweetDate),
              status: 'unorganized',
            });

            for (const media of updatedMediaList) {
              await MediaModel.create({
                id: generateShortId(),
                type: 'fanart',
                media_type: media.type === 'video' ? 'video' : (media.type === 'animated_gif' ? 'gif' : 'image'),
                url: media.url,
                original_url: media.original_url || media.url,
                thumbnail_url: media.thumbnail || null,
                group_id: groupId
              });
            }

            console.log(`[Twitter Monitor] Saved new fanart: ${item.link}`);

            // 發送 Bark 推送通知
            if (BARK_URL) {
              try {
                const message = `發現新推文！來自 ${tweetAuthor}\n包含 ${mediaList.length} 個媒體\n${tweetText}`;
                const title = encodeURIComponent('FanArt 監聽通知');
                const body = encodeURIComponent(message);
                const barkReqUrl = `${BARK_URL}/${title}/${body}?url=${encodeURIComponent(item.link)}`;
                
                await fetch(barkReqUrl);
                console.log('[Twitter Monitor] Bark notification sent.');
              } catch (barkError) {
                console.error('[Twitter Monitor] Failed to send Bark notification:', barkError);
              }
            }
          }
        }
      } catch (error) {
        console.error('[Twitter Monitor] Error fetching or parsing RSS:', error);
      }
    });
  }
};
