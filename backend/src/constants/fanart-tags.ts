/**
 * Fanart 允許的特殊標籤
 * 用於投稿、審核、畫廊等場景的標籤校驗
 */
export const FANART_ALLOWED_TAGS = ['tag:collab', 'tag:acane', 'tag:real', 'tag:uniguri', 'tag:other'] as const;

/** 用於 Set 快速查找的版本 */
export const FANART_ALLOWED_TAGS_SET = new Set<string>(FANART_ALLOWED_TAGS);
