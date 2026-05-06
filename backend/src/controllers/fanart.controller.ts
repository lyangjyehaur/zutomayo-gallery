import { Request, Response } from 'express';
import { Op, QueryTypes } from 'sequelize';
import { MediaGroupModel, MediaModel, MVMediaModel, MVModel, sequelize } from '../models/index.js';
import { MVService } from '../services/mv.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { FANART_ALLOWED_TAGS } from '../constants/fanart-tags.js';
import { isYoutubeMediaUrl } from '../utils/media-source.js';
import {
  assignFanartMediaSchema,
  syncFanartMediaSchema,
  removeFanartMediaFromMvSchema,
  updateFanartStatusSchema,
  getFanartGalleryQuerySchema,
} from '../validators/fanart.validator.js';

const mvService = new MVService();

const parseCsv = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(v => String(v).split(',')).map(s => s.trim()).filter(Boolean);
  return String(value).split(',').map(s => s.trim()).filter(Boolean);
};

const clampInt = (value: unknown, fallback: number, min: number, max: number): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
};

const isFanartYoutubeMedia = (media: any): boolean => {
  const url = String(media?.url || '');
  const originalUrl = String(media?.original_url || media?.originalUrl || '');
  return isYoutubeMediaUrl(url) || isYoutubeMediaUrl(originalUrl);
};

export const getUnorganizedFanarts = async (req: Request, res: Response) => {
  const rows = await MediaGroupModel.findAll({
    where: { status: 'unorganized' },
    include: [{ model: MediaModel, as: 'images' }],
    order: [['post_date', 'DESC'], ['id', 'DESC']]
  });

  const groups = rows.map(r => r.toJSON() as any);
  const allMediaIds = groups.flatMap(g => (g.images || []).map((m: any) => m.id)).filter(Boolean);
  const mvLinks = allMediaIds.length
    ? await MVMediaModel.findAll({ where: { media_id: allMediaIds }, attributes: ['media_id'] })
    : [];
  const mediaWithMv = new Set(mvLinks.map(r => r.get('media_id') as string));

  const isMediaOrganized = (m: any) => {
    const tags = Array.isArray(m.tags) ? m.tags : [];
    if (tags.length > 0) return true;
    if (mediaWithMv.has(m.id)) return true;
    return false;
  };

  const keepGroups: any[] = [];
  const toOrganizeGroupIds: string[] = [];

  for (const group of groups) {
    const images = (group.images || []).filter((m: any) => !isFanartYoutubeMedia(m));
    const hasAnyUnorganizedMedia = images.some((m: any) => !isMediaOrganized(m));
    if (hasAnyUnorganizedMedia) {
      keepGroups.push({
        ...group,
        media: images
      });
    } else {
      if (group.id) toOrganizeGroupIds.push(group.id);
    }
  }

  if (toOrganizeGroupIds.length > 0) {
    await MediaGroupModel.update({ status: 'organized' }, { where: { id: toOrganizeGroupIds } });
  }

  const data = keepGroups;

  res.json({ success: true, data });
};

export const getDeletedFanarts = async (req: Request, res: Response) => {
  const rows = await MediaGroupModel.findAll({
    where: { status: 'deleted' },
    include: [{ model: MediaModel, as: 'images' }],
    order: [['post_date', 'DESC'], ['id', 'DESC']]
  });

  const data = rows.map((row) => {
    const group = row.toJSON() as any;
    return {
      ...group,
      media: (group.images || []).filter((m: any) => !isFanartYoutubeMedia(m))
    };
  });

  res.json({ success: true, data });
};

export const getLegacyFanarts = async (req: Request, res: Response) => {
  const rows = await MediaModel.findAll({
    where: { type: 'fanart' },
    include: [{ model: MediaGroupModel, as: 'group' }],
    order: [['created_at', 'DESC']],
    limit: 500
  });

  const data = rows
    .map(r => r.toJSON() as any)
    .filter((m: any) => {
      const missingGroup = !m.group_id || !m.group;
      const missingSource = !m.group?.source_url;
      return (missingGroup || missingSource) && !isFanartYoutubeMedia(m);
    });

  res.json({ success: true, data });
};

