import { describe, expect, it } from 'vitest';

import {
  getAdminChangedData,
  getAdminVisibleImages,
  isAdminFieldIncomplete,
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

  it('includes modified MVs even if explicit changed-field tracking missed the edit', () => {
    const originalData = [
      { id: 'mv-1', title: 'Old title', year: '2024', images: [] },
      { id: 'mv-2', title: 'Same title', year: '2024', images: [] },
    ] as any[];
    const data = [
      { id: 'mv-1', title: 'New title', year: '2024', images: [] },
      { id: 'mv-2', title: 'Same title', year: '2024', images: [] },
    ] as any[];

    expect(getAdminChangedData(data, originalData, new Map(), new Set()).map((mv) => mv.id)).toEqual(['mv-1']);
  });
});
