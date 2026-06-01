import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TwitterMonitorService,
  resetTwitterMonitorServiceDepsForTest,
  setTwitterMonitorServiceDepsForTest,
} from './twitter-monitor.service.js';
import { buildCanonicalTweetUrl } from './twitter.service.js';

test('TwitterMonitorService.checkRss uses RSS item parser and does not skip when external enrichment fails', async () => {
  const createdRows: any[] = [];
  const notifications: any[] = [];

  setTwitterMonitorServiceDepsForTest({
    getMonitoredFeedTargets: async () => [{ type: 'user', handle: 'zutomayo_art', source: 'manual' }],
    parseURL: async () => ({
      items: [{
        title: 'Artist (@artist): fallback #ZTMY',
        link: 'https://x.com/zutomayo_art/status/1111111111111111111',
        pubDate: 'Fri, 22 May 2026 12:34:56 GMT',
        isoDate: '2026-05-22T12:34:56.000Z',
        creator: 'Artist (@artist)',
        categories: ['ZTMY'],
        description: '&amp;lt;img src=&amp;quot;https://pbs.twimg.com/media/fallback.jpg?format=jpg&amp;amp;name=small&amp;quot;&amp;gt;',
      }],
    }),
    extractMediaFromTweet: async (tweetUrl, rssItem) => {
      assert.equal(tweetUrl, 'https://x.com/i/status/1111111111111111111');
      assert.equal(rssItem?.title, 'Artist (@artist): fallback #ZTMY');
      return [{
        url: 'https://pbs.twimg.com/media/fallback.jpg?format=jpg&name=orig',
        type: 'image',
        text: 'fallback #ZTMY',
        user_name: 'Artist',
        user_screen_name: 'artist',
        date: '2026-05-22T12:34:56.000Z',
        tweet_id: '1111111111111111111',
        tweet_url: buildCanonicalTweetUrl('1111111111111111111'),
        requested_tweet_id: '1111111111111111111',
        hashtags: ['ZTMY'],
      }];
    },
    findExistingMediaGroup: async () => null,
    findExistingStagingFanart: async () => null,
    createStagingFanart: async (payload) => {
      createdRows.push(payload);
      return { get: (key: string) => key === 'id' ? 'staging-1' : undefined } as any;
    },
    sendFanartReviewNotification: async (payload) => {
      notifications.push(payload);
      return true;
    },
  });

  try {
    const result = await TwitterMonitorService.checkRss();
    assert.equal(result?.success, true);
    assert.equal(result?.processedCount, 1);
    assert.equal(createdRows.length, 1);
    assert.equal(createdRows[0].tweet_id, '1111111111111111111');
    assert.equal(createdRows[0].media_url, 'https://pbs.twimg.com/media/fallback.jpg?format=jpg&name=orig');
    assert.equal(createdRows[0].r2_url, null);
    assert.equal(createdRows[0].author_handle, 'artist');
    assert.deepEqual(createdRows[0].hashtags, ['ZTMY']);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].imageUrl, 'https://pbs.twimg.com/media/fallback.jpg?format=jpg&name=orig');
    assert.equal(notifications[0].contentType, 'fanart');
    assert.equal(notifications[0].artistName, 'Artist');
    assert.equal(notifications[0].artistHandle, 'artist');
  } finally {
    resetTwitterMonitorServiceDepsForTest();
  }
});

test('TwitterMonitorService.processFeed passes official artist routing fields to Telegram review notification', async () => {
  const notifications: any[] = [];

  setTwitterMonitorServiceDepsForTest({
    parseURL: async () => ({
      items: [{
        title: 'ACAね (@zutomayo): official update',
        link: 'https://x.com/zutomayo/status/2222222222222222222',
        isoDate: '2026-05-23T12:34:56.000Z',
        creator: 'ACAね',
      }],
    }),
    extractMediaFromTweet: async () => [{
      url: 'https://pbs.twimg.com/media/official.jpg?format=jpg&name=orig',
      type: 'image',
      text: 'official update',
      user_name: 'ACAね',
      user_screen_name: 'zutomayo',
      date: '2026-05-23T12:34:56.000Z',
      tweet_id: '2222222222222222222',
      tweet_url: buildCanonicalTweetUrl('2222222222222222222'),
      requested_tweet_id: '2222222222222222222',
      hashtags: [],
    }],
    findExistingMediaGroup: async () => null,
    findExistingStagingFanart: async () => null,
    createStagingFanart: async () => ({ get: (key: string) => key === 'id' ? 'staging-2' : undefined } as any),
    sendFanartReviewNotification: async (payload) => {
      notifications.push(payload);
      return true;
    },
  });

  try {
    const result = await TwitterMonitorService.processFeed('https://rss.example.com/user/zutomayo', 'official');
    assert.equal(result.newCandidates, 1);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].contentType, 'official');
    assert.equal(notifications[0].artistName, 'ACAね');
    assert.equal(notifications[0].artistHandle, 'zutomayo');
  } finally {
    resetTwitterMonitorServiceDepsForTest();
  }
});
