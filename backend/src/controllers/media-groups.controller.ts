import { Request, Response } from 'express';
import { QueryTypes } from 'sequelize';
import { nanoid } from 'nanoid';
import { MediaGroupModel, MediaModel, MVModel, MVMediaModel, sequelize } from '../models/index.js';
import { TwitterService } from '../services/twitter.service.js';
import { backupImageToR2 } from '../services/r2.service.js';
import { errorEventEmitter } from '../services/error-events.service.js';
import { logger } from '../utils/logger.js';
import { isTweetSourceMedia } from '../utils/media-source.js';

const clampInt = (value: unknown, fallback: number, min: number, max: number): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
};

const buildLikePatternSql = (
  columns: string[],
  patterns: string[],
  replacements: Record<string, any>,
  prefix: string,
) => {
  return patterns
    .map((pattern, idx) => {
      const key = `${prefix}${idx}`;
      replacements[key] = pattern;
      return `(${columns.map((column) => `${column} ILIKE :${key}`).join(' OR ')})`;
    })
    .join(' OR ');
};

const buildTweetGroupSql = (groupAlias: string, mediaAlias: string, replacements: Record<string, any>) => {
  const sourceSql = buildLikePatternSql(
    [`${groupAlias}.source_url`],
    ['%x.com/%/status/%', '%twitter.com/%/status/%', '%mobile.twitter.com/%/status/%'],
    replacements,
    `${groupAlias}_source_`,
  );
  const mediaSql = buildLikePatternSql(
    [`${mediaAlias}.url`, `${mediaAlias}.original_url`],
    ['%pbs.twimg.com%', '%video.twimg.com%'],
    replacements,
    `${mediaAlias}_media_`,
  );
  return `(${sourceSql} OR EXISTS (SELECT 1 FROM media ${mediaAlias} WHERE ${mediaAlias}.group_id = ${groupAlias}.id AND (${mediaSql})))`;
};

