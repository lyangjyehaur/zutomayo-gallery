import type { MVItem } from './types';

export type AdminImageTypeTab = 'official' | 'fanart';

export const isAdminFieldIncomplete = (val: any) => {
  if (val === undefined || val === null) return true;
  if (typeof val === 'string') return val.trim() === '';
  if (Array.isArray(val)) return val.length === 0;
  return false;
};

export const isAdminMVIncomplete = (mv: MVItem) => {
  if (!mv.id || !mv.title?.trim()) return true;

  if (!mv.images || mv.images.length === 0) return true;

  return !mv.images.some((img) => img.url && img.url.trim() !== '');
};

// 過濾出當前 tab 可見的圖片（依 type + 排除 cover），保留 originalIndex。
// 注意：不 slice，呼叫端自行處理分頁。
const filterAdminVisibleImages = (
  images: any[] | undefined,
  imageTypeTab: AdminImageTypeTab,
) => (images || [])
  .map((img, originalIndex) => ({ img, originalIndex }))
  .filter(({ img }) => {
    if (imageTypeTab === 'fanart') return img.type === 'fanart';
    return img.type === 'official';
  })
  .filter(({ img }) => img.usage !== 'cover' && img.type !== 'cover');

export const getAdminVisibleImages = (
  images: any[] | undefined,
  imageTypeTab: AdminImageTypeTab,
  imageDisplayLimit: number,
) => filterAdminVisibleImages(images, imageTypeTab).slice(0, imageDisplayLimit);

// 當前 tab 過濾後（排除 cover）的總數，不受分頁 limit 影響。
// 用於 UI 顯示「總數」，確保與列表實際可見數量一致。
export const getAdminVisibleImageCount = (
  images: any[] | undefined,
  imageTypeTab: AdminImageTypeTab,
): number => filterAdminVisibleImages(images, imageTypeTab).length;

export const isAdminVideoPreview = (img: any) => img?.media_type === 'video' || img?.media_type === 'gif';

export const getAdminChangedData = (
  data: MVItem[],
  originalData: MVItem[],
  changedFields: Map<string, Set<string>>,
  deletedIds: Set<string>,
): MVItem[] & { _deleted?: string[] } => {
  const result: any[] & { _deleted?: string[] } = [];
  const originalById = new Map(originalData.map((mv) => [mv.id, mv]));

  data.forEach((mv) => {
    const changed = changedFields.get(mv.id);
    const tracked = !!changed && changed.size > 0;
    const original = originalById.get(mv.id);

    if (!original) {
      result.push({ ...mv });
      return;
    }

    if (!tracked) {
      const diff = findDiff(original, mv);
      if (Object.keys(diff).length > 0) {
        result.push({ id: mv.id, ...diff });
      }
      return;
    }

    const partial: any = { id: mv.id };
    changed.forEach((fieldPath) => {
      setNestedValue(partial, fieldPath, getNestedValue(mv, fieldPath));
    });
    result.push(partial);
  });

  if (deletedIds.size > 0) {
    result._deleted = Array.from(deletedIds);
  }

  return result;
};

const toPathKey = (part: string) => {
  const numeric = Number(part);
  return Number.isInteger(numeric) && String(numeric) === part ? numeric : part;
};

const getNestedValue = (obj: any, path: string) => {
  return path.split('.').reduce((current, part) => current?.[toPathKey(part)], obj);
};

const setNestedValue = (obj: any, path: string, value: any) => {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = toPathKey(parts[i]);
    const nextKey = toPathKey(parts[i + 1]);

    if (current[key] === undefined) {
      current[key] = typeof nextKey === 'number' ? [] : {};
    }
    current = current[key];
  }

  current[toPathKey(parts[parts.length - 1])] = value;
};

const findDiff = (original: any, current: any) => {
  const diff: any = {};

  Object.keys(current).forEach((key) => {
    if (key === 'id') return;
    if (JSON.stringify(original?.[key]) !== JSON.stringify(current[key])) {
      diff[key] = current[key];
    }
  });

  return diff;
};
