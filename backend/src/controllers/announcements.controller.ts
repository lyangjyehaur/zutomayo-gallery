import { Request, Response } from 'express';
import { SysAnnouncementModel, SysConfigModel } from '../models/index.js';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../models/index.js';

const clampInt = (v: any, fallback: number, min: number, max: number) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
};

const normalizeOrder = (value: any): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((x) => String(x)).filter(Boolean);
};

const normalizeContent = (raw: any): string | null => {
  if (typeof raw === 'string') {
    const s = raw.trim();
    return s ? s : null;
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (!k) continue;
      if (typeof v !== 'string') continue;
      const s = v.trim();
      if (!s) continue;
      obj[k] = s;
    }
    if (Object.keys(obj).length === 0) return null;
    return JSON.stringify(obj);
  }
  return null;
};

export const listAnnouncements = async (req: Request, res: Response) => {
  const limit = clampInt(req.query.limit, 100, 1, 200);
  const offset = clampInt(req.query.offset, 0, 0, 1000000);

  const orderRow = await SysConfigModel.findByPk('announcement_order');
  const order = normalizeOrder(orderRow ? (orderRow.toJSON() as any).value : null);

  const rows = await sequelize.query<any>(
    `
    SELECT
      a.*
    FROM sys_announcements a
    ORDER BY a.updated_at DESC
    LIMIT :limit OFFSET :offset
    `,
    { type: QueryTypes.SELECT, replacements: { limit, offset } },
  );

  const totalRow = await sequelize.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM sys_announcements`,
    { type: QueryTypes.SELECT },
  );
  const total = totalRow?.[0]?.total || 0;

  const rank = new Map<string, number>();
  order.forEach((id, idx) => rank.set(String(id), idx));
  const sorted = [...rows].sort((a, b) => {
    const ra = rank.has(String(a.id)) ? (rank.get(String(a.id)) as number) : Number.MAX_SAFE_INTEGER;
    const rb = rank.has(String(b.id)) ? (rank.get(String(b.id)) as number) : Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    return String(b.updated_at || '').localeCompare(String(a.updated_at || ''));
  });

  res.json({ success: true, data: { items: sorted, total, limit, offset, order } });
};

export const createAnnouncement = async (req: Request, res: Response) => {
  const { content, is_active } = (req.body || {}) as any;
  const nextContent = normalizeContent(content);
  if (!nextContent) {
    res.status(400).json({ success: false, error: 'CONTENT_REQUIRED' });
    return;
  }
  const row = await SysAnnouncementModel.create({
    content: nextContent,
    is_active: typeof is_active === 'boolean' ? is_active : true,
  } as any);
  res.json({ success: true, data: row.toJSON() });
};

export const updateAnnouncement = async (req: Request, res: Response) => {
  const { id } = req.params;
  const row = await SysAnnouncementModel.findByPk(id);
  if (!row) {
    res.status(404).json({ success: false, error: 'NOT_FOUND' });
    return;
  }
  const { content, is_active } = (req.body || {}) as any;
  const patch: any = {};
  if (content !== undefined) {
    const nextContent = normalizeContent(content);
    if (!nextContent) {
      res.status(400).json({ success: false, error: 'CONTENT_REQUIRED' });
      return;
    }
    patch.content = nextContent;
  }
  if (typeof is_active === 'boolean') patch.is_active = is_active;
  await row.update(patch);
  res.json({ success: true, data: row.toJSON() });
};

export const deleteAnnouncement = async (req: Request, res: Response) => {
  const { id } = req.params;
  const row = await SysAnnouncementModel.findByPk(id);
  if (!row) {
    res.status(404).json({ success: false, error: 'NOT_FOUND' });
    return;
  }

  await sequelize.transaction(async (t) => {
    await row.destroy({ transaction: t });
    const orderRow = await SysConfigModel.findByPk('announcement_order', { transaction: t });
    const order = normalizeOrder(orderRow ? (orderRow.toJSON() as any).value : null).filter((x) => x !== id);
    await SysConfigModel.upsert({ key: 'announcement_order', value: order } as any, { transaction: t });
  });

  res.json({ success: true, data: true });
};

export const updateAnnouncementOrder = async (req: Request, res: Response) => {
  const { ids } = (req.body || {}) as any;
  if (!Array.isArray(ids)) {
    res.status(400).json({ success: false, error: 'IDS_REQUIRED' });
    return;
  }
  const next = ids.map((x: any) => String(x)).filter(Boolean);
  await SysConfigModel.upsert({ key: 'announcement_order', value: next } as any);
  res.json({ success: true, data: true });
};

