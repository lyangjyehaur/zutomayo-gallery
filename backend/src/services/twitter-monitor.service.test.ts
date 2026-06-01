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
    getMonitoredFeedTargets: async () => [{ type: 'user', handle: 'zutomayo_art', source: 'manual', content_type: 'fanart' }],
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

test('TwitterMonitorService.processFeed stores retweeted_by_handle when official account retweets new content', async () => {
  const createdRows: any[] = [];

  setTwitterMonitorServiceDepsForTest({
    parseURL: async () => ({
      items: [{
        title: 'ZUTOMAYO ART (@zutomayo_art): RT new fanart',
        link: 'https://x.com/zutomayo_art/status/8888888888888888888',
        isoDate: '2026-05-24T12:34:56.000Z',
        creator: 'ZUTOMAYO ART (@zutomayo_art)',
      }],
    }),
    extractMediaFromTweet: async () => [{
      url: 'https://pbs.twimg.com/media/retweeted-new.jpg?format=jpg&name=orig',
      type: 'image',
      text: 'new fanart',
      user_name: 'Original Artist',
      user_screen_name: 'original_artist',
      date: '2026-05-24T12:34:56.000Z',
      tweet_id: '9999999999999999999',
      tweet_url: buildCanonicalTweetUrl('9999999999999999999'),
      requested_tweet_id: '8888888888888888888',
      hashtags: [],
    }],
    findExistingMediaGroup: async () => null,
    findExistingStagingFanart: async () => null,
    createStagingFanart: async (payload) => {
      createdRows.push(payload);
      return { get: (key: string) => key === 'id' ? 'staging-retweet-new' : undefined } as any;
    },
    sendFanartReviewNotification: async () => true,
  });

  try {
    const result = await TwitterMonitorService.processFeed('https://rss.example.com/user/zutomayo_art', 'official');
    assert.equal(result.newCandidates, 1);
    assert.equal(createdRows.length, 1);
    assert.equal(createdRows[0].tweet_id, '9999999999999999999');
    assert.equal(createdRows[0].author_handle, 'original_artist');
    assert.equal(createdRows[0].retweeted_by_handle, 'zutomayo_art');
  } finally {
    resetTwitterMonitorServiceDepsForTest();
  }
});

test('TwitterMonitorService carries manual separate topic routing into Telegram review notification', async () => {
  const notifications: any[] = [];

  setTwitterMonitorServiceDepsForTest({
    getMonitoredFeedTargets: async () => [{
      type: 'user',
      handle: 'manual_artist',
      source: 'manual',
      content_type: 'fanart',
      separate_topic: true,
    }],
    parseURL: async () => ({
      items: [{
        title: 'Manual Artist (@manual_artist): fanart update',
        link: 'https://x.com/manual_artist/status/3333333333333333333',
        isoDate: '2026-05-24T12:34:56.000Z',
        creator: 'Manual Artist',
      }],
    }),
    extractMediaFromTweet: async () => [{
      url: 'https://pbs.twimg.com/media/manual.jpg?format=jpg&name=orig',
      type: 'image',
      text: 'fanart update',
      user_name: 'Manual Artist',
      user_screen_name: 'manual_artist',
      date: '2026-05-24T12:34:56.000Z',
      tweet_id: '3333333333333333333',
      tweet_url: buildCanonicalTweetUrl('3333333333333333333'),
      requested_tweet_id: '3333333333333333333',
      hashtags: [],
    }],
    findExistingMediaGroup: async () => null,
    findExistingStagingFanart: async () => null,
    createStagingFanart: async () => ({ get: (key: string) => key === 'id' ? 'staging-3' : undefined } as any),
    sendFanartReviewNotification: async (payload) => {
      notifications.push(payload);
      return true;
    },
  });

  try {
    const targets = await TwitterMonitorService.collectFeedTargets();
    assert.equal(targets.length, 1);
    assert.equal(targets[0].separateTopic, true);

    const result = await TwitterMonitorService.processFeed(targets[0].feedUrl, targets[0].contentType, targets[0].separateTopic);
    assert.equal(result.newCandidates, 1);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].contentType, 'fanart');
    assert.equal(notifications[0].artistName, 'Manual Artist');
    assert.equal(notifications[0].artistHandle, 'manual_artist');
    assert.equal(notifications[0].separateTopic, true);
  } finally {
    resetTwitterMonitorServiceDepsForTest();
  }
});

