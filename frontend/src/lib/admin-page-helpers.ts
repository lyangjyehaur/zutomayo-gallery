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

export const getAdminVisibleImages = (
  images: any[] | undefined,
  imageTypeTab: AdminImageTypeTab,
  imageDisplayLimit: number,
) => {
  return (images || [])
    .map((img, originalIndex) => ({ img, originalIndex }))
    .filter(({ img }) => {
      if (imageTypeTab === 'fanart') return img.type === 'fanart';
      return img.type === 'official';
    })
    .filter(({ img }) => img.usage !== 'cover' && img.type !== 'cover')
    .slice(0, imageDisplayLimit);
};

export const isAdminVideoPreview = (img: any) => img?.media_type === 'video' || img?.media_type === 'gif';

export const getAdminChangedData = (
  data: MVItem[],
  originalData: MVItem[],
  changedFields: Map<string, Set<string>>,
  deletedIds: Set<string>,
): MVItem[] & { _deleted?: string[] } => {
  const result: MVItem[] & { _deleted?: string[] } = [];
  const originalById = new Map(originalData.map((mv) => [mv.id, mv]));

  data.forEach((mv) => {
    const changed = changedFields.get(mv.id);
    const tracked = !!changed && changed.size > 0;
    const original = originalById.get(mv.id);
    const differsFromOriginal = !original || JSON.stringify(original) !== JSON.stringify(mv);

    if (tracked || differsFromOriginal) {
      result.push({ ...mv });
    }
  });

  if (deletedIds.size > 0) {
    result._deleted = Array.from(deletedIds);
  }

  return result;
};
