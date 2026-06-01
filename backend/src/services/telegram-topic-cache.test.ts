import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deserializeArtistTopicIds,
  serializeArtistTopicIds,
} from './telegram-topic-cache.js';

test('deserializeArtistTopicIds ignores legacy name-to-number entries', () => {
  const topics = deserializeArtistTopicIds({
    old_artist_name: 123,
    'artist-id-1': { name: 'ACAね', thread_id: 456 },
  });

  assert.deepEqual(Object.fromEntries(topics), {
    'artist-id-1': { name: 'ACAね', thread_id: 456 },
  });
});

test('serializeArtistTopicIds preserves artist ids and entry metadata', () => {
  const topics = new Map([
    ['artist-id-1', { name: 'Artist One', thread_id: 111 }],
    ['artist-id-2', { name: 'Artist Two', thread_id: 222 }],
  ]);

  assert.deepEqual(serializeArtistTopicIds(topics), {
    'artist-id-1': { name: 'Artist One', thread_id: 111 },
    'artist-id-2': { name: 'Artist Two', thread_id: 222 },
  });
});