export const getFanartGallery = async (req: Request, res: Response) => {
  const parsed = getFanartGalleryQuerySchema.safeParse(req.query);
  const q = parsed.success ? parsed.data : req.query;

  const all = String(q.all || '').toLowerCase() === '1' || String(q.all || '').toLowerCase() === 'true';
  const withTotal = String(q.withTotal || '').toLowerCase() === '1' || String(q.withTotal || '').toLowerCase() === 'true';
  const limit = all ? 0 : clampInt(q.limit, 200, 1, 500);
  const offset = all ? 0 : Math.max(0, clampInt(q.offset, 0, 0, 10_000_000));

  const tagsAny = parseCsv(q.tags);
  const mvIds = parseCsv(q.mvIds);
  const onlyCollab = String(q.onlyCollab || '').toLowerCase() === '1' || String(q.onlyCollab || '').toLowerCase() === 'true';
  const source = String(q.source || '').trim();

  const andConditions: any[] = [{ type: 'fanart' }];
  andConditions.push({
    [Op.not]: {
      [Op.or]: [
        { url: { [Op.iLike]: '%ytimg.com%' } },
        { url: { [Op.iLike]: '%youtube.com%' } },
        { url: { [Op.iLike]: '%youtu.be%' } },
        { original_url: { [Op.iLike]: '%ytimg.com%' } },
        { original_url: { [Op.iLike]: '%youtube.com%' } },
        { original_url: { [Op.iLike]: '%youtu.be%' } },
      ],
    },
  });
  if (source) andConditions.push({ source });
  if (onlyCollab) andConditions.push({ tags: { [Op.contains]: ['tag:collab'] } });
  if (tagsAny.length > 0) {
    andConditions.push({
      [Op.or]: tagsAny.map(tag => ({ tags: { [Op.contains]: [tag] } }))
    });
  }

  const where: any = andConditions.length === 1 ? andConditions[0] : { [Op.and]: andConditions };

  const mvInclude: any = {
    model: MVModel,
    as: 'mvs',
    through: { attributes: [] },
    attributes: ['id', 'title'],
    required: false
  };
  if (mvIds.length > 0) {
    mvInclude.required = true;
    mvInclude.where = { id: mvIds };
  }

  const seed = String(q.seed || '').trim();
  const sort = String(q.sort || 'random');

  const orderMap: Record<string, any[]> = {
    random: seed
      ? [sequelize.literal('sort_key ASC'), ['group_id', 'ASC'], ['id', 'ASC']]
      : [[{ model: MediaGroupModel, as: 'group' }, 'post_date', 'DESC'], ['group_id', 'ASC'], ['id', 'ASC']],
    date_desc: [[{ model: MediaGroupModel, as: 'group' }, 'post_date', 'DESC'], ['group_id', 'ASC'], ['id', 'ASC']],
    date_asc: [[{ model: MediaGroupModel, as: 'group' }, 'post_date', 'ASC'], ['group_id', 'ASC'], ['id', 'ASC']],
    likes: [[{ model: MediaGroupModel, as: 'group' }, 'like_count', 'DESC'], ['group_id', 'ASC'], ['id', 'ASC']],
  };

  const findOptions: any = {
    where,
    distinct: true,
    include: [
      { model: MediaGroupModel, as: 'group', where: { status: 'organized' }, required: true },
      mvInclude
    ],
    order: orderMap[sort] || orderMap.random
  };

  if (sort === 'random' && seed) {
    findOptions.attributes = {
      include: [
        [sequelize.literal(`md5(${sequelize.escape(seed)} || "Media"."group_id"::text)`), 'sort_key']
      ]
    };
  }

  if (!all) {
    findOptions.subQuery = false;
    findOptions.limit = limit + 1;
    findOptions.offset = offset;
  }

  const rows = await MediaModel.findAll(findOptions);
  const hasMore = !all && rows.length > limit;
  const slicedRows = !all ? rows.slice(0, limit) : rows;
  const data = slicedRows.map(r => r.toJSON());

  if (all) {
    res.json({ success: true, data });
    return;
  }

  let total: number | null = null;
  if (withTotal) {
    total = await MediaModel.count({
      where,
      include: [
        { model: MediaGroupModel, as: 'group', where: { status: 'organized' }, required: true },
        mvInclude
      ],
      distinct: true,
      col: 'id'
    });
  }

  res.json({
    success: true,
    data,
    meta: {
      limit,
      offset,
      total,
      hasMore
    }
  });
};

