import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { AdminMenuModel } from '../../models/index.js';

const parseMenuPayload = (body: any) => {
  const label = typeof body?.label === 'string' ? body.label.trim() : '';
  const path = typeof body?.path === 'string' ? body.path.trim() : '';
  const icon = typeof body?.icon === 'string' && body.icon.trim().length > 0 ? body.icon.trim() : null;
  const sort = typeof body?.sort === 'number' && Number.isFinite(body.sort) ? body.sort : Number(body?.sort || 0);
  const parent_id = typeof body?.parent_id === 'string' && body.parent_id.length > 0 ? body.parent_id : null;
  const permission = typeof body?.permission === 'string' && body.permission.length > 0 ? body.permission : null;

  if (!label) {
    const err: any = new Error('label 必填');
    err.statusCode = 400;
    throw err;
  }
  if (!path || !path.startsWith('/admin')) {
    const err: any = new Error('path 必填且需以 /admin 開頭');
    err.statusCode = 400;
    throw err;
  }

  return { label, path, icon, sort: Number.isFinite(sort) ? sort : 0, parent_id, permission };
};

export const listMenus = async (_req: Request, res: Response) => {
  const rows = await AdminMenuModel.findAll({ order: [['sort', 'ASC'], ['created_at', 'ASC']] });
  res.json({ success: true, data: rows.map(r => r.toJSON() as any) });
};

export const createMenu = async (req: Request, res: Response) => {
  try {
    const payload = parseMenuPayload(req.body);
    const existing = await AdminMenuModel.findOne({ where: { path: payload.path } as any });
    if (existing) return res.status(409).json({ success: false, error: 'path 已存在' });

    if (payload.parent_id) {
      const parent = await AdminMenuModel.findOne({ where: { id: payload.parent_id } as any });
      if (!parent) return res.status(400).json({ success: false, error: 'parent_id 不存在' });
    }

    const row = await AdminMenuModel.create(payload as any);
    res.json({ success: true, data: row.toJSON() as any });
  } catch (err: any) {
    res.status(err?.statusCode || 500).json({ success: false, error: err?.message || 'Internal Server Error' });
  }
};

export const updateMenu = async (req: Request, res: Response) => {
  const id = req.params.id;
  const row = await AdminMenuModel.findOne({ where: { id } as any });
  if (!row) return res.status(404).json({ success: false, error: '找不到菜單' });

  try {
    const payload = parseMenuPayload(req.body);
    const existing = await AdminMenuModel.findOne({ where: { path: payload.path, id: { [Op.ne]: id } } as any });
    if (existing) return res.status(409).json({ success: false, error: 'path 已存在' });

    if (payload.parent_id) {
      if (payload.parent_id === id) return res.status(400).json({ success: false, error: 'parent_id 不可指向自己' });
      const parent = await AdminMenuModel.findOne({ where: { id: payload.parent_id } as any });
      if (!parent) return res.status(400).json({ success: false, error: 'parent_id 不存在' });
    }

    await row.update(payload as any);
    res.json({ success: true, data: row.toJSON() as any });
  } catch (err: any) {
    res.status(err?.statusCode || 500).json({ success: false, error: err?.message || 'Internal Server Error' });
  }
};

export const deleteMenu = async (req: Request, res: Response) => {
  const id = req.params.id;
  const row = await AdminMenuModel.findOne({ where: { id } as any });
  if (!row) return res.status(404).json({ success: false, error: '找不到菜單' });
  await row.destroy();
  res.json({ success: true, data: { id } });
};

export const bulkUpdateMenus = async (req: Request, res: Response) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : null;
  if (!items) return res.status(400).json({ success: false, error: 'items 必填' });

  const updates = items
    .map((i: any) => ({
      id: i?.id,
      sort: typeof i?.sort === 'number' && Number.isFinite(i.sort) ? i.sort : Number(i?.sort),
      parent_id: typeof i?.parent_id === 'string' && i.parent_id.length > 0 ? i.parent_id : null,
    }))
    .filter((i: any) => typeof i.id === 'string' && i.id.length > 0 && Number.isFinite(i.sort));

  for (const u of updates) {
    await AdminMenuModel.update(
      { sort: u.sort, parent_id: u.parent_id } as any,
      { where: { id: u.id } as any }
    );
  }

  const rows = await AdminMenuModel.findAll({ order: [['sort', 'ASC'], ['created_at', 'ASC']] });
  res.json({ success: true, data: rows.map(r => r.toJSON() as any) });
};

