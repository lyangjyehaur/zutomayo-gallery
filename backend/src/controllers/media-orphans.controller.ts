import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { MediaGroupModel, MediaModel, MVModel } from '../models/index.js';
import { isTweetSourceMedia } from '../utils/media-source.js';

const clampInt = (value: unknown, fallback: number, min: number, max: number): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
};

export const listOrphanMedia = async (req: Request, res: Response) => {
  const limit = clampInt(req.query.limit, 50, 1, 200);
  const offset = clampInt(req.query.offset, 0, 0, 1000000);
  const type = typeof req.query.type === 'string' ? req.query.type : '';
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  const where: any = {
    group_id: { [Op.is]: null },
    [Op.or]: [
      { url: { [Op.iLike]: '%pbs.twimg.com%' } },
      { url: { [Op.iLike]: '%video.twimg.com%' } },
      { original_url: { [Op.iLike]: '%pbs.twimg.com%' } },
      { original_url: { [Op.iLike]: '%video.twimg.com%' } },
    ],
  };
  if (type) where.type = type;
  if (q) {
    where[Op.and] = [
      {
        [Op.or]: [
          { id: { [Op.iLike]: `%${q}%` } },
          { url: { [Op.iLike]: `%${q}%` } },
          { original_url: { [Op.iLike]: `%${q}%` } },
          { caption: { [Op.iLike]: `%${q}%` } },
        ],
      },
    ];
  }

  const result = await MediaModel.findAndCountAll({
    where,
    include: [
      {
        model: MVModel,
        as: 'mvs',
        attributes: ['id', 'title'],
        through: { attributes: ['usage', 'order_index'] },
        required: false,
      },
    ],
    order: [['created_at', 'DESC'], ['id', 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  const items = result.rows
    .map((r) => r.toJSON() as any)
    .filter((m) => isTweetSourceMedia(m));

  res.json({
    success: true,
    data: {
      items,
      total: result.count,
      limit,
      offset,
    },
  });
};

export const assignOrphanMediaGroup = async (req: Request, res: Response) => {
  const { mediaId } = req.params;
  const {
    source_url,
    source_text,
    author_name,
    author_handle,
    post_date,
    status,
  } = (req.body || {}) as any;

  if (typeof source_url !== 'string' || source_url.trim().length === 0) {
    res.status(400).json({ success: false, error: '請提供來源網址', code: 'SOURCE_URL_REQUIRED' });
    return;
  }
  const sourceUrl = source_url.trim();

  const media = await MediaModel.findByPk(mediaId);
  if (!media) {
    res.status(404).json({ success: false, error: '找不到此媒體', code: 'MEDIA_NOT_FOUND' });
    return;
  }
  if (!isTweetSourceMedia(media.toJSON() as any)) {
    res.status(400).json({ success: false, error: '僅推文來源的媒體可在此指派', code: 'WRONG_SOURCE_TYPE' });
    return;
  }

  const [group] = await MediaGroupModel.findOrCreate({
    where: { source_url: sourceUrl },
    defaults: {
      source_url: sourceUrl,
      source_text: typeof source_text === 'string' ? source_text : null,
      author_name: typeof author_name === 'string' ? author_name : null,
      author_handle: typeof author_handle === 'string' ? author_handle : null,
      post_date: typeof post_date === 'string' && post_date ? new Date(post_date) : null,
      status: typeof status === 'string' && status ? status : 'organized',
    },
  });

  const updateGroup: any = {};
  if (typeof source_text === 'string') updateGroup.source_text = source_text;
  if (typeof author_name === 'string') updateGroup.author_name = author_name;
  if (typeof author_handle === 'string') updateGroup.author_handle = author_handle;
  if (typeof post_date === 'string') updateGroup.post_date = post_date ? new Date(post_date) : null;
  if (typeof status === 'string') updateGroup.status = status;
  if (Object.keys(updateGroup).length > 0) {
    await group.update(updateGroup);
  }

  await media.update({ group_id: group.get('id') });

  const refreshed = await MediaModel.findByPk(mediaId, {
    include: [{ model: MediaGroupModel, as: 'group' }],
  });

  res.json({ success: true, data: refreshed ? refreshed.toJSON() : media.toJSON() });
};

export const unassignOrphanMediaGroup = async (req: Request, res: Response) => {
  const { mediaId } = req.params;
  const media = await MediaModel.findByPk(mediaId);
  if (!media) {
    res.status(404).json({ success: false, error: '找不到此媒體', code: 'MEDIA_NOT_FOUND' });
    return;
  }
  await media.update({ group_id: null });
  res.json({ success: true, data: true });
};
