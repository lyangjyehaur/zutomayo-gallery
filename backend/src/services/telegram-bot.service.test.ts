import assert from 'node:assert/strict';
import test from 'node:test';
import {
  __testResolveTopicIdForFanartReview,
  __testSetTelegramTopicState,
  buildFanartReviewCallbackData,
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
