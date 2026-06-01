import assert from 'node:assert/strict';
import test from 'node:test';
import {
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