export const listMediaGroups = async (req: Request, res: Response) => {
  const limit = clampInt(req.query.limit, 50, 1, 200);
  const offset = clampInt(req.query.offset, 0, 0, 1000000);
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  const whereClauses: string[] = [];
  const replacements: Record<string, any> = { limit, offset };
  const tweetGroupSql = buildTweetGroupSql('g', 'm0', replacements);

  if (status) {
    whereClauses.push(`g.status = :status`);
    replacements.status = status;
  }
  if (q) {
    whereClauses.push(
      `(g.source_url ILIKE :q OR g.author_handle ILIKE :q OR g.author_name ILIKE :q OR g.source_text ILIKE :q)`,
    );
    replacements.q = `%${q}%`;
  }
  whereClauses.push(tweetGroupSql);

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const mediaJoinSql = buildLikePatternSql(
    ['m.url', 'm.original_url'],
    ['%pbs.twimg.com%', '%video.twimg.com%'],
    replacements,
    'm_media_',
  );

  const countRow = await sequelize.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM media_groups g ${whereSql}`,
    { type: QueryTypes.SELECT, replacements },
  );
  const total = countRow?.[0]?.total || 0;

  const rows = await sequelize.query<any>(
    `
    SELECT
      g.*,
      COUNT(m.id)::int AS media_count,
      COUNT(DISTINCT mm.mv_id)::int AS mv_count
    FROM media_groups g
    LEFT JOIN media m ON m.group_id = g.id AND (${mediaJoinSql})
    LEFT JOIN mv_media mm ON mm.media_id = m.id
    ${whereSql}
    GROUP BY g.id
    ORDER BY g.post_date DESC NULLS LAST, g.id DESC
    LIMIT :limit OFFSET :offset
    `,
    { type: QueryTypes.SELECT, replacements },
  );

  res.json({ success: true, data: { items: rows, total, limit, offset } });
};

export const getMediaGroup = async (req: Request, res: Response) => {
  const { id } = req.params;
  const group = await MediaGroupModel.findByPk(id, {
    include: [
      {
        model: MediaModel,
        as: 'images',
        include: [
          {
            model: MVModel,
            as: 'mvs',
            attributes: ['id', 'title'],
            through: { attributes: ['usage', 'order_index'] },
            required: false,
          },
        ],
        required: false,
      },
    ],
  });
  if (!group) {
    res.status(404).json({ success: false, error: '找不到此媒體群組', code: 'GROUP_NOT_FOUND' });
    return;
  }
  const data = group.toJSON() as any;
  if (Array.isArray(data.images)) {
    data.images = data.images.filter((img: any) => isTweetSourceMedia(img));
  }
  res.json({ success: true, data });
};

export const updateMediaGroup = async (req: Request, res: Response) => {
  const { id } = req.params;
  const group = await MediaGroupModel.findByPk(id);
  if (!group) {
    res.status(404).json({ success: false, error: '找不到此媒體群組', code: 'GROUP_NOT_FOUND' });
    return;
  }

  const {
    title,
    source_url,
    source_text,
    author_name,
    author_handle,
    post_date,
    status,
  } = (req.body || {}) as any;

  const update: any = {};
  if (title !== undefined) update.title = typeof title === 'string' ? title : null;
  if (source_url !== undefined) update.source_url = typeof source_url === 'string' ? source_url : null;
  if (source_text !== undefined) update.source_text = typeof source_text === 'string' ? source_text : null;
  if (author_name !== undefined) update.author_name = typeof author_name === 'string' ? author_name : null;
  if (author_handle !== undefined) update.author_handle = typeof author_handle === 'string' ? author_handle : null;
  if (post_date !== undefined) update.post_date = typeof post_date === 'string' && post_date ? new Date(post_date) : null;
  if (status !== undefined) update.status = typeof status === 'string' ? status : null;

  await group.update(update);
  res.json({ success: true, data: group.toJSON() });
};

export const syncMediaRelations = async (req: Request, res: Response) => {
  const { mediaId } = req.params;
  const { relations } = (req.body || {}) as any;

  const media = await MediaModel.findByPk(mediaId);
  if (!media) {
    res.status(404).json({ success: false, error: '找不到此媒體', code: 'MEDIA_NOT_FOUND' });
    return;
  }

  const raw = Array.isArray(relations) ? relations : [];
  const mvIds = raw.filter((m: any) => typeof m === 'string' && !m.startsWith('tag:'));
  const tags = Array.from(new Set(raw.filter((m: any) => typeof m === 'string' && m.startsWith('tag:'))));

  await media.update({ tags });

  const existingLinks = await MVMediaModel.findAll({
    where: { media_id: mediaId },
    attributes: ['mv_id'],
  });
  const existingMvIds = new Set(existingLinks.map((r) => r.get('mv_id') as string));
  const nextMvIds = new Set(mvIds);
  const toDelete = Array.from(existingMvIds).filter((id) => !nextMvIds.has(id));
  const toAdd = mvIds.filter((id) => !existingMvIds.has(id));

  if (toDelete.length > 0) {
    await MVMediaModel.destroy({ where: { media_id: mediaId, mv_id: toDelete } });
  }

  if (toAdd.length > 0) {
    const records = toAdd.map((mvId: string) => ({
      mv_id: mvId,
      media_id: mediaId,
      usage: 'gallery',
      order_index: 0,
    }));
    await MVMediaModel.bulkCreate(records, { ignoreDuplicates: true });
  }

  res.json({ success: true, data: true });
};

export const listRepairMediaGroups = async (req: Request, res: Response) => {
  const limit = clampInt(req.query.limit, 50, 1, 200);
  const offset = clampInt(req.query.offset, 0, 0, 1000000);
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const showAll = req.query.all === 'true' || req.query.all === '1';

  const whereClauses: string[] = [];
  const replacements: Record<string, any> = { limit, offset };
  const tweetGroupSql = buildTweetGroupSql('g', 'm0', replacements);

  if (!showAll) {
    whereClauses.push(`(g.source_url IS NULL OR g.source_url = '' OR g.post_date IS NULL)`);
  }

  if (q) {
    whereClauses.push(
      `(g.id ILIKE :q OR g.source_url ILIKE :q OR g.author_handle ILIKE :q OR g.author_name ILIKE :q OR g.source_text ILIKE :q)`,
    );
    replacements.q = `%${q}%`;
  }
  whereClauses.push(tweetGroupSql);

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
  const mediaJoinSql = buildLikePatternSql(
    ['m.url', 'm.original_url'],
    ['%pbs.twimg.com%', '%video.twimg.com%'],
    replacements,
    'm_media_',
  );

  const countRow = await sequelize.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM media_groups g ${whereSql}`,
    { type: QueryTypes.SELECT, replacements },
  );
  const total = countRow?.[0]?.total || 0;

  const rows = await sequelize.query<any>(
    `
    SELECT
      g.*,
      COUNT(m.id)::int AS media_count,
      COUNT(DISTINCT mm.mv_id)::int AS mv_count,
      COALESCE(sm.url, sm.original_url) AS preview_url,
      sm.url AS sample_url,
      sm.original_url AS sample_original_url,
      (g.source_url IS NULL OR g.source_url = '') AS missing_source_url,
      (g.post_date IS NULL) AS missing_post_date
    FROM media_groups g
    LEFT JOIN media m ON m.group_id = g.id AND (${mediaJoinSql})
    LEFT JOIN mv_media mm ON mm.media_id = m.id
    LEFT JOIN LATERAL (
      SELECT m2.url, m2.original_url
      FROM media m2
      WHERE m2.group_id = g.id
        AND (${buildLikePatternSql(['m2.url', 'm2.original_url'], ['%pbs.twimg.com%', '%video.twimg.com%'], replacements, 'm2_media_')})
      ORDER BY m2.created_at ASC NULLS LAST, m2.id ASC
      LIMIT 1
    ) sm ON true
    ${whereSql}
    GROUP BY g.id, sm.url, sm.original_url
    ORDER BY g.post_date DESC NULLS LAST, g.id DESC
    LIMIT :limit OFFSET :offset
    `,
    { type: QueryTypes.SELECT, replacements },
  );

  res.json({ success: true, data: { items: rows, total, limit, offset } });
};

