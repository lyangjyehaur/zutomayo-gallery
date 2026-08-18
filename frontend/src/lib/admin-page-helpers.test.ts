import { describe, expect, it } from 'vitest';

import {
  getAdminChangedData,
  getAdminVisibleImageCount,
  getAdminVisibleImages,
  getTwitterMediaIdentity,
  isAdminFieldIncomplete,
  isAdminMVIncomplete,
  mapTwitterMediaToMVMedia,
} from './admin-page-helpers';

describe('admin page helpers', () => {
  it.each([
    ['https://pbs.twimg.com/media/ABC123?format=jpg&name=orig', 'image:ABC123'],
    ['https://video.twimg.com/ext_tw_video/111/pu/vid/video.mp4', 'ext-video:111'],
    ['https://pbs.twimg.com/ext_tw_video_thumb/111/pu/img/poster.jpg', 'ext-video:111'],
    ['https://video.twimg.com/amplify_video/222/vid/video.mp4', 'amplify-video:222'],
    ['https://pbs.twimg.com/amplify_video_thumb/222/img/poster.jpg', 'amplify-video:222'],
    ['https://video.twimg.com/tweet_video/GIF_ID.mp4', 'tweet-video:GIF_ID'],
    ['https://pbs.twimg.com/tweet_video_thumb/GIF_ID.jpg', 'tweet-video:GIF_ID'],
  ])('normalizes Twitter media identity for %s', (url, expected) => {
    expect(getTwitterMediaIdentity(url)).toBe(expected);
  });

  it.each(['image', 'video', 'gif'] as const)('maps resolved Twitter %s media to the MV contract', (mediaType) => {
    const mapped = mapTwitterMediaToMVMedia({
      url: `https://example.com/${mediaType}`,
      type: mediaType,
      thumbnail: 'https://example.com/poster.jpg',
      text: 'tweet text',
      user_screen_name: 'artist',
    }, {
      classification: 'fanart',
      sourceUrl: 'https://x.com/artist/status/1',
    });

    expect(mapped).toMatchObject({
      url: `https://example.com/${mediaType}`,
      thumbnail_url: 'https://example.com/poster.jpg',
      media_type: mediaType,
      type: 'fanart',
      group: {
        source_url: 'https://x.com/artist/status/1',
        source_text: 'tweet text',
        author_handle: 'artist',
        status: 'organized',
      },
    });
    expect(mapped).not.toHaveProperty('thumbnail');
  });

  it('uses the same mapper to enrich an existing item without changing gallery classification', () => {
    const mapped = mapTwitterMediaToMVMedia({
      url: 'https://video.twimg.com/ext_tw_video/1/vid/video.mp4',
      type: 'video',
      thumbnail: 'https://pbs.twimg.com/ext_tw_video_thumb/1/poster.jpg',
    }, {
      classification: 'official',
      sourceUrl: 'https://x.com/artist/status/1',
      existing: { type: 'fanart', url: 'old.jpg', caption: 'keep me' },
    });

    expect(mapped).toMatchObject({
      type: 'fanart',
      media_type: 'video',
      url: 'https://video.twimg.com/ext_tw_video/1/vid/video.mp4',
      thumbnail_url: 'https://pbs.twimg.com/ext_tw_video_thumb/1/poster.jpg',
      caption: 'keep me',
    });
  });

  it('keeps cosplay images out of the official image tab', () => {
    const images = [
      { id: 'official', type: 'official', url: 'official.jpg' },
      { id: 'cosplay', type: 'cosplay', url: 'cosplay.jpg' },
      { id: 'fanart', type: 'fanart', url: 'fanart.jpg' },
      { id: 'cover', type: 'official', usage: 'cover', url: 'cover.jpg' },
    ];

    expect(getAdminVisibleImages(images, 'official', 24).map(({ img }) => img.id)).toEqual(['official']);
    expect(getAdminVisibleImages(images, 'fanart', 24).map(({ img }) => img.id)).toEqual(['fanart']);
  });

  it('getAdminVisibleImageCount returns filtered total matching the visible list (ignores pagination)', () => {
    const images = [
      { id: 'official1', type: 'official', url: 'a.jpg' },
      { id: 'official2', type: 'official', url: 'b.jpg' },
      { id: 'cosplay', type: 'cosplay', url: 'c.jpg' },
      { id: 'fanart1', type: 'fanart', url: 'd.jpg' },
      { id: 'fanart2', type: 'fanart', url: 'e.jpg' },
      { id: 'cover', type: 'official', usage: 'cover', url: 'f.jpg' },
    ];

    // official tab：3 張 official，但 1 張是 cover，應為 2
    expect(getAdminVisibleImageCount(images, 'official')).toBe(2);
    // fanart tab：2 張 fanart
    expect(getAdminVisibleImageCount(images, 'fanart')).toBe(2);
    // 計數不受分頁 limit 影響（即使 limit=1，總數仍應為 2）
    expect(getAdminVisibleImages(images, 'official', 1).map(({ img }) => img.id)).toEqual(['official1']);
    expect(getAdminVisibleImageCount(images, 'official')).toBe(2);
    // undefined / 空 images
    expect(getAdminVisibleImageCount(undefined, 'official')).toBe(0);
    expect(getAdminVisibleImageCount([], 'official')).toBe(0);
  });

  it('does not mark numeric zero as incomplete', () => {
    expect(isAdminFieldIncomplete(0)).toBe(false);
    expect(isAdminFieldIncomplete(null)).toBe(true);
    expect(isAdminFieldIncomplete(undefined)).toBe(true);
    expect(isAdminFieldIncomplete('')).toBe(true);
    expect(isAdminFieldIncomplete([])).toBe(true);
  });

  it('only requires id, title, and one image url for MV completeness', () => {
    expect(isAdminMVIncomplete({
      id: 'mv-1',
      title: 'MV title',
      year: '',
      date: '',
      youtube: '',
      bilibili: null,
      description: '',
      heroVideo: null,
      images: [{ type: 'official', url: 'https://example.com/image.jpg', width: 0, height: 0 }],
      creators: [],
      albums: [],
      keywords: [],
    } as any)).toBe(false);

    expect(isAdminMVIncomplete({ id: '', title: 'MV title', images: [{ url: 'https://example.com/image.jpg' }] } as any)).toBe(true);
    expect(isAdminMVIncomplete({ id: 'mv-1', title: '  ', images: [{ url: 'https://example.com/image.jpg' }] } as any)).toBe(true);
    expect(isAdminMVIncomplete({ id: 'mv-1', title: 'MV title', images: [{ url: ' ' }] } as any)).toBe(true);
  });

  it('includes modified MVs even if explicit changed-field tracking missed the edit', () => {
    const originalData = [
      { id: 'mv-1', title: 'Old title', year: '2024', images: [] },
      { id: 'mv-2', title: 'Same title', year: '2024', images: [] },
    ] as any[];
    const data = [
      { id: 'mv-1', title: 'New title', year: '2024', images: [] },
      { id: 'mv-2', title: 'Same title', year: '2024', images: [] },
    ] as any[];

    expect(getAdminChangedData(data, originalData, new Map(), new Set())).toEqual([
      { id: 'mv-1', title: 'New title' },
    ]);
  });

  it('returns only explicitly tracked changed fields for existing MVs', () => {
    const originalData = [
      {
        id: 'mv-1',
        title: 'Old title',
        year: '2024',
        images: [{ type: 'official', url: 'old.jpg', width: 100, height: 100 }],
      },
    ] as any[];
    const data = [
      {
        id: 'mv-1',
        title: 'New title',
        year: '2024',
        images: [{ type: 'official', url: 'old.jpg', width: 100, height: 100 }],
      },
    ] as any[];

    expect(getAdminChangedData(data, originalData, new Map([['mv-1', new Set(['title'])]]), new Set())).toEqual([
      { id: 'mv-1', title: 'New title' },
    ]);
  });

  it('preserves nested tracked field paths without sending unrelated MV fields', () => {
    const originalData = [
      {
        id: 'mv-1',
        title: 'Title',
        images: [{ type: 'official', url: 'old.jpg', width: 100, height: 100 }],
      },
    ] as any[];
    const data = [
      {
        id: 'mv-1',
        title: 'Title',
        images: [{ type: 'official', url: 'new.jpg', width: 100, height: 100 }],
      },
    ] as any[];

    expect(getAdminChangedData(data, originalData, new Map([['mv-1', new Set(['images.0.url'])]]), new Set())).toEqual([
      { id: 'mv-1', images: [{ url: 'new.jpg' }] },
    ]);
  });
});