export const getFanartGallerySummary = async (req: Request, res: Response) => {
  const tags = FANART_ALLOWED_TAGS;
  const source = String(req.query.source || '').trim();

  // 合併 5 次 count() 為單條 SQL，避免 N+1 查詢
  const sourceFilter = source ? `AND m.source = :source` : '';
  const tagCountRows = await sequelize.query(
    `
    SELECT t.tag, COUNT(DISTINCT m.id)::int AS count
    FROM unnest(ARRAY[:tags]::text[]) AS t(tag)
    JOIN media m ON m.type = 'fanart'
      AND m.tags @> to_jsonb(t.tag::text)
      AND NOT (
        m.url ILIKE '%ytimg.com%' OR m.url ILIKE '%youtube.com%' OR m.url ILIKE '%youtu.be%'
        OR m.original_url ILIKE '%ytimg.com%' OR m.original_url ILIKE '%youtube.com%' OR m.original_url ILIKE '%youtu.be%'
      )
    JOIN media_groups g ON g.id = m.group_id AND g.status = 'organized'
    ${sourceFilter.replace(':source', ':source_for_tag')}
    GROUP BY t.tag
    `,
    {
      replacements: { tags: [...tags], ...(source ? { source_for_tag: source } : {}) },
      type: QueryTypes.SELECT,
    }
  );

  const tagCounts: Record<string, number> = {};
  for (const tag of tags) tagCounts[tag] = 0;
  for (const row of tagCountRows as any[]) {
    if (row.tag) tagCounts[row.tag] = Number(row.count) || 0;
  }

  const tagsAny = parseCsv(req.query.tags);
  const onlyCollab = String(req.query.onlyCollab || '').toLowerCase() === '1' || String(req.query.onlyCollab || '').toLowerCase() === 'true';

  const whereParts: string[] = [
    `m.type = 'fanart'`,
    `g.status = 'organized'`
  ];
  const replacements: Record<string, any> = {};
  if (source) {
    whereParts.push(`m.source = :source`);
    replacements.source = source;
  }
  whereParts.push(
    `NOT (m.url ILIKE '%ytimg.com%' OR m.url ILIKE '%youtube.com%' OR m.url ILIKE '%youtu.be%' OR m.original_url ILIKE '%ytimg.com%' OR m.original_url ILIKE '%youtube.com%' OR m.original_url ILIKE '%youtu.be%')`,
  );

  if (onlyCollab) {
    whereParts.push(`m.tags @> :collabTag::jsonb`);
    replacements.collabTag = JSON.stringify(['tag:collab']);
  }

  if (tagsAny.length > 0) {
    const orParts: string[] = [];
    tagsAny.forEach((tag, idx) => {
      const key = `tag_${idx}`;
      replacements[key] = JSON.stringify([tag]);
      orParts.push(`m.tags @> :${key}::jsonb`);
    });
    whereParts.push(`(${orParts.join(' OR ')})`);
  }

  const whereSql = whereParts.join(' AND ');
  const mvRows = await sequelize.query(
    `
    SELECT mm.mv_id as "mvId", COUNT(DISTINCT m.id)::int as "count"
    FROM media m
    JOIN media_groups g ON g.id = m.group_id
    JOIN mv_media mm ON mm.media_id = m.id
    WHERE ${whereSql}
    GROUP BY mm.mv_id
    `,
    { replacements, type: QueryTypes.SELECT }
  );

  const mvCounts: Record<string, number> = {};
  (mvRows as any[]).forEach((r) => {
    if (!r?.mvId) return;
    mvCounts[String(r.mvId)] = Number(r.count) || 0;
  });

  res.json({ success: true, data: { tagCounts, mvCounts } });
};

export const getFanartsByTag = async (req: Request, res: Response) => {
  const rawTag = String(req.params.tagId || '').trim();
  if (!rawTag) throw new AppError(400, 'Missing tagId');

  const tagId = rawTag;
  const legacyTag = tagId.startsWith('tag:') ? tagId.slice(4) : tagId;

  const rows = await MediaModel.findAll({
    where: {
      [Op.and]: [
        { type: 'fanart' },
        {
          [Op.not]: {
            [Op.or]: [
              { url: { [Op.iLike]: '%ytimg.com%' } },
              { url: { [Op.iLike]: '%youtube.com%' } },
              { url: { [Op.iLike]: '%youtu.be%' } },
              { original_url: { [Op.iLike]: '%ytimg.com%' } },
              { original_url: { [Op.iLike]: '%youtube.com%' } },
              { original_url: { [Op.iLike]: '%youtu.be%' } },
            ],
          },
        },
        {
          [Op.or]: [
            { tags: { [Op.contains]: [tagId] } },
            { tags: { [Op.contains]: [legacyTag] } }
          ]
        }
      ]
    },
    include: [{ model: MediaGroupModel, as: 'group' }],
    order: [[{ model: MediaGroupModel, as: 'group' }, 'post_date', 'DESC'], ['id', 'DESC']]
  });

  res.json({ success: true, data: rows.map(r => r.toJSON()) });
};

