import { Op, Sequelize } from 'sequelize';
import { ArtistModel, MonitorTargetModel, SysConfigModel } from '../models/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

export type MonitorTargetType = 'user' | 'hashtag';

export type MonitorFeedTarget = {
  type: MonitorTargetType;
  handle: string;
  label?: string | null;
  source: 'artist' | 'manual' | 'env';
};

type ArtistTwitterSource = {
  id: string;
  name?: string | null;
  handle: string;
};

const validTypes = new Set<MonitorTargetType>(['user', 'hashtag']);

export const isMonitorTargetType = (value: unknown): value is MonitorTargetType => {
  return typeof value === 'string' && validTypes.has(value as MonitorTargetType);
};

export const normalizeMonitorHandle = (type: MonitorTargetType, input: unknown): string => {
  let value = typeof input === 'string' ? input.trim() : '';
  if (!value) return '';

  if (type === 'user') {
    value = value
      .replace(/^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\//i, '')
      .replace(/^@+/, '')
      .split(/[/?#]/)[0]
      .trim();
    return value.toLowerCase();
  }

  value = value.replace(/^#+/, '').trim();
  return value;
};

export const buildTwitterRssFeedUrl = (baseUrl: string, target: Pick<MonitorFeedTarget, 'type' | 'handle'>): string => {
  const base = String(baseUrl || '').trim();
  if (!base) throw new Error('RSSHub base URL is required');

  const normalizedBase = base.replace(/\/+$/, '');
  if (target.type === 'hashtag') {
    return `${normalizedBase}/twitter/keyword/${encodeURIComponent(`#${target.handle}`)}`;
  }
  return `${normalizedBase}/twitter/user/${encodeURIComponent(target.handle)}`;
};

let cachedRssHubBaseUrl = (process.env.TWITTER_RSSHUB_BASE_URL || process.env.RSSHUB_BASE_URL || 'https://rsshub.app').replace(/\/+$/, '');

/**
 * 從 DB 載入 twitter_monitor_config，更新 RSSHub base URL。
 */
export const refreshMonitorTargetConfig = async () => {
  try {
    const row = await SysConfigModel.findByPk('twitter_monitor_config');
    const db = row?.get('value') as any;
    if (db && db.rsshub_base_url) {
      cachedRssHubBaseUrl = db.rsshub_base_url.replace(/\/+$/, '');
    }
  } catch (err) {
    logger.warn({ err }, '[MonitorTarget] Failed to load twitter_monitor_config from DB, using env defaults');
  }
};

export const getRssHubBaseUrl = (): string => {
  return cachedRssHubBaseUrl;
};

export const inferRssHubBaseFromFeedUrl = (feedUrl: string | undefined): string | null => {
  if (!feedUrl) return null;
  try {
    const url = new URL(feedUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    const twitterIndex = parts.indexOf('twitter');
    if (twitterIndex < 0) return null;
    const prefix = parts.slice(0, twitterIndex).join('/');
    return `${url.origin}${prefix ? `/${prefix}` : ''}`.replace(/\/+$/, '');
  } catch {
    return null;
  }
};

export const listArtistTwitterSources = async (): Promise<ArtistTwitterSource[]> => {
  const rows = await ArtistModel.findAll({
    attributes: ['id', 'name', 'twitter'],
    where: {
      twitter: { [Op.ne]: null },
    } as any,
    order: [['name', 'ASC']],
  });

  const seen = new Set<string>();
  const mapped = rows.map((row: any): ArtistTwitterSource | null => {
    const data = row.toJSON();
    const handle = normalizeMonitorHandle('user', data.twitter);
    return handle ? { id: data.id, name: data.name, handle } : null;
  });

  return mapped.filter((item: ArtistTwitterSource | null): item is ArtistTwitterSource => {
    if (!item || seen.has(item.handle)) return false;
    seen.add(item.handle);
    return true;
  });
};

export const listMonitorTargets = async (options: { type?: MonitorTargetType; includeDisabled?: boolean } = {}) => {
  const where: any = {};
  if (options.type) where.type = options.type;
  if (!options.includeDisabled) where.enabled = true;
  return MonitorTargetModel.findAll({
    where,
    order: [['type', 'ASC'], ['handle', 'ASC']],
  });
};

const ensureNoDuplicate = async (type: MonitorTargetType, handle: string, excludeId?: string) => {
  const where: any = {
    type,
    [Op.and]: [Sequelize.where(Sequelize.fn('lower', Sequelize.col('handle')), handle.toLowerCase())],
  };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  const existing = await MonitorTargetModel.findOne({ where });
  if (existing) {
    throw new AppError(409, 'MONITOR_TARGET_DUPLICATE', '已有相同的監聽目標');
  }
};

export const createMonitorTarget = async (payload: any) => {
  if (!isMonitorTargetType(payload?.type)) {
    throw new AppError(400, 'MONITOR_TARGET_INVALID_TYPE', '監聽類型必須是 user 或 hashtag');
  }
  const handle = normalizeMonitorHandle(payload.type, payload.handle);
  if (!handle) throw new AppError(400, 'MONITOR_TARGET_HANDLE_REQUIRED', '請輸入監聽目標');

  await ensureNoDuplicate(payload.type, handle);

  return MonitorTargetModel.create({
    type: payload.type,
    handle,
    label: typeof payload.label === 'string' && payload.label.trim() ? payload.label.trim() : null,
    enabled: typeof payload.enabled === 'boolean' ? payload.enabled : true,
    note: typeof payload.note === 'string' && payload.note.trim() ? payload.note.trim() : null,
  } as any);
};

export const updateMonitorTarget = async (id: string, payload: any) => {
  const target = await MonitorTargetModel.findByPk(id);
  if (!target) throw new AppError(404, 'MONITOR_TARGET_NOT_FOUND', '找不到監聽目標');

  const currentType = target.get('type') as MonitorTargetType;
  const nextType = payload?.type === undefined ? currentType : payload.type;
  if (!isMonitorTargetType(nextType)) {
    throw new AppError(400, 'MONITOR_TARGET_INVALID_TYPE', '監聽類型必須是 user 或 hashtag');
  }

  const rawHandle = payload?.handle === undefined ? target.get('handle') : payload.handle;
  const handle = normalizeMonitorHandle(nextType, rawHandle);
  if (!handle) throw new AppError(400, 'MONITOR_TARGET_HANDLE_REQUIRED', '請輸入監聽目標');
  await ensureNoDuplicate(nextType, handle, id);

  const updateData: any = { type: nextType, handle };
  if ('label' in payload) updateData.label = typeof payload.label === 'string' && payload.label.trim() ? payload.label.trim() : null;
  if ('note' in payload) updateData.note = typeof payload.note === 'string' && payload.note.trim() ? payload.note.trim() : null;
  if ('enabled' in payload) updateData.enabled = Boolean(payload.enabled);

  await target.update(updateData);
  return target;
};

export const getMonitorSources = async () => {
  const [artistUsers, manualRows, hashtagRows] = await Promise.all([
    listArtistTwitterSources(),
    listMonitorTargets({ type: 'user', includeDisabled: true }),
    listMonitorTargets({ type: 'hashtag', includeDisabled: true }),
  ]);

  return {
    artistUsers,
    manualUsers: manualRows.map((row: any) => row.toJSON()),
    hashtags: hashtagRows.map((row: any) => row.toJSON()),
  };
};

export const getMonitoredFeedTargets = async (): Promise<MonitorFeedTarget[]> => {
  const [artistUsers, manualRows, hashtagRows] = await Promise.all([
    listArtistTwitterSources(),
    listMonitorTargets({ type: 'user' }),
    listMonitorTargets({ type: 'hashtag' }),
  ]);

  const targets: MonitorFeedTarget[] = [];
  const seen = new Set<string>();
  const push = (target: MonitorFeedTarget) => {
    const key = `${target.type}:${target.handle.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    targets.push(target);
  };

  artistUsers.forEach((artist) => push({ type: 'user', handle: artist.handle, label: artist.name, source: 'artist' }));
  manualRows.forEach((row: any) => {
    const data = row.toJSON();
    push({ type: 'user', handle: data.handle, label: data.label, source: 'manual' });
  });
  hashtagRows.forEach((row: any) => {
    const data = row.toJSON();
    push({ type: 'hashtag', handle: data.handle, label: data.label, source: 'manual' });
  });

  return targets;
};
