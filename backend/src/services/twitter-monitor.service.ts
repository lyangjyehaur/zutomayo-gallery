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

/**
 * 取得所有監聽 feed URL（去重）。
 * 供 queue 層拆分成獨立 job 使用。
 */
export const collectFeedUrls = async (): Promise<string[]> => {
  const legacyFeedUrl = process.env.TWITTER_RSS_URL;
  const targets = await deps.getMonitoredFeedTargets();
  const rssHubBase = inferRssHubBaseFromFeedUrl(legacyFeedUrl) || getRssHubBaseUrl();
  return Array.from(new Set([
    ...targets.map((target) => buildTwitterRssFeedUrl(rssHubBase, target)),
    ...(legacyFeedUrl ? [legacyFeedUrl] : []),
  ]));
};

/**
 * 處理單一 RSS feed：fetch → parse → extract media → 寫 staging → 發通知。
 * 回傳該 feed 產生的新候選數量。
 */
export const processFeed = async (feedUrl: string): Promise<{ feedUrl: string; newCandidates: number }> => {
  let feed: { items: RssTweetItem[] };
  try {
    feed = await deps.parseURL(feedUrl);
  } catch (error: any) {
    console.error(`[Twitter Monitor] Failed to fetch or parse RSS feed ${feedUrl}:`, error);
    errorEventEmitter.emitError({
      source: 'cron',
      message: `Twitter monitor: failed to fetch or parse RSS feed ${feedUrl}`,
      stack: error instanceof Error ? error.stack : undefined,
      details: { phase: 'twitter-monitor-feed', feedUrl },
    });
    return { feedUrl, newCandidates: 0 };
  }

  let newCandidates = 0;

  for (const item of feed.items) {
    if (!item.link) continue;
    const tweetLink = normalizeTweetUrl(item.link);
    const tweetId = extractTweetId(tweetLink);
    if (!tweetId) continue;

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

    if (mediaList && mediaList.length > 0) {
      const sourceTweetId = mediaList[0].tweet_id || tweetId;
      const sourceTweetLink = mediaList[0].tweet_url || buildCanonicalTweetUrl(sourceTweetId);

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

        newCandidates++;

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

  return { feedUrl, newCandidates };
};

export const TwitterMonitorService = {
  /**
   * 收集所有 feed URL 並順序處理（相容舊呼叫 / 無 queue 環境）。
   * 生產環境應改用 queue 層的 enqueueFeeds + processFeed。
   */
  checkRss: async () => {
    const feedUrls = await collectFeedUrls();

    if (feedUrls.length === 0) {
      console.log('[Twitter Monitor] No monitor targets or TWITTER_RSS_URL configured. Skipping.');
      return { success: true, processedCount: 0, timestamp: new Date().toISOString() };
    }

    console.log(`[Twitter Monitor] Running check for ${feedUrls.length} feed(s)...`);
    let totalNewCandidates = 0;
    let failedFeeds = 0;

    for (const feedUrl of feedUrls) {
      const result = await processFeed(feedUrl);
      if (result.newCandidates === 0) {
        // 可能是正常（無新推文）或失敗（parseURL 已 emitError）
      }
      totalNewCandidates += result.newCandidates;
    }

    return { success: true, processedCount: totalNewCandidates, timestamp: new Date().toISOString() };
  },

  collectFeedUrls,
  processFeed,
};
