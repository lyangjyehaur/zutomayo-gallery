import Parser from 'rss-parser';
import { MediaGroupModel, StagingFanartModel } from '../models/index.js';
import type { TwitterMedia } from './twitter.service.js';
import { TwitterService, buildCanonicalTweetUrl, extractTweetId, normalizeTweetUrl } from './twitter.service.js';
import { backupImageToR2 } from './r2.service.js';
import { errorEventEmitter } from './error-events.service.js';
import { TelegramBotService } from './telegram-bot.service.js';
import { Op } from 'sequelize';
import {
  buildTwitterRssFeedUrl,
  getMonitoredFeedTargets,
  getRssHubBaseUrl,
  inferRssHubBaseFromFeedUrl,
} from './monitor-target.service.js';

const parser = new Parser();

const resolveMediaType = (media: TwitterMedia, url: string) => {
  if (media.type === 'video') return 'video';
  if (media.type === 'animated_gif' || media.type === 'gif') return 'gif';
  if (url.includes('.mp4') || url.includes('video.twimg.com')) return 'video';
  return 'image';
};

const safeDate = (value: string | Date | undefined) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

export const TwitterMonitorService = {
  checkRss: async () => {
    const legacyFeedUrl = process.env.TWITTER_RSS_URL;
    const targets = await getMonitoredFeedTargets();
    const rssHubBase = inferRssHubBaseFromFeedUrl(legacyFeedUrl) || getRssHubBaseUrl();
    const feedUrls = Array.from(new Set([
      ...targets.map((target) => buildTwitterRssFeedUrl(rssHubBase, target)),
      ...(legacyFeedUrl ? [legacyFeedUrl] : []),
    ]));

    if (feedUrls.length === 0) {
      console.log('[Twitter Monitor] No monitor targets or TWITTER_RSS_URL configured. Skipping.');
      return;
    }

    console.log(`[Twitter Monitor] Running check for ${feedUrls.length} feed(s)...`);
    try {
      let newCandidatesCount = 0;
      let successfulFeeds = 0;
      let failedFeeds = 0;

      for (const feedUrl of feedUrls) {
        let feed: Awaited<ReturnType<typeof parser.parseURL>>;
        try {
          feed = await parser.parseURL(feedUrl);
          successfulFeeds++;
        } catch (error: any) {
          failedFeeds++;
          console.error(`[Twitter Monitor] Failed to fetch or parse RSS feed ${feedUrl}:`, error);
          errorEventEmitter.emitError({
            source: 'cron',
            message: `Twitter monitor: failed to fetch or parse RSS feed ${feedUrl}`,
            stack: error instanceof Error ? error.stack : undefined,
            details: { phase: 'twitter-monitor-feed', feedUrl },
          });
          continue;
        }

        for (const item of feed.items) {
          // 確保是推文網址
          if (!item.link) continue;
          const tweetLink = normalizeTweetUrl(item.link);
          const tweetId = extractTweetId(tweetLink);
          if (!tweetId) continue;

          // 使用現有的 vxtwitter 解析真實媒體
          let mediaList: TwitterMedia[] = [];
          try {
            mediaList = await TwitterService.extractMediaFromTweet(tweetLink);
          } catch (e) {
            console.error(`[Twitter Monitor] Failed to extract media for ${tweetLink}:`, e);
            errorEventEmitter.emitError({
              source: 'cron',
              message: `Twitter monitor: failed to extract media for ${tweetLink}`,
              stack: e instanceof Error ? e.stack : undefined,
              details: { phase: 'twitter-monitor-extract', tweetLink },
            });
            continue;
          }

          // 如果有媒體（圖片、影片等），先存入 staging 等待審核。
          if (mediaList && mediaList.length > 0) {
            const sourceTweetId = mediaList[0].tweet_id || tweetId;
            const sourceTweetLink = mediaList[0].tweet_url || buildCanonicalTweetUrl(sourceTweetId);

            // 檢查真正的原推文是否已經升入正式媒體庫
            const existing = await MediaGroupModel.findOne({
              where: { source_url: { [Op.regexp]: `/status/${sourceTweetId}([/?#]|$)` } }
            });
            if (existing) continue;

            console.log(`[Twitter Monitor] New tweet candidate found: ${sourceTweetLink}`);

            const firstMedia = mediaList[0];
            const tweetText = firstMedia.text || item.title || '';
            const tweetAuthor = firstMedia.user_name || item.creator || '';
            const tweetHandle = firstMedia.user_screen_name || '';
            const tweetDate = firstMedia.date || item.isoDate || new Date().toISOString();

            // 背景上傳到 R2 crawler 暫存區；approve 時既有 staging promotion 會搬到 fanart/。
            const updatedMediaList = await Promise.all(mediaList.map(async (media) => {
              if (media.type === 'image' && media.url.includes('pbs.twimg.com')) {
                const r2Url = await backupImageToR2(media.url, 'crawler/fanarts', {
                  metadata: {
                    'tweet-id': sourceTweetId,
                    'author-handle': tweetHandle || 'unknown',
                    'source-tweet': sourceTweetLink || 'unknown'
                  }
                });
                if (r2Url) {
                  return { ...media, url: r2Url, original_url: media.url };
                }
              } else if (media.type === 'video' && media.url.includes('video.twimg.com')) {
                const r2Url = await backupImageToR2(media.url, 'crawler/fanarts/videos', {
                  metadata: {
                    'tweet-id': sourceTweetId,
                    'author-handle': tweetHandle || 'unknown',
                    'source-tweet': sourceTweetLink || 'unknown'
                  }
                });
                
                // 同時備份影片的預覽圖 (thumbnail)
                let r2ThumbnailUrl = media.thumbnail;
                if (media.thumbnail && media.thumbnail.includes('pbs.twimg.com')) {
                  const thumbRes = await backupImageToR2(media.thumbnail, 'crawler/fanarts/videos/thumbs', {
                    metadata: { 'tweet-id': sourceTweetId }
                  });
                  if (thumbRes) r2ThumbnailUrl = thumbRes;
                }

                if (r2Url) {
                  return { ...media, url: r2Url, original_url: media.url, thumbnail: r2ThumbnailUrl, original_thumbnail: media.thumbnail };
                }
              }
              return media;
            }));

            for (const media of updatedMediaList) {
              const originalMediaUrl = (media as any).original_url || media.url;
              const existingStaging = await StagingFanartModel.findOne({
                where: {
                  tweet_id: sourceTweetId,
                  media_url: originalMediaUrl,
                }
              });
              if (existingStaging) continue;

              const mediaType = resolveMediaType(media, originalMediaUrl);
              const staging = await StagingFanartModel.create({
                tweet_id: sourceTweetId,
                original_url: sourceTweetLink,
                media_url: originalMediaUrl,
                thumbnail_url: media.thumbnail || null,
                author_name: tweetAuthor,
                author_handle: tweetHandle,
                r2_url: media.url !== originalMediaUrl ? media.url : null,
                media_type: mediaType,
                crawled_at: new Date(),
                post_date: safeDate(tweetDate),
                source_text: tweetText,
                status: 'pending',
                source: 'rss',
                like_count: firstMedia.like_count || 0,
                retweet_count: firstMedia.retweet_count || 0,
                view_count: firstMedia.view_count || 0,
                hashtags: firstMedia.hashtags || [],
              });

              newCandidatesCount++;

              await TelegramBotService.sendFanartReviewNotification({
                stagingId: String(staging.get('id')),
                title: 'FanArt 審核通知',
                body: `發現新推文！來自 ${tweetAuthor || tweetHandle || 'unknown'}\n包含 ${mediaList.length} 個媒體\n${tweetText}`,
                sourceUrl: sourceTweetLink,
                imageUrl: mediaType === 'image' ? (media.url || originalMediaUrl) : (media.thumbnail || undefined),
              });
            }

            console.log(`[Twitter Monitor] Saved new fanart candidate(s): ${sourceTweetLink}`);
          }
        }
      }
      if (successfulFeeds === 0 && failedFeeds > 0) {
        throw new Error('All configured Twitter RSS feeds failed');
      }
      return { success: true, processedCount: newCandidatesCount, timestamp: new Date().toISOString() };
    } catch (error: any) {
      console.error('[Twitter Monitor] Error fetching or parsing RSS:', error);
      errorEventEmitter.emitError({
        source: 'cron',
        message: `Twitter monitor RSS check failed: ${error.message}`,
        stack: error.stack,
        details: { phase: 'twitter-monitor-rss' },
      });
      throw new Error(`Failed to check RSS: ${error.message}`);
    }
  }
};