test('TwitterMonitorService.processFeed marks official retweet when media URL already exists in staging', async () => {
  const notifications: any[] = [];
  const updates: any[] = [];
  const findStagingQueries: any[] = [];
  let createCount = 0;

  const existingStaging = {
    get: (key: string) => ({
      id: 'existing-staging',
      retweeted_by_handle: null,
      author_handle: 'original_artist',
      status: 'pending',
    } as any)[key],
    update: async (payload: any) => {
      updates.push(payload);
      return existingStaging;
    },
  };

  setTwitterMonitorServiceDepsForTest({
    parseURL: async () => ({
      items: [{
        title: 'ZUTOMAYO ART (@zutomayo_art): RT',
        link: 'https://x.com/zutomayo_art/status/4444444444444444444',
        isoDate: '2026-05-25T12:34:56.000Z',
        creator: 'ZUTOMAYO ART',
      }],
    }),
    extractMediaFromTweet: async () => [{
      url: 'https://pbs.twimg.com/media/original.jpg?format=jpg&name=orig',
      type: 'image',
      text: 'RT',
      user_name: 'ZUTOMAYO ART',
      user_screen_name: 'zutomayo_art',
      date: '2026-05-25T12:34:56.000Z',
      tweet_id: '4444444444444444444',
      tweet_url: buildCanonicalTweetUrl('4444444444444444444'),
      requested_tweet_id: '4444444444444444444',
      hashtags: [],
    }],
    findExistingMediaGroup: async () => null,
    findExistingStagingFanart: async (query) => {
      findStagingQueries.push(query);
      if (query.where?.media_url === 'https://pbs.twimg.com/media/original.jpg?format=jpg&name=orig' && !query.where?.tweet_id) {
        return existingStaging;
      }
      return null;
    },
    createStagingFanart: async () => {
      createCount++;
      return { get: (key: string) => key === 'id' ? 'new-staging' : undefined } as any;
    },
    sendFanartReviewNotification: async (payload) => {
      notifications.push(payload);
      return true;
    },
  });

  try {
    const result = await TwitterMonitorService.processFeed('https://rss.example.com/user/zutomayo_art', 'official');
    assert.equal(result.newCandidates, 0);
    assert.equal(createCount, 0);
    assert.deepEqual(updates, [{ retweeted_by_handle: 'zutomayo_art' }]);
    assert.equal(findStagingQueries.length, 2);
    assert.equal(findStagingQueries[1].where.media_url, 'https://pbs.twimg.com/media/original.jpg?format=jpg&name=orig');
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].stagingId, 'existing-staging');
    assert.equal(notifications[0].title, '📋 官方帳號轉發已存在內容');
    assert.match(notifications[0].body, /轉發者: @zutomayo_art/);
    assert.match(notifications[0].body, /原推作者: @original_artist/);
    assert.match(notifications[0].body, /狀態: pending/);
  } finally {
    resetTwitterMonitorServiceDepsForTest();
  }
});

