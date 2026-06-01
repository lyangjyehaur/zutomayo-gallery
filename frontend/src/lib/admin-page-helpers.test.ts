import { describe, expect, it } from 'vitest';

import {
  getAdminChangedData,
  getAdminVisibleImages,
  isAdminFieldIncomplete,
  isAdminMVIncomplete,
} from './admin-page-helpers';

describe('admin page helpers', () => {
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
