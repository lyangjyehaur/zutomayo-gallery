import type { MVItem, MVMedia } from './types';

export type AdminImageTypeTab = 'official' | 'fanart';

export interface ResolvedTwitterMedia {
  url: string;
  type?: string;
  thumbnail?: string;
  text?: string;
  user_name?: string;
  user_screen_name?: string;
  date?: string;
}

const TWITTER_MEDIA_PATHS = [
  { family: 'image', pattern: /\/media\/([a-zA-Z0-9_-]+)/ },
  { family: 'ext-video', pattern: /\/(?:ext_tw_video|ext_tw_video_thumb)\/([a-zA-Z0-9_-]+)/ },
  { family: 'amplify-video', pattern: /\/(?:amplify_video|amplify_video_thumb)\/([a-zA-Z0-9_-]+)/ },
  { family: 'tweet-video', pattern: /\/(?:tweet_video|tweet_video_thumb)\/([a-zA-Z0-9_-]+)/ },
] as const;

export const getTwitterMediaIdentity = (url: string): string | null => {
  if (!url) return null;
  for (const { family, pattern } of TWITTER_MEDIA_PATHS) {
    const match = url.match(pattern);
    if (match) return `${family}:${match[1]}`;
  }

  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return `url:${parsed.toString()}`;
  } catch {
    return `url:${url}`;
  }
};

const normalizeTwitterMediaType = (type: string | undefined): 'image' | 'video' | 'gif' => {
  if (type === 'video' || type === 'gif') return type;
  return 'image';
};

export const mapTwitterMediaToMVMedia = (
  media: ResolvedTwitterMedia,
  options: {
    classification: AdminImageTypeTab;
    sourceUrl: string;
    existing?: Partial<MVMedia>;
    defaults?: Partial<MVMedia>;
  },
): MVMedia => {
  const existing = options.existing || {};
  const thumbnailUrl = media.thumbnail || existing.thumbnail_url;

  return {
    ...options.defaults,
    ...existing,
    url: media.url,
    type: existing.type || options.classification,
    media_type: normalizeTwitterMediaType(media.type),
    thumbnail_url: thumbnailUrl || undefined,
    group: {
      ...(existing.group || {}),
      source_url: existing.group?.source_url || options.sourceUrl,
      source_text: existing.group?.source_text || media.text,
      author_name: existing.group?.author_name || media.user_name,
      author_handle: existing.group?.author_handle || media.user_screen_name,
      post_date: existing.group?.post_date || media.date,
      status: existing.group?.status || 'organized',
    },
  } as MVMedia;
};

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
