import Parser from 'rss-parser';
import { MediaGroupModel, MediaModel, StagingFanartModel } from '../models/index.js';
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
  findExistingMedia: (options: any) => Promise<any>;
  findExistingStagingFanart: (options: any) => Promise<any>;
  createStagingFanart: (payload: any) => Promise<any>;
  sendFanartReviewNotification: typeof TelegramBotService.sendFanartReviewNotification;
};

const defaultDeps: TwitterMonitorDeps = {
  parseURL: (feedUrl) => parser.parseURL(feedUrl) as Promise<{ items: RssTweetItem[] }>,
  getMonitoredFeedTargets,
  extractMediaFromTweet: (tweetUrl, rssItem) => TwitterService.extractMediaFromTweet(tweetUrl, rssItem),
  findExistingMediaGroup: (options) => MediaGroupModel.findOne(options),
  findExistingMedia: (options) => MediaModel.findOne(options),
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

const extractHandleFromRssItem = (item: RssTweetItem) => {
  // 1. 從 creator/author/title 提取 @handle
  const source = item.creator || item.author || item.title || '';
  const handleFromText = source.match(/@([A-Za-z0-9_]+)/)?.[1];
  if (handleFromText) return handleFromText;

  // 2. 從 link URL 提取 handle（https://x.com/{handle}/status/{id}）
  const link = item.link || '';
  const handleFromUrl = link.match(/(?:twitter\.com|x\.com)\/([A-Za-z0-9_]+)\/status/i)?.[1];
  return handleFromUrl || '';
};

const appendHandle = (currentHandle: unknown, tweetHandle: string) => {
  const current = typeof currentHandle === 'string' ? currentHandle : '';
  const handles = current.split(',').map((value) => value.trim()).filter(Boolean);
  if (handles.includes(tweetHandle)) {
    console.log(`[Twitter Monitor] [Dedup] handle @${tweetHandle} already in [${current}], skip`);
    return current;
  }
  const result = [...handles, tweetHandle].join(',');
  console.log(`[Twitter Monitor] [Dedup] handle @${tweetHandle} appended → [${result}]`);
  return result;
};

const notifyOfficialRetweet = async (payload: {
  stagingId: string;
  title: string;
  body: string;
  sourceUrl?: string;
  imageUrl?: string;
  contentType?: string;
  artistName?: string;
  artistHandle?: string;
  separateTopic?: boolean;
  label?: string;
}) => {
  try {
    await deps.sendFanartReviewNotification(payload);
    console.log(`[Twitter Monitor] [RT-Notify] sent ok: staging=${payload.stagingId} source=${payload.sourceUrl || 'none'}`);
  } catch (error) {
    console.error('[Twitter Monitor] Failed to send official retweet notification:', error);
  }
};

const markOfficialRetweetOnStaging = async (existingStaging: any, retweetedByHandle: string, sourceTweetLink: string, contentType?: string, artistHandle?: string) => {
  const stagingId = String(existingStaging.get('id'));
  const currentHandle = existingStaging.get('retweeted_by_handle');
  const newHandle = appendHandle(currentHandle, retweetedByHandle);
  if (newHandle === currentHandle) {
    console.log(`[Twitter Monitor] [Staging-RT] id=${stagingId} @${retweetedByHandle} already marked, skip notification`);
    return;
  }

  console.log(`[Twitter Monitor] [Staging-RT] id=${stagingId} marking @${retweetedByHandle}, sending notification`);
  await existingStaging.update({ retweeted_by_handle: newHandle });
  await notifyOfficialRetweet({
    stagingId: String(existingStaging.get('id')),
    title: '📋 官方帳號轉發已存在內容',
    body: `轉發者: @${retweetedByHandle}\n原推作者: @${existingStaging.get('author_handle') || 'unknown'}\n狀態: ${existingStaging.get('status')}`,
    sourceUrl: sourceTweetLink,
    contentType,
    artistHandle,
  });
};

const notifyPromotedOfficialRetweet = async (existingGroup: any, retweetedByHandle: string, sourceTweetLink: string, contentType?: string, artistHandle?: string) => {
  if (!existingGroup) return;
  const groupId = String(existingGroup.get('id'));
  const currentHandle = existingGroup.get('retweeted_by_handle');
  const newHandle = appendHandle(currentHandle, retweetedByHandle);
  if (newHandle === currentHandle) {
    console.log(`[Twitter Monitor] [Promoted-RT] group=${groupId} @${retweetedByHandle} already marked, skip notification`);
    return;
  }

  console.log(`[Twitter Monitor] [Promoted-RT] group=${groupId} marking @${retweetedByHandle}, sending notification`);
  await existingGroup.update({ retweeted_by_handle: newHandle });
  await notifyOfficialRetweet({
    stagingId: 'promoted',
    title: '📋 官方帳號轉發已上架內容',
    body: `轉發者: @${retweetedByHandle}\n已上架的內容: ${existingGroup.get('source_url') || ''}`,
    sourceUrl: sourceTweetLink,
    contentType,
    artistHandle,
  });
};

export type FeedTarget = {
  feedUrl: string;
  contentType: string;
  separateTopic?: boolean;
  label?: string;
};

/**
 * 取得所有監聽 feed URL（去重）。
 * 供 queue 層拆分成獨立 job 使用。
 */
export const collectFeedTargets = async (): Promise<FeedTarget[]> => {
  const legacyFeedUrl = process.env.TWITTER_RSS_URL;
  const targets = await deps.getMonitoredFeedTargets();
  const rssHubBase = inferRssHubBaseFromFeedUrl(legacyFeedUrl) || getRssHubBaseUrl();
  const seen = new Set<string>();
  const result: FeedTarget[] = [];

  for (const target of targets) {
    const url = buildTwitterRssFeedUrl(rssHubBase, target);
    if (seen.has(url)) continue;
    seen.add(url);
    result.push({
      feedUrl: url,
      contentType: target.content_type || 'fanart',
      separateTopic: target.separate_topic || false,
      label: target.label || '',
    });
  }

  if (legacyFeedUrl && !seen.has(legacyFeedUrl)) {
    result.push({ feedUrl: legacyFeedUrl, contentType: 'fanart' });
  }

  return result;
};

/**
 * 處理單一 RSS feed：fetch → parse → extract media → 寫 staging → 發通知。
 * 回傳該 feed 產生的新候選數量。
 */
export const processFeed = async (feedUrl: string, contentType: string = 'fanart', separateTopic: boolean = false, label?: string): Promise<{ feedUrl: string; newCandidates: number }> => {
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
  const notifiedTweetIds = new Set<string>();

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
      const firstMedia = mediaList[0];
      const tweetText = firstMedia.text || item.title || '';
      const tweetAuthor = firstMedia.user_name || item.creator || '';
      const tweetHandle = firstMedia.user_screen_name || extractHandleFromRssItem(item) || '';
      const retweetedByHandle = extractHandleFromRssItem(item) || tweetHandle;
      const tweetDate = firstMedia.date || item.isoDate || new Date().toISOString();
      const isRetweet = sourceTweetId !== tweetId;

      if (isRetweet) {
        console.log(`[Twitter Monitor] [RT-Detect] tweet=${tweetId} → source=${sourceTweetId} by @${retweetedByHandle}`);
      }

      const existing = await deps.findExistingMediaGroup({
        where: { source_url: { [Op.regexp]: `/status/${sourceTweetId}([/?#]|$)` } }
      });
      if (existing) {
        if (contentType === 'official' && retweetedByHandle && !notifiedTweetIds.has(sourceTweetId)) {
          await notifyPromotedOfficialRetweet(existing, retweetedByHandle, sourceTweetLink, contentType, tweetHandle);
          notifiedTweetIds.add(sourceTweetId);
        }
        continue;
      }

      console.log(`[Twitter Monitor] New tweet candidate found: ${sourceTweetLink}`);

      for (const media of mediaList) {
        const originalMediaUrl = media.url;
        const existingStaging = await deps.findExistingStagingFanart({
          where: {
            tweet_id: sourceTweetId,
            media_url: originalMediaUrl,
          }
        });
        if (existingStaging) {
          if (contentType === 'official' && retweetedByHandle && !notifiedTweetIds.has(sourceTweetId)) {
            await markOfficialRetweetOnStaging(existingStaging, retweetedByHandle, sourceTweetLink, contentType, tweetHandle);
            notifiedTweetIds.add(sourceTweetId);
          }
          continue;
        }

        const existingByUrl = await deps.findExistingStagingFanart({
          where: { media_url: originalMediaUrl }
        });
        if (existingByUrl) {
          if (contentType === 'official' && retweetedByHandle && !notifiedTweetIds.has(sourceTweetId)) {
            await markOfficialRetweetOnStaging(existingByUrl, retweetedByHandle, sourceTweetLink, contentType, tweetHandle);
            notifiedTweetIds.add(sourceTweetId);
          }
          continue;
        }

        const existingMediaByUrl = await deps.findExistingMedia({
          where: { url: originalMediaUrl }
        });
        if (existingMediaByUrl) {
          if (contentType === 'official' && retweetedByHandle && !notifiedTweetIds.has(sourceTweetId)) {
            const groupId = existingMediaByUrl.get('group_id') as string | null;
            const existingGroup = groupId ? await deps.findExistingMediaGroup({ where: { id: groupId } }) : null;
            if (existingGroup) {
              await notifyPromotedOfficialRetweet(existingGroup, retweetedByHandle, sourceTweetLink, contentType, tweetHandle);
              notifiedTweetIds.add(sourceTweetId);
            }
          }
          continue;
        }

        const mediaType = resolveMediaType(media, originalMediaUrl);
        const stagingRetweetedByHandle = (contentType === 'official' && isRetweet && retweetedByHandle)
          ? retweetedByHandle
          : null;
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
          content_type: contentType,
          retweeted_by_handle: stagingRetweetedByHandle,
        });

        newCandidates++;

        const contentTypeLabel = contentType === 'official' ? '📋 官方' : '🎨 Fanart';
        const likeCount = firstMedia.like_count || 0;
        const rtCount = firstMedia.retweet_count || 0;
        const viewCount = firstMedia.view_count || 0;
        const stats = [`❤️ ${likeCount}`, `🔁 ${rtCount}`, `👁 ${viewCount}`].join(' · ');

        await deps.sendFanartReviewNotification({
          stagingId: String(staging.get('id')),
          title: `${contentTypeLabel} 審核通知`,
          body: `來自 ${tweetAuthor || tweetHandle || 'unknown'}\n${stats}\n包含 ${mediaList.length} 個媒體\n${tweetText}`,
          sourceUrl: sourceTweetLink,
          imageUrl: mediaType === 'image' ? originalMediaUrl : (media.thumbnail || undefined),
          contentType,
          artistName: label || tweetAuthor,
          artistHandle: tweetHandle,
          separateTopic,
          label,
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
    const feedTargets = await collectFeedTargets();

    if (feedTargets.length === 0) {
      console.log('[Twitter Monitor] No monitor targets or TWITTER_RSS_URL configured. Skipping.');
      return { success: true, processedCount: 0, timestamp: new Date().toISOString() };
    }

    console.log(`[Twitter Monitor] Running check for ${feedTargets.length} feed(s)...`);
    let totalNewCandidates = 0;
    let failedFeeds = 0;

    for (const target of feedTargets) {
      const result = await processFeed(target.feedUrl, target.contentType, target.separateTopic, target.label);
      if (result.newCandidates === 0) {
        // 可能是正常（無新推文）或失敗（parseURL 已 emitError）
      }
      totalNewCandidates += result.newCandidates;
    }

    return { success: true, processedCount: totalNewCandidates, timestamp: new Date().toISOString() };
  },

  collectFeedTargets,
  processFeed,
};