export const getFanartTagSummary = async (req: Request, res: Response) => {
  const tags = FANART_ALLOWED_TAGS;

  // 合併 5 次 count() 為單條 SQL
  const tagSummaryRows = await sequelize.query(
    `
    SELECT t.tag AS full_tag,
           t.legacy_tag,
           COUNT(DISTINCT m.id)::int AS count
    FROM (
      SELECT tag, CASE WHEN tag LIKE 'tag:%' THEN substring(tag FROM 5) ELSE tag END AS legacy_tag
      FROM unnest(ARRAY[:tags]::text[]) AS tag
    ) t
    JOIN media m ON m.type = 'fanart'
      AND (m.tags @> to_jsonb(t.tag::text) OR m.tags @> to_jsonb(t.legacy_tag::text))
      AND NOT (
        m.url ILIKE '%ytimg.com%' OR m.url ILIKE '%youtube.com%' OR m.url ILIKE '%youtu.be%'
        OR m.original_url ILIKE '%ytimg.com%' OR m.original_url ILIKE '%youtube.com%' OR m.original_url ILIKE '%youtu.be%'
      )
    GROUP BY t.tag, t.legacy_tag
    `,
    {
      replacements: { tags: [...tags] },
      type: QueryTypes.SELECT,
    }
  );

  const counts: Record<string, number> = {};
  for (const tag of tags) counts[tag] = 0;
  for (const row of tagSummaryRows as any[]) {
    if (row.full_tag) counts[row.full_tag] = Number(row.count) || 0;
  }

  res.json({ success: true, data: counts });
};

export const assignFanartMedia = async (req: Request, res: Response) => {
  const { mediaId } = req.params;
  const parsed = assignFanartMediaSchema.parse(req.body);
  const { mvs, groupId } = parsed;

  const media = await MediaModel.findByPk(mediaId);
  if (!media) throw new AppError(404, 'Media not found');

  const mvIds = mvs.filter((m: string) => !m.startsWith('tag:'));
  const tags = mvs.filter((m: string) => m.startsWith('tag:'));

  if (tags.length > 0) {
    const currentTags = media.get('tags') as any;
    const nextTags = Array.from(
      new Set([...(Array.isArray(currentTags) ? currentTags : []), ...tags])
    );
    await media.update({ tags: nextTags });
  }

  if (mvIds.length > 0) {
    const records = mvIds.map((mvId: string) => ({
      mv_id: mvId,
      media_id: mediaId,
      usage: 'gallery',
      order_index: 0
    }));
    await MVMediaModel.bulkCreate(records, { ignoreDuplicates: true });
  }

  if (groupId) {
    const group = await MediaGroupModel.findByPk(groupId);
    if (group) await group.update({ status: 'organized' });
  }

  mvService.clearCache();

  res.json({ success: true });
};

export const syncFanartMedia = async (req: Request, res: Response) => {
  const { mediaId } = req.params;
  const parsed = syncFanartMediaSchema.parse(req.body);
  const { mvs, groupId } = parsed;

  const media = await MediaModel.findByPk(mediaId);
  if (!media) throw new AppError(404, 'Media not found');

  const rawMvs = Array.isArray(mvs) ? mvs : [];
  const mvIds = rawMvs.filter((m: any) => typeof m === 'string' && !m.startsWith('tag:'));
  const tags = Array.from(
    new Set(rawMvs.filter((m: any) => typeof m === 'string' && m.startsWith('tag:')))
  );

  await media.update({ tags });

  const existingLinks = await MVMediaModel.findAll({
    where: { media_id: mediaId },
    attributes: ['mv_id']
  });
  const existingMvIds = new Set(existingLinks.map(r => r.get('mv_id') as string));
  const nextMvIds = new Set(mvIds);
  const toDelete = Array.from(existingMvIds).filter(id => !nextMvIds.has(id));
  const toAdd = mvIds.filter(id => !existingMvIds.has(id));

  if (toDelete.length > 0) {
    await MVMediaModel.destroy({ where: { media_id: mediaId, mv_id: toDelete } });
  }

  if (toAdd.length > 0) {
    const records = toAdd.map((mvId: string) => ({
      mv_id: mvId,
      media_id: mediaId,
      usage: 'gallery',
      order_index: 0
    }));
    await MVMediaModel.bulkCreate(records, { ignoreDuplicates: true });
  }

  if (groupId) {
    const group = await MediaGroupModel.findByPk(groupId);
    if (group) await group.update({ status: 'organized' });
  }

  mvService.clearCache();

  res.json({ success: true });
};

export const removeFanartMediaFromMv = async (req: Request, res: Response) => {
  const { mediaId } = req.params;
  const parsed = removeFanartMediaFromMvSchema.parse(req.body);
  const { mvId } = parsed;

  if (mvId.startsWith('tag:')) {
    const media = await MediaModel.findByPk(mediaId);
    if (media) {
      const currentTags = (media.get('tags') || []) as string[];
      const nextTags = currentTags.filter(t => t !== mvId);
      await media.update({ tags: nextTags });
    }
  } else {
    await MVMediaModel.destroy({ where: { media_id: mediaId, mv_id: mvId } });
  }

  mvService.clearCache();

  res.json({ success: true });
};

export const updateFanartStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = updateFanartStatusSchema.parse(req.body);
  const { status } = parsed;

  await MediaGroupModel.update({ status }, { where: { id } });

  res.json({ success: true });
};
