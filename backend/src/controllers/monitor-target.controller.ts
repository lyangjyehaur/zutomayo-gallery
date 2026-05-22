import { Request, Response } from 'express';
import { MonitorTargetModel } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  createMonitorTarget,
  getMonitorSources,
  isMonitorTargetType,
  listMonitorTargets,
  type MonitorTargetType,
  updateMonitorTarget,
} from '../services/monitor-target.service.js';

export const getMonitorTargets = async (req: Request, res: Response) => {
  const rawType = req.query.type;
  let type: MonitorTargetType | undefined;
  if (typeof rawType === 'string' && rawType) {
    if (!isMonitorTargetType(rawType)) {
      throw new AppError(400, 'MONITOR_TARGET_INVALID_TYPE', '監聽類型必須是 user 或 hashtag');
    }
    type = rawType;
  }

  const includeDisabled = String(req.query.includeDisabled || '').toLowerCase() === 'true';
  const rows = await listMonitorTargets({ type, includeDisabled });
  res.json({ success: true, data: rows });
};

export const getMonitorTargetSources = async (_req: Request, res: Response) => {
  res.json({ success: true, data: await getMonitorSources() });
};

export const postMonitorTarget = async (req: Request, res: Response) => {
  const target = await createMonitorTarget(req.body);
  res.status(201).json({ success: true, data: target });
};

export const patchMonitorTarget = async (req: Request, res: Response) => {
  const target = await updateMonitorTarget(req.params.id, req.body || {});
  res.json({ success: true, data: target });
};

export const deleteMonitorTarget = async (req: Request, res: Response) => {
  const target = await MonitorTargetModel.findByPk(req.params.id);
  if (!target) throw new AppError(404, 'MONITOR_TARGET_NOT_FOUND', '找不到監聽目標');
  await target.destroy();
  res.json({ success: true, data: { id: req.params.id } });
};

export const toggleMonitorTarget = async (req: Request, res: Response) => {
  const target = await MonitorTargetModel.findByPk(req.params.id);
  if (!target) throw new AppError(404, 'MONITOR_TARGET_NOT_FOUND', '找不到監聽目標');
  const enabled = typeof req.body?.enabled === 'boolean' ? req.body.enabled : !target.get('enabled');
  await target.update({ enabled } as any);
  res.json({ success: true, data: target });
};
