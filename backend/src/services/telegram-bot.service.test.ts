import assert from 'node:assert/strict';
import test from 'node:test';
import {
  __testResolveTopicIdForFanartReview,
  __testSetTelegramTopicState,
  buildFanartReviewCallbackData,
  buildFanartReviewPhotoCaption,
  parseFanartReviewCallbackData,
  syncArtistTopicName,
} from './telegram-bot.service.js';

test('buildFanartReviewCallbackData generates short callback_data', () => {
  assert.equal(buildFanartReviewCallbackData('approve', 'abc123'), 'fa:ok:abc123');
  assert.equal(buildFanartReviewCallbackData('hold', 'abc123'), 'fa:hold:abc123');
  assert.equal(buildFanartReviewCallbackData('reject', 'abc123'), 'fa:no:abc123');
});

test('buildFanartReviewCallbackData throws when callback_data exceeds 64 bytes', () => {
  assert.throws(
    () => buildFanartReviewCallbackData('approve', 'x'.repeat(59)),
    /64-byte limit/
  );
});

test('parseFanartReviewCallbackData parses known formats and returns null for unknown data', () => {
  assert.deepEqual(parseFanartReviewCallbackData('fa:ok:staging-1'), {
    action: 'approve',
    stagingId: 'staging-1',
  });
  assert.deepEqual(parseFanartReviewCallbackData('fa:hold:staging-2'), {
    action: 'hold',
    stagingId: 'staging-2',
  });
  assert.deepEqual(parseFanartReviewCallbackData('fa:no:staging-3'), {
    action: 'reject',
    stagingId: 'staging-3',
  });
  assert.equal(parseFanartReviewCallbackData('fa:maybe:staging-4'), null);
  assert.equal(parseFanartReviewCallbackData('unknown'), null);
  assert.equal(parseFanartReviewCallbackData(undefined), null);
});

test('buildFanartReviewPhotoCaption keeps short messages and source links intact', () => {
  assert.equal(
    buildFanartReviewPhotoCaption('FanArt', 'body & more', 'https://example.test/tweet?id=1&lang=zh'),
    '<b>FanArt</b>\n\nbody &amp; more\n\n<a href="https://example.test/tweet?id=1&amp;lang=zh">開啟原推文</a>'
  );
});

test('buildFanartReviewPhotoCaption safely truncates long escaped bodies', () => {
  const caption = buildFanartReviewPhotoCaption('FanArt', `內容 & ${'<'.repeat(1200)}`, 'https://example.test/tweet');

  assert.ok(caption.length <= 1024);
  assert.ok(caption.startsWith('<b>FanArt</b>\n\n'));
  assert.ok(caption.endsWith('…'));
  assert.equal(caption.includes('<a href='), false);
  assert.equal(caption.endsWith('&…'), false);
});

test('syncArtistTopicName returns false when artist id or name is blank', async () => {
  assert.equal(await syncArtistTopicName('', 'New Artist'), false);
  assert.equal(await syncArtistTopicName('artist-id', '   '), false);
});

test('getTopicIdForFanartReview creates a name-keyed topic when separate topic has no artist handle', async () => {
  const ensuredTopics: Array<{ key: string; name: string }> = [];
  __testSetTelegramTopicState({
    topicIds: { notification: 10, fanart: 20, fallback: 30 },
    findArtistForTopic: async () => null,
    ensureArtistTopic: async (key, name) => {
      ensuredTopics.push({ key, name });
      return 777;
    },
  });

  try {
    const topicId = await __testResolveTopicIdForFanartReview({
      contentType: 'fanart',
      artistName: 'kinutani_yutaka',
      artistHandle: '',
      separateTopic: true,
    });

    assert.equal(topicId, 777);
    assert.deepEqual(ensuredTopics, [{ key: 'name:kinutani_yutaka', name: 'kinutani_yutaka' }]);
  } finally {
    __testSetTelegramTopicState();
  }
});

test('getTopicIdForFanartReview prefers label as separate topic name', async () => {
  const ensuredTopics: Array<{ key: string; name: string }> = [];
  __testSetTelegramTopicState({
    topicIds: { notification: 10, fanart: 20, fallback: 30 },
    findArtistForTopic: async () => null,
    ensureArtistTopic: async (key, name) => {
      ensuredTopics.push({ key, name });
      return 778;
    },
  });

  try {
    const topicId = await __testResolveTopicIdForFanartReview({
      contentType: 'fanart',
      artistName: 'RSS Display Name',
      artistHandle: 'manual_artist',
      separateTopic: true,
      label: 'Pinned Label',
    });

    assert.equal(topicId, 778);
    assert.deepEqual(ensuredTopics, [{ key: 'handle:manual_artist', name: 'Pinned Label' }]);
  } finally {
    __testSetTelegramTopicState();
  }
});

test('getTopicIdForFanartReview sends unknown official content to fallback topic', async () => {
  __testSetTelegramTopicState({
    topicIds: { notification: 10, fanart: 20, fallback: 30 },
    findArtistForTopic: async () => null,
  });

  try {
    const topicId = await __testResolveTopicIdForFanartReview({
      contentType: 'official',
      artistName: 'Unknown Official',
      artistHandle: 'unknown_official',
    });

    assert.equal(topicId, 30);
  } finally {
    __testSetTelegramTopicState();
  }
});