test('TwitterMonitorService.processFeed skips promoted duplicate by media URL and notification failure does not block', async () => {
  let createCount = 0;
  const mediaGroupQueries: any[] = [];

  setTwitterMonitorServiceDepsForTest({
    parseURL: async () => ({
      items: [{
        title: 'ZUTOMAYO ART (@zutomayo_art): RT promoted',
        link: 'https://x.com/zutomayo_art/status/5555555555555555555',
        isoDate: '2026-05-26T12:34:56.000Z',
        creator: 'ZUTOMAYO ART',
      }],
    }),
    extractMediaFromTweet: async () => [{
      url: 'https://pbs.twimg.com/media/promoted.jpg?format=jpg&name=orig',
      type: 'image',
      text: 'RT promoted',
      user_name: 'ZUTOMAYO ART',
      user_screen_name: 'zutomayo_art',
      date: '2026-05-26T12:34:56.000Z',
      tweet_id: '5555555555555555555',
      tweet_url: buildCanonicalTweetUrl('5555555555555555555'),
      requested_tweet_id: '5555555555555555555',
      hashtags: [],
    }],
    findExistingMediaGroup: async (query) => {
      mediaGroupQueries.push(query);
      if (query.where?.url === 'https://pbs.twimg.com/media/promoted.jpg?format=jpg&name=orig') {
        return { get: () => undefined };
      }
      return null;
    },
    findExistingStagingFanart: async () => null,
    createStagingFanart: async () => {
      createCount++;
      return { get: (key: string) => key === 'id' ? 'new-staging' : undefined } as any;
    },
    sendFanartReviewNotification: async () => {
      throw new Error('telegram down');
    },
  });

  try {
    const result = await TwitterMonitorService.processFeed('https://rss.example.com/user/zutomayo_art', 'official');
    assert.equal(result.newCandidates, 0);
    assert.equal(createCount, 0);
    assert.equal(mediaGroupQueries.length, 2);
    assert.equal(mediaGroupQueries[1].where.url, 'https://pbs.twimg.com/media/promoted.jpg?format=jpg&name=orig');
  } finally {
    resetTwitterMonitorServiceDepsForTest();
  }
});

test('TwitterMonitorService.processFeed marks official retweet when canonical staging duplicate is found', async () => {
  const updates: any[] = [];
  const notifications: any[] = [];
  let createCount = 0;

  const existingStaging = {
    get: (key: string) => ({
      id: 'canonical-staging',
      retweeted_by_handle: 'another_official',
      author_handle: 'original_artist',
      status: 'approved',
    } as any)[key],
    update: async (payload: any) => {
      updates.push(payload);
      return existingStaging;
    },
  };

  setTwitterMonitorServiceDepsForTest({
    parseURL: async () => ({
      items: [{
        title: 'ZUTOMAYO ART (@zutomayo_art): RT canonical',
        link: 'https://x.com/zutomayo_art/status/6666666666666666666',
        isoDate: '2026-05-27T12:34:56.000Z',
        creator: 'ZUTOMAYO ART (@zutomayo_art)',
      }],
    }),
    extractMediaFromTweet: async () => [{
      url: 'https://pbs.twimg.com/media/canonical.jpg?format=jpg&name=orig',
      type: 'image',
      text: 'RT canonical',
      user_name: 'Original Artist',
      user_screen_name: 'original_artist',
      date: '2026-05-27T12:34:56.000Z',
      tweet_id: '7777777777777777777',
      tweet_url: buildCanonicalTweetUrl('7777777777777777777'),
      requested_tweet_id: '6666666666666666666',
      hashtags: [],
    }],
    findExistingMediaGroup: async () => null,
    findExistingStagingFanart: async (query) => query.where?.tweet_id ? existingStaging : null,
    createStagingFanart: async () => {
      createCount++;
      return { get: (key: string) => key === 'id' ? 'new-staging' : undefined } as any;
    },
    sendFanartReviewNotification: async (payload) => {
      notifications.push(payload);
      return true;
    },
  });

  try {
    const result = await TwitterMonitorService.processFeed('https://rss.example.com/user/zutomayo_art', 'official');
    assert.equal(result.newCandidates, 0);
    assert.equal(createCount, 0);
    assert.deepEqual(updates, [{ retweeted_by_handle: 'another_official,zutomayo_art' }]);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].stagingId, 'canonical-staging');
    assert.match(notifications[0].body, /轉發者: @zutomayo_art/);
    assert.match(notifications[0].body, /狀態: approved/);
  } finally {
    resetTwitterMonitorServiceDepsForTest();
  }
});