export const mergeMediaGroups = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { target_group_id, target_source_url, carry_fields } = (req.body || {}) as any;

  const source = await MediaGroupModel.findByPk(id);
  if (!source) {
    res.status(404).json({ success: false, error: '找不到此媒體群組', code: 'GROUP_NOT_FOUND' });
    return;
  }

  const shouldCarry = carry_fields !== false;

  let target: any = null;
  if (typeof target_group_id === 'string' && target_group_id) {
    target = await MediaGroupModel.findByPk(target_group_id);
  } else if (typeof target_source_url === 'string' && target_source_url.trim()) {
    const url = target_source_url.trim();
    target = await MediaGroupModel.findOne({ where: { source_url: url } as any });
    if (!target) {
      const src = source.toJSON ? (source.toJSON() as any) : (source as any);
      target = await MediaGroupModel.create({
        source_url: url,
        source_text: src.source_text ?? null,
        author_name: src.author_name ?? null,
        author_handle: src.author_handle ?? null,
        post_date: src.post_date ?? null,
        status: src.status ?? 'pending',
      } as any);
    }
  }

  if (!target) {
    res.status(400).json({ success: false, error: '請指定合併目標', code: 'TARGET_REQUIRED' });
    return;
  }

  if (String(target.get('id')) === String(source.get('id'))) {
    res.json({ success: true, data: true });
    return;
  }

  await sequelize.transaction(async (t) => {
    if (shouldCarry) {
      const src = source.toJSON ? (source.toJSON() as any) : (source as any);
      const tgt = target.toJSON ? (target.toJSON() as any) : (target as any);
      const update: any = {};
      if (!tgt.source_text && src.source_text) update.source_text = src.source_text;
      if (!tgt.author_name && src.author_name) update.author_name = src.author_name;
      if (!tgt.author_handle && src.author_handle) update.author_handle = src.author_handle;
      if (!tgt.post_date && src.post_date) update.post_date = src.post_date;
      if (!tgt.status && src.status) update.status = src.status;
      if (Object.keys(update).length > 0) {
        await target.update(update, { transaction: t });
      }
    }

    await MediaModel.update(
      { group_id: target.get('id') },
      { where: { group_id: source.get('id') } as any, transaction: t },
    );

    await source.destroy({ transaction: t });
  });

  res.json({ success: true, data: true });
};

export const unassignMediaGroup = async (req: Request, res: Response) => {
  const { id } = req.params;
  const group = await MediaGroupModel.findByPk(id);
  if (!group) {
    res.status(404).json({ success: false, error: '找不到此媒體群組', code: 'GROUP_NOT_FOUND' });
    return;
  }

  await sequelize.transaction(async (t) => {
    await MediaModel.update(
      { group_id: null },
      { where: { group_id: id } as any, transaction: t },
    );
    await group.destroy({ transaction: t });
  });

  res.json({ success: true, data: true });
};

// ==========================================
// Twitter Re-parse (Preview + Apply)
// ==========================================

