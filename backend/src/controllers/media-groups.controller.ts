import { Request, Response } from 'express';
import { QueryTypes } from 'sequelize';
import { MediaGroupModel, MediaModel, MVModel, MVMediaModel, sequelize } from '../models/index.js';

const clampInt = (value: unknown, fallback: number, min: number, max: number): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
};

export const listMediaGroups = async (req: Request, res: Response) => {
  const limit = clampInt(req.query.limit, 50, 1, 200);
  const offset = clampInt(req.query.offset, 0, 0, 1000000);
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  const whereClauses: string[] = [];
  const replacements: Record<string, any> = { limit, offset };

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

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

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
    LEFT JOIN media m ON m.group_id = g.id
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
    res.status(404).json({ success: false, error: 'Group not found' });
    return;
  }
  res.json({ success: true, data: group.toJSON() });
};

export const updateMediaGroup = async (req: Request, res: Response) => {
  const { id } = req.params;
  const group = await MediaGroupModel.findByPk(id);
  if (!group) {
    res.status(404).json({ success: false, error: 'Group not found' });
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
    res.status(404).json({ success: false, error: 'Media not found' });
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

  const whereClauses: string[] = [
    `(g.source_url IS NULL OR g.source_url = '' OR g.post_date IS NULL)`,
  ];
  const replacements: Record<string, any> = { limit, offset };

  if (q) {
    whereClauses.push(
      `(g.id ILIKE :q OR g.source_url ILIKE :q OR g.author_handle ILIKE :q OR g.author_name ILIKE :q OR g.source_text ILIKE :q)`,
    );
    replacements.q = `%${q}%`;
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

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
      MIN(COALESCE(m.url, m.original_url)) AS preview_url,
      (g.source_url IS NULL OR g.source_url = '') AS missing_source_url,
      (g.post_date IS NULL) AS missing_post_date
    FROM media_groups g
    LEFT JOIN media m ON m.group_id = g.id
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

export const mergeMediaGroups = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { target_group_id, target_source_url, carry_fields } = (req.body || {}) as any;

  const source = await MediaGroupModel.findByPk(id);
  if (!source) {
    res.status(404).json({ success: false, error: 'Group not found' });
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
    res.status(400).json({ success: false, error: 'TARGET_REQUIRED' });
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
    res.status(404).json({ success: false, error: 'Group not found' });
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
