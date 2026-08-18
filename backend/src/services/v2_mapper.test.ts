import assert from 'node:assert/strict';
import test from 'node:test';

import { getExistingMediaUpdates, getNewMediaType } from './v2_mapper.js';

test('getNewMediaType defaults only new media to image', () => {
  assert.equal(getNewMediaType(undefined), 'image');
  assert.equal(getNewMediaType('video'), 'video');
});

test('getExistingMediaUpdates preserves an existing video type when media_type is omitted', () => {
  const updates = getExistingMediaUpdates(
    { media_type: 'video', thumbnail_url: 'poster.jpg', url: 'video.mp4' },
    { url: 'video.mp4' },
  );

  assert.equal(Object.hasOwn(updates, 'media_type'), false);
});

test('getExistingMediaUpdates persists an explicit media_type change', () => {
  const updates = getExistingMediaUpdates(
    { media_type: 'video', thumbnail_url: 'poster.jpg', url: 'video.mp4' },
    { media_type: 'gif', url: 'video.mp4' },
  );

  assert.equal(updates.media_type, 'gif');
});

test('getExistingMediaUpdates distinguishes omitted thumbnail from an explicit clear', () => {
  const existing = { media_type: 'video', thumbnail_url: 'poster.jpg', url: 'video.mp4' };

  assert.equal(Object.hasOwn(getExistingMediaUpdates(existing, { url: 'video.mp4' }), 'thumbnail_url'), false);
  assert.equal(getExistingMediaUpdates(existing, { thumbnail_url: null, url: 'video.mp4' }).thumbnail_url, null);
  assert.equal(getExistingMediaUpdates(existing, { thumbnail_url: '', url: 'video.mp4' }).thumbnail_url, null);
});
