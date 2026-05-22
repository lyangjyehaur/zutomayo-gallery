import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildTwitterRssFeedUrl,
  inferRssHubBaseFromFeedUrl,
  normalizeMonitorHandle,
} from './monitor-target.service.js';

test('normalizeMonitorHandle normalizes user handles', () => {
  assert.equal(normalizeMonitorHandle('user', ' @ZUTOMAYO_ART '), 'zutomayo_art');
  assert.equal(normalizeMonitorHandle('user', 'https://x.com/ZUTOMAYO_ART/status/123'), 'zutomayo_art');
  assert.equal(normalizeMonitorHandle('user', 'https://twitter.com/SomeUser?lang=ja'), 'someuser');
});

test('normalizeMonitorHandle normalizes hashtag handles without removing inner spaces', () => {
  assert.equal(normalizeMonitorHandle('hashtag', ' #ずとまよファンアート '), 'ずとまよファンアート');
  assert.equal(normalizeMonitorHandle('hashtag', '##ZTMY'), 'ZTMY');
});

test('buildTwitterRssFeedUrl builds user and encoded hashtag RSSHub URLs', () => {
  assert.equal(
    buildTwitterRssFeedUrl('https://rsshub.app/', { type: 'user', handle: 'zutomayo_art' }),
    'https://rsshub.app/twitter/user/zutomayo_art'
  );
  assert.equal(
    buildTwitterRssFeedUrl('https://rsshub.app', { type: 'hashtag', handle: 'ずとまよファンアート' }),
    `https://rsshub.app/twitter/keyword/${encodeURIComponent('#ずとまよファンアート')}`
  );
});

test('inferRssHubBaseFromFeedUrl keeps TWITTER_RSS_URL compatibility with path prefixes', () => {
  assert.equal(inferRssHubBaseFromFeedUrl('https://rsshub.example.com/twitter/user/zutomayo_art'), 'https://rsshub.example.com');
  assert.equal(inferRssHubBaseFromFeedUrl('https://example.com/rsshub/twitter/user/zutomayo_art'), 'https://example.com/rsshub');
  assert.equal(inferRssHubBaseFromFeedUrl('not a url'), null);
});