const TWITTER_URL_PATTERN = /(?:twitter\.com|x\.com)/i;
const TWIMG_URL_PATTERN = /pbs\.twimg\.com|video\.twimg\.com/i;
const MAX_REPARSE_BATCH = 50;
const VXITTER_DELAY_MS = 1500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isEmpty = (v: any): boolean => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

const parseSelectedFields = (value: unknown): Map<string, Set<string>> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const map = new Map<string, Set<string>>();
  for (const [id, fields] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(fields)) continue;
    const selected = fields.filter((field): field is string => typeof field === 'string' && field.length > 0);
    map.set(id, new Set(selected));
  }
  return map;
};

const isFieldSelected = (selection: Map<string, Set<string>> | null, id: string, field: string): boolean => {
  if (!selection) return true;
  return selection.get(id)?.has(field) === true;
};

interface ParsedGroupMeta {
  source_url: string | null;
  source_text: string | null;
  author_name: string | null;
  author_handle: string | null;
  post_date: string | null;
  like_count: number | null;
  retweet_count: number | null;
  view_count: number | null;
  hashtags: string[] | null;
}

interface ParsedMediaMeta {
  thumbnail_url: string | null;
  media_type: string | null;
  url: string | null;
  original_url: string | null;
}

/**
 * 從 vxtwitter 回應中提取 group 層級的 meta 數據
 */
const extractGroupMetaFromTweet = (mediaList: any[]): ParsedGroupMeta => {
  const first = mediaList[0] || {};
  return {
    source_url: first.tweet_url || null,
    source_text: first.text || null,
    author_name: first.user_name || null,
    author_handle: first.user_screen_name || null,
    post_date: first.date || null,
    like_count: first.like_count ?? null,
    retweet_count: first.retweet_count ?? null,
    view_count: first.view_count ?? null,
    hashtags: first.hashtags ?? null,
  };
};

/**
 * 從 vxtwitter 回應中比對 media 記錄
 */
const matchParsedMedia = (
  existingMedia: any[],
  tweetMediaList: any[],
): {
  media_updates: Array<{
    media_id: string;
    action: 'update';
    current: ParsedMediaMeta;
    parsed: ParsedMediaMeta;
    diff: string[];
  }>;
  media_new: Array<{
    action: 'create';
    parsed: { url: string; original_url: string; thumbnail_url: string | null; media_type: string };
  }>;
} => {
  const media_updates: any[] = [];
  const media_new: any[] = [];

  const usedIndices = new Set<number>();

  for (const m of existingMedia) {
    const currentUrl = String(m.original_url || m.url || '');
    const matchedIdx = tweetMediaList.findIndex((tm, i) => {
      if (usedIndices.has(i)) return false;
      const tmUrl = String(tm.url || '');
      // 精確匹配 original_url
      if (currentUrl && tmUrl && currentUrl === tmUrl) return true;
      // 匹配 pbs.twimg.com 圖片的 base URL (不含格式參數)
      if (currentUrl && tmUrl && currentUrl.replace(/\?.*$/, '') === tmUrl.replace(/\?.*$/, '')) return true;
      return false;
    });

    if (matchedIdx >= 0) {
      usedIndices.add(matchedIdx);
      const tm = tweetMediaList[matchedIdx];
      const current: ParsedMediaMeta = {
        thumbnail_url: m.thumbnail_url || null,
        media_type: m.media_type || null,
        url: m.url || null,
        original_url: m.original_url || null,
      };
      let mediaType = tm.type === 'video' ? 'video' : (tm.type === 'animated_gif' || tm.type === 'gif' ? 'gif' : 'image');
      if (String(tm.url || '').includes('.mp4') || String(tm.url || '').includes('video.twimg.com')) {
        mediaType = 'video';
      }
      const parsed: ParsedMediaMeta = {
        thumbnail_url: tm.thumbnail || tm.thumbnail_url || null,
        media_type: mediaType,
        url: m.url || null, // 不改變已有的 R2 URL
        original_url: tm.url || m.original_url || null,
      };

      const diff = Object.keys(parsed).filter((k) => {
        const cv = String((current as any)[k] ?? '');
        const pv = String((parsed as any)[k] ?? '');
        return cv !== pv;
      });

      media_updates.push({ media_id: m.id, action: 'update', current, parsed, diff });
    }
  }

  // 新增的媒體
  for (let i = 0; i < tweetMediaList.length; i++) {
    if (usedIndices.has(i)) continue;
    const tm = tweetMediaList[i];
    let mediaType = tm.type === 'video' ? 'video' : (tm.type === 'animated_gif' || tm.type === 'gif' ? 'gif' : 'image');
    if (String(tm.url || '').includes('.mp4') || String(tm.url || '').includes('video.twimg.com')) {
      mediaType = 'video';
    }
    media_new.push({
      action: 'create',
      parsed: {
        url: tm.url,
        original_url: tm.url,
        thumbnail_url: tm.thumbnail || tm.thumbnail_url || null,
        media_type: mediaType,
      },
    });
  }

  return { media_updates, media_new };
};

