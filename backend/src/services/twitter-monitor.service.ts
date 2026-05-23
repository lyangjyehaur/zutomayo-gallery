import Parser from 'rss-parser';
import { MediaGroupModel, StagingFanartModel } from '../models/index.js';
import type { RssTweetItem, TwitterMedia } from './twitter.service.js';
import { TwitterService, buildCanonicalTweetUrl, extractTweetId, normalizeTweetUrl } from './twitter.service.js';
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

type TwitterMonitorDeps = {
  parseURL: (feedUrl: string) => Promise<{ items: RssTweetItem[] }>;
  getMonitoredFeedTargets: typeof getMonitoredFeedTargets;
  extractMediaFromTweet: (tweetUrl: string, rssItem?: RssTweetItem) => Promise<TwitterMedia[]>;
  findExistingMediaGroup: (options: any) => Promise<any>;
  findExistingStagingFanart: (options: any) => Promise<any>;
  createStagingFanart: (payload: any) => Promise<any>;
  sendFanartReviewNotification: typeof TelegramBotService.sendFanartReviewNotification;
};

const defaultDeps: TwitterMonitorDeps = {
  parseURL: (feedUrl) => parser.parseURL(feedUrl) as Promise<{ items: RssTweetItem[] }>,
  getMonitoredFeedTargets,
  extractMediaFromTweet: (tweetUrl, rssItem) => TwitterService.extractMediaFromTweet(tweetUrl, rssItem),
  findExistingMediaGroup: (options) => MediaGroupModel.findOne(options),
  findExistingStagingFanart: (options) => StagingFanartModel.findOne(options),
  createStagingFanart: (payload) => StagingFanartModel.create(payload),
  sendFanartReviewNotification: (payload) => TelegramBotService.sendFanartReviewNotification(payload),
};

let deps = defaultDeps;

export const setTwitterMonitorServiceDepsForTest = (overrides: Partial<TwitterMonitorDeps>) => {
  deps = { ...defaultDeps, ...overrides };
};

export const resetTwitterMonitorServiceDepsForTest = () => {
  deps = defaultDeps;
};

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
    const targets = await deps.getMonitoredFeedTargets();
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
        let feed: { items: RssTweetItem[] };
        try {
          feed = await deps.parseURL(feedUrl);
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

          // 以 RSS item 為主解析媒體，必要時由 x.com 頁面狀態補強原推資訊。
          let mediaList: TwitterMedia[] = [];
          try {
            mediaList = await deps.extractMediaFromTweet(tweetLink, item);
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
            const existing = await deps.findExistingMediaGroup({
              where: { source_url: { [Op.regexp]: `/status/${sourceTweetId}([/?#]|$)` } }
            });
            if (existing) continue;

            console.log(`[Twitter Monitor] New tweet candidate found: ${sourceTweetLink}`);

            const firstMedia = mediaList[0];
            const tweetText = firstMedia.text || item.title || '';
            const tweetAuthor = firstMedia.user_name || item.creator || '';
            const tweetHandle = firstMedia.user_screen_name || '';
            const tweetDate = firstMedia.date || item.isoDate || new Date().toISOString();

            // 監聽階段只建立 staging candidate，不寫入 R2；避免 reject/hold 的無用媒體進入 R2。
            // R2 上傳集中在 approve/promote flow，見 staging-fanart.controller.ts。
            for (const media of mediaList) {
              const originalMediaUrl = media.url;
              const existingStaging = await deps.findExistingStagingFanart({
                where: {
                  tweet_id: sourceTweetId,
                  media_url: originalMediaUrl,
                }
              });
              if (existingStaging) continue;

              const mediaType = resolveMediaType(media, originalMediaUrl);
              const staging = await deps.createStagingFanart({
                tweet_id: sourceTweetId,
                original_url: sourceTweetLink,
                media_url: originalMediaUrl,
                thumbnail_url: media.thumbnail || null,
                original_thumbnail_url: media.thumbnail || null,
                author_name: tweetAuthor,
                author_handle: tweetHandle,
                r2_url: null,
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

              await deps.sendFanartReviewNotification({
                stagingId: String(staging.get('id')),
                title: 'FanArt 審核通知',
                body: `發現新推文！來自 ${tweetAuthor || tweetHandle || 'unknown'}\n包含 ${mediaList.length} 個媒體\n${tweetText}`,
                sourceUrl: sourceTweetLink,
                imageUrl: mediaType === 'image' ? originalMediaUrl : (media.thumbnail || undefined),
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