/**
 * 計算 group 層級的 diff
 */
const computeGroupDiff = (current: any, parsed: ParsedGroupMeta, overwrite: boolean): string[] => {
  const fields = ['source_url', 'source_text', 'author_name', 'author_handle', 'post_date', 'like_count', 'retweet_count', 'view_count', 'hashtags'] as const;
  const diff: string[] = [];
  for (const field of fields) {
    const cv = current[field] ?? null;
    const pv = parsed[field] ?? null;
    if (field !== 'source_url' && !overwrite && !isEmpty(cv)) continue; // 只填充空值模式
    if (String(cv ?? '') !== String(pv ?? '')) {
      diff.push(field);
    }
  }
  return diff;
};

export const previewReparseTwitter = async (req: Request, res: Response) => {
  const { group_ids, overwrite } = (req.body || {}) as any;
  const ids: string[] = Array.isArray(group_ids) ? group_ids.filter((id: any) => typeof id === 'string' && id) : [];
  const shouldOverwrite = overwrite === true;

  if (ids.length === 0) {
    res.status(400).json({ success: false, error: '請提供 group_ids' });
    return;
  }
  if (ids.length > MAX_REPARSE_BATCH) {
    res.status(400).json({ success: false, error: `單次最多 ${MAX_REPARSE_BATCH} 個 group` });
    return;
  }

  const results: any[] = [];
  const errors: any[] = [];

  try {
    const groups = await MediaGroupModel.findAll({
      where: { id: ids } as any,
      include: [{ model: MediaModel, as: 'images', required: false }],
    });

    for (const group of groups) {
      const g = group.toJSON() as any;
      const sourceUrl = String(g.source_url || '');

      if (!TWITTER_URL_PATTERN.test(sourceUrl)) {
        errors.push({ group_id: g.id, error: '非推特來源' });
        continue;
      }

      try {
        const mediaList = await TwitterService.extractMediaFromTweet(sourceUrl);
        if (!mediaList || mediaList.length === 0) {
          errors.push({ group_id: g.id, error: '推文中沒有媒體' });
          continue;
        }

        const parsedGroupMeta = extractGroupMetaFromTweet(mediaList);
        const existingMedia = Array.isArray(g.images) ? g.images : [];
        const { media_updates, media_new } = matchParsedMedia(existingMedia, mediaList);

        const groupDiff = computeGroupDiff(g, parsedGroupMeta, shouldOverwrite);

        results.push({
          group_id: g.id,
          source_url: sourceUrl,
          current: {
            source_url: g.source_url ?? null,
            source_text: g.source_text ?? null,
            author_name: g.author_name ?? null,
            author_handle: g.author_handle ?? null,
            post_date: g.post_date ?? null,
            like_count: g.like_count ?? null,
            retweet_count: g.retweet_count ?? null,
            view_count: g.view_count ?? null,
            hashtags: g.hashtags ?? null,
          },
          parsed: parsedGroupMeta,
          diff: groupDiff,
          media_updates,
          media_new,
        });
      } catch (err: any) {
        errors.push({ group_id: g.id, error: String(err?.message || err) });
      }

      // vxtwitter API 限流間隔
      await sleep(VXITTER_DELAY_MS);
    }

    // 檢查是否有未找到的 group
    const foundIds = new Set(groups.map((g) => String((g as any).id)));
    for (const id of ids) {
      if (!foundIds.has(id)) {
        errors.push({ group_id: id, error: 'Group 不存在' });
      }
    }

    res.json({ success: true, data: { results, errors } });
  } catch (error: any) {
    logger.error({ err: error }, 'previewReparseTwitter failed');
    errorEventEmitter.emitError({
      source: 'request',
      message: `previewReparseTwitter failed: ${error?.message || error}`,
      stack: error?.stack,
      statusCode: 500,
      method: 'POST',
      url: '/api/admin/media-groups/reparse-twitter/preview',
    });
    res.status(500).json({ success: false, error: String(error?.message || error) });
  }
};

export const applyReparseTwitter = async (req: Request, res: Response) => {
  const { group_ids, overwrite, include_new_media, new_media_urls, selected_group_fields, selected_media_fields } = (req.body || {}) as any;
  const ids: string[] = Array.isArray(group_ids) ? group_ids.filter((id: any) => typeof id === 'string' && id) : [];
  const shouldOverwrite = overwrite === true;
  const shouldIncludeNewMedia = include_new_media === true;
  const allowedNewUrls = Array.isArray(new_media_urls)
    ? new Set(new_media_urls.filter((u: any) => typeof u === 'string'))
    : null; // null = 全部新增
  const selectedGroupFields = parseSelectedFields(selected_group_fields);
  const selectedMediaFields = parseSelectedFields(selected_media_fields);

  if (ids.length === 0) {
    res.status(400).json({ success: false, error: '請提供 group_ids' });
    return;
  }
  if (ids.length > MAX_REPARSE_BATCH) {
    res.status(400).json({ success: false, error: `單次最多 ${MAX_REPARSE_BATCH} 個 group` });
    return;
  }

  let updatedGroups = 0;
  let updatedMedia = 0;
  let newMedia = 0;
  let r2Backups = 0;
  let skipped = 0;
  const errors: any[] = [];

  try {
    const groups = await MediaGroupModel.findAll({
      where: { id: ids } as any,
      include: [{ model: MediaModel, as: 'images', required: false }],
    });

    for (const group of groups) {
      const g = group.toJSON() as any;
      const sourceUrl = String(g.source_url || '');

      if (!TWITTER_URL_PATTERN.test(sourceUrl)) {
        skipped++;
        continue;
      }

      try {
        const mediaList = await TwitterService.extractMediaFromTweet(sourceUrl);
        if (!mediaList || mediaList.length === 0) {
          skipped++;
          await sleep(VXITTER_DELAY_MS);
          continue;
        }

        // 更新 group meta
        const parsedGroupMeta = extractGroupMetaFromTweet(mediaList);
        const groupUpdate: any = {};
        const fields = ['source_url', 'source_text', 'author_name', 'author_handle', 'post_date', 'like_count', 'retweet_count', 'view_count', 'hashtags'] as const;
        for (const field of fields) {
          if (!isFieldSelected(selectedGroupFields, g.id, field)) continue;
          const cv = g[field] ?? null;
          const pv = (parsedGroupMeta as any)[field] ?? null;
          if (field !== 'source_url' && !shouldOverwrite && !isEmpty(cv)) continue;
          if (String(cv ?? '') !== String(pv ?? '')) {
            if (field === 'post_date' && pv) {
              groupUpdate[field] = new Date(pv);
            } else {
              groupUpdate[field] = pv;
            }
          }
        }
        if (Object.keys(groupUpdate).length > 0) {
          await group.update(groupUpdate);
          updatedGroups++;
        }

        // 更新已有 media meta + 補全 R2 備份
        const existingMedia = Array.isArray(g.images) ? g.images : [];
        const usedIndices = new Set<number>();

        for (const m of existingMedia) {
          const currentUrl = String(m.original_url || m.url || '');
          const matchedIdx = mediaList.findIndex((tm: any, i: number) => {
            if (usedIndices.has(i)) return false;
            const tmUrl = String(tm.url || '');
            if (currentUrl && tmUrl && currentUrl === tmUrl) return true;
            if (currentUrl && tmUrl && currentUrl.replace(/\?.*$/, '') === tmUrl.replace(/\?.*$/, '')) return true;
            return false;
          });

          if (matchedIdx >= 0) {
            usedIndices.add(matchedIdx);
            const tm = mediaList[matchedIdx];
            const mediaUpdate: any = {};

            // 更新 thumbnail_url
            const newThumbnail = tm.thumbnail || null;
            if (isFieldSelected(selectedMediaFields, m.id, 'thumbnail_url') && newThumbnail && (shouldOverwrite || isEmpty(m.thumbnail_url))) {
              mediaUpdate.thumbnail_url = newThumbnail;
            }

            // 更新 media_type
            let mediaType = tm.type === 'video' ? 'video' : (tm.type === 'animated_gif' || tm.type === 'gif' ? 'gif' : 'image');
            if (String(tm.url || '').includes('.mp4') || String(tm.url || '').includes('video.twimg.com')) {
              mediaType = 'video';
            }
            if (isFieldSelected(selectedMediaFields, m.id, 'media_type') && mediaType && (shouldOverwrite || isEmpty(m.media_type) || m.media_type === 'image') && mediaType !== m.media_type) {
              mediaUpdate.media_type = mediaType;
            }

            if (isFieldSelected(selectedMediaFields, m.id, 'original_url') && tm.url && (shouldOverwrite || isEmpty(m.original_url)) && tm.url !== m.original_url) {
              mediaUpdate.original_url = tm.url;
            }

            // 補全 R2 備份：url 仍指向 twimg 且無 R2 備份
            if (isFieldSelected(selectedMediaFields, m.id, 'url') && TWIMG_URL_PATTERN.test(String(m.url || ''))) {
              const r2Folder = mediaType === 'video' ? 'fanarts/videos' : 'fanarts';
              const r2Url = await backupImageToR2(String(m.url), r2Folder, {
                metadata: { 'group-id': g.id, 'source': 'reparse-r2-fill' },
              });
              if (r2Url) {
                mediaUpdate.url = r2Url;
                if (!m.original_url) mediaUpdate.original_url = m.url;
                r2Backups++;
              }
            }

            if (Object.keys(mediaUpdate).length > 0) {
              await MediaModel.update(mediaUpdate, { where: { id: m.id } as any });
              updatedMedia++;
            }
          }
        }

        // 新增缺失媒體
        if (shouldIncludeNewMedia) {
          for (let i = 0; i < mediaList.length; i++) {
            if (usedIndices.has(i)) continue;
            const tm = mediaList[i];
            const tmUrl = String(tm.url || '');

            // 檢查是否在允許的新增列表中
            if (allowedNewUrls && !allowedNewUrls.has(tmUrl)) continue;

            let mediaType = tm.type === 'video' ? 'video' : (tm.type === 'animated_gif' || tm.type === 'gif' ? 'gif' : 'image');
            if (tmUrl.includes('.mp4') || tmUrl.includes('video.twimg.com')) {
              mediaType = 'video';
            }

            // 備份到 R2
            const r2Folder = mediaType === 'video' ? 'fanarts/videos' : 'fanarts';
            let r2Url: string | null = null;
            if (TWIMG_URL_PATTERN.test(tmUrl)) {
              r2Url = await backupImageToR2(tmUrl, r2Folder, {
                metadata: { 'group-id': g.id, 'source': 'reparse-new' },
              });
              if (r2Url) r2Backups++;
            }

            // 備份視頻縮圖
            let thumbnailR2Url = tm.thumbnail || null;
            if (thumbnailR2Url && TWIMG_URL_PATTERN.test(thumbnailR2Url) && mediaType === 'video') {
              const thumbR2 = await backupImageToR2(thumbnailR2Url, 'fanarts/videos/thumbs', {
                metadata: { 'group-id': g.id, 'source': 'reparse-new-thumb' },
              });
              if (thumbR2) {
                thumbnailR2Url = thumbR2;
                r2Backups++;
              }
            }

            const newId = nanoid(16);
            await MediaModel.create({
              id: newId,
              type: 'fanart',
              media_type: mediaType,
              source: 'reparse',
              url: r2Url || tmUrl,
              original_url: tmUrl,
              thumbnail_url: thumbnailR2Url,
              group_id: g.id,
            } as any);
            newMedia++;
          }
        }
      } catch (err: any) {
        errors.push({ group_id: g.id, error: String(err?.message || err) });
      }

      // vxtwitter API 限流間隔
      await sleep(VXITTER_DELAY_MS);
    }

    res.json({
      success: true,
      data: { updated_groups: updatedGroups, updated_media: updatedMedia, new_media: newMedia, r2_backups: r2Backups, skipped, errors },
    });
  } catch (error: any) {
    logger.error({ err: error }, 'applyReparseTwitter failed');
    errorEventEmitter.emitError({
      source: 'request',
      message: `applyReparseTwitter failed: ${error?.message || error}`,
      stack: error?.stack,
      statusCode: 500,
      method: 'POST',
      url: '/api/admin/media-groups/reparse-twitter/apply',
    });
    res.status(500).json({ success: false, error: String(error?.message || error) });
  }
};
