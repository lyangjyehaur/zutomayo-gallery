import { Request, Response, NextFunction } from 'express';
import { GeoRawLogModel, SysConfigModel, SysDictionaryModel, sequelize } from '../models/index.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getCountryCode, getFullGeoInfo } from '../services/geo.service.js';
import { redisClient } from '../services/redis.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import {
  toggleMaintenanceSchema,
  saveGeoRawSchema,
  updateDictionariesSchema,
  createDictionarySchema,
  patchDictionarySchema,
} from '../validators/system.validator.js';
const isProduction = process.env.NODE_ENV === 'production';

// 取得編譯時間與版本號的變數 (只在伺服器啟動時讀取一次)
let buildTime: string | null = null;
let appVersion: string | null = process.env.APP_VERSION || null;

try {
  // index.js 位於 dist/ 目錄下，所以取它的修改時間作為編譯時間
  const indexFilePath = path.join(process.cwd(), 'dist', 'index.js');
  if (fs.existsSync(indexFilePath)) {
    const stats = fs.statSync(indexFilePath);
    buildTime = stats.mtime.toISOString();
  }
  
  // 取得 package.json 中的版本號 (若環境變數未設定)
  if (!appVersion) {
    const pkgPaths = [
      path.resolve(process.cwd(), '..', 'package.json'),
      path.resolve(process.cwd(), 'package.json'),
    ];

    for (const pkgPath of pkgPaths) {
      if (!fs.existsSync(pkgPath)) continue;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg?.version) {
        appVersion = pkg.version;
        break;
      }
    }
  }
} catch (err) {
  logger.warn({ err }, 'Unable to determine backend build time or version');
}

export const getSystemStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const row = await SysConfigModel.findByPk('maintenance_mode');
    const maintenance = row ? (row.toJSON() as any).value === true || (row.toJSON() as any).value === 'true' : true;
    
    const typeRow = await SysConfigModel.findByPk('maintenance_type');
    const type = typeRow ? (typeRow.toJSON() as any).value : 'ui';

    const etaRow = await SysConfigModel.findByPk('maintenance_eta');
    const eta = etaRow ? (etaRow.toJSON() as any).value : null;

    res.json({ 
      success: true, 
      data: { 
        maintenance, 
        type, 
        eta, 
        buildTime, 
        version: appVersion
      } 
    });
  } catch (error) {
    if (!isProduction) {
      res.json({
        success: true,
        data: {
          maintenance: false,
          type: 'data',
          eta: null,
          buildTime,
          version: appVersion,
        },
      });
      return;
    }
    next(error);
  }
};

/**
 * 獲取客戶端地理位置資訊
 * 100% 本地化查詢 (使用記憶體中的 ip2region xdb 引擎)
 * 無外部網路依賴，0 毫秒延遲，中國大陸 IP 解析準確率極高
 */
export const getClientGeo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. 如果有 Cloudflare 的 CF-IPCountry 標頭，代表使用者正在透過 CF 存取
    const cfCountry = req.headers['cf-ipcountry'] as string;
    if (cfCountry && cfCountry !== 'XX') {
      res.json({ success: true, data: { country: cfCountry, source: 'cloudflare' } });
      return;
    }

    // 2. 獲取客戶端真實 IP
    let clientIp = (req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip || '') as string;
    
    if (clientIp.includes(',')) {
      clientIp = clientIp.split(',')[0].trim();
    }
    
    if (clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.replace('::ffff:', '');
    }

    if (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp.startsWith('192.168.') || clientIp.startsWith('10.')) {
      res.json({ success: true, data: { country: 'LOCAL', source: 'local' } });
      return;
    }

    // 3. 使用我們本地自己搭建的雙引擎 geo 服務查詢
    const geoInfo = await getFullGeoInfo(clientIp);
    const countryCode = await getCountryCode(clientIp);

    res.json({ 
      success: true, 
      data: { 
        country: countryCode, 
        rawCountry: geoInfo ? (geoInfo.source === 'geoip-lite' ? geoInfo.country : geoInfo.country) : 'UNKNOWN',
        rawString: geoInfo ? geoInfo.raw : '',
        ip2regionRaw: geoInfo?.ip2regionRaw,
        geoipRaw: geoInfo?.geoipRaw,
        maxmindCityRaw: geoInfo?.maxmindCityRaw,
        maxmindAsnRaw: geoInfo?.maxmindAsnRaw,
        source: geoInfo ? geoInfo.source : 'fallback',
        ip: clientIp,
        details: geoInfo
      } 
    });
  } catch (error) {
    logger.error({ err: error }, '[Geo] Error resolving client IP');
    res.json({ success: true, data: { country: 'UNKNOWN', source: 'error' } });
  }
};

export const saveGeoRaw = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = saveGeoRawSchema.parse(req.body);
    const {
      geo_session_id,
      ip,
      country,
      raw_country,
      ip2region_raw,
      geoip_raw,
      maxmind_city_raw,
      maxmind_asn_raw,
      ip2region_sha256,
      geoip_sha256,
      maxmind_city_sha256,
      maxmind_asn_sha256,
    } = parsed;

    const userAgent = req.headers['user-agent'];

    const sessionId = typeof geo_session_id === 'string' && geo_session_id.length > 0 ? geo_session_id : null;
    if (sessionId) {
      const existing = await GeoRawLogModel.findOne({ where: { geo_session_id: sessionId } });
      if (existing) {
        res.json({ success: true, data: { id: (existing as any).id } });
        return;
      }
    }

    const row = await GeoRawLogModel.create({
      geo_session_id: sessionId,
      ip,
      country: typeof country === 'string' ? country : null,
      raw_country: typeof raw_country === 'string' ? raw_country : null,
      ip2region_raw: typeof ip2region_raw === 'string' ? ip2region_raw : null,
      geoip_raw: typeof geoip_raw === 'string' ? geoip_raw : null,
      maxmind_city_raw: typeof maxmind_city_raw === 'string' ? maxmind_city_raw : null,
      maxmind_asn_raw: typeof maxmind_asn_raw === 'string' ? maxmind_asn_raw : null,
      ip2region_sha256: typeof ip2region_sha256 === 'string' ? ip2region_sha256 : null,
      geoip_sha256: typeof geoip_sha256 === 'string' ? geoip_sha256 : null,
      maxmind_city_sha256: typeof maxmind_city_sha256 === 'string' ? maxmind_city_sha256 : null,
      maxmind_asn_sha256: typeof maxmind_asn_sha256 === 'string' ? maxmind_asn_sha256 : null,
      user_agent: typeof userAgent === 'string' ? userAgent : null,
    });

    res.json({ success: true, data: { id: (row as any).id } });
  } catch (error) {
    if (error instanceof AppError) throw error;
    next(error);
  }
};

export const toggleMaintenance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = toggleMaintenanceSchema.parse(req.body);
    const { maintenance, type, eta } = parsed;

    await sequelize.transaction(async (t: any) => {
      await SysConfigModel.upsert({ key: 'maintenance_mode', value: maintenance }, { transaction: t });

      if (type) {
        await SysConfigModel.upsert({ key: 'maintenance_type', value: type }, { transaction: t });
      }

      if (eta !== undefined) {
        await SysConfigModel.upsert({ key: 'maintenance_eta', value: eta ? String(eta) : '' }, { transaction: t });
      }
    });

    res.json({ success: true, data: { maintenance, type, eta } });
  } catch (error) {
    if (error instanceof AppError) throw error;
    next(error);
  }
};

export const getDictionaries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dicts = await SysDictionaryModel.findAll({
      order: [['category', 'ASC'], ['sort_order', 'ASC']]
    });
    res.json({ success: true, data: dicts });
  } catch (error) {
    next(error);
  }
};

export const updateDictionaries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = updateDictionariesSchema.parse(req.body);
    const { dicts, deletedIds } = parsed;
    if (dicts && Array.isArray(dicts)) {
      const seen = new Set<string>();
      for (const d of dicts) {
        const category = typeof d?.category === 'string' ? d.category.trim() : '';
        const code = typeof d?.code === 'string' ? d.code.trim() : '';
        const label = typeof d?.label === 'string' ? d.label.trim() : '';
        if (!category || !code || !label) {
          throw new AppError(400, 'DICT_INVALID');
        }
        const key = `${category}::${code}`;
        if (seen.has(key)) {
          throw new AppError(400, 'DICT_DUPLICATE_CODE');
        }
        seen.add(key);
      }
    }
    
    await sequelize.transaction(async (t: any) => {
      if (deletedIds && deletedIds.length > 0) {
        await SysDictionaryModel.destroy({
          where: { id: deletedIds },
          transaction: t
        });
      }
      
      if (dicts && dicts.length > 0) {
        for (const dict of dicts) {
          await SysDictionaryModel.upsert({
            id: dict.id,
            category: dict.category,
            code: dict.code,
            label: dict.label,
            description: dict.description,
            sort_order: dict.sort_order || 0
          }, { transaction: t });
        }
      }
    });

    const updatedDicts = await SysDictionaryModel.findAll({
      order: [['category', 'ASC'], ['sort_order', 'ASC']]
    });
    
    res.json({ success: true, data: updatedDicts });
  } catch (error) {
    if (error instanceof AppError) throw error;
    next(error);
  }
};

export const createDictionary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createDictionarySchema.parse(req.body);
    const category = parsed.category.trim();
    const code = parsed.code.trim();
    const label = parsed.label.trim();
    const description = parsed.description ?? '';
    const sort_order = parsed.sort_order ?? 0;
    if (!category || !code || !label) {
      throw new AppError(400, 'DICT_INVALID');
    }

    const dup = await SysDictionaryModel.findOne({ where: { category, code } as any });
    if (dup) {
      throw new AppError(400, 'DICT_DUPLICATE_CODE');
    }

    const row = await SysDictionaryModel.create({ category, code, label, description, sort_order } as any);
    res.json({ success: true, data: row });
  } catch (error) {
    if (error instanceof AppError) throw error;
    next(error);
  }
};

export const patchDictionary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id || '');
    const row = await SysDictionaryModel.findByPk(id);
    if (!row) {
      throw new AppError(404, 'NOT_FOUND');
    }
    const parsed = patchDictionarySchema.parse(req.body);
    const update: any = {};
    if (parsed.category !== undefined) update.category = parsed.category.trim();
    if (parsed.code !== undefined) update.code = parsed.code.trim();
    if (parsed.label !== undefined) update.label = parsed.label.trim();
    if (parsed.description !== undefined) update.description = parsed.description;
    if (parsed.sort_order !== undefined) update.sort_order = parsed.sort_order;

    const nextCategory = 'category' in update ? update.category : (row as any).category;
    const nextCode = 'code' in update ? update.code : (row as any).code;
    const nextLabel = 'label' in update ? update.label : (row as any).label;
    if (!nextCategory || !nextCode || !nextLabel) {
      throw new AppError(400, 'DICT_INVALID');
    }

    if ('category' in update || 'code' in update) {
      const dup = await SysDictionaryModel.findOne({ where: { category: nextCategory, code: nextCode } as any });
      if (dup && String((dup as any).id) !== id) {
        throw new AppError(400, 'DICT_DUPLICATE_CODE');
      }
    }

    await row.update(update);
    res.json({ success: true, data: row });
  } catch (error) {
    if (error instanceof AppError) throw error;
    next(error);
  }
};

export const deleteDictionary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id || '');
    const row = await SysDictionaryModel.findByPk(id);
    if (!row) {
      throw new AppError(404, 'NOT_FOUND');
    }
    await row.destroy();
    res.json({ success: true, data: { id } });
  } catch (error) {
    if (error instanceof AppError) throw error;
    next(error);
  }
};

export const clearRedisApiCache = async (req: Request, res: Response) => {
  if (!redisClient.isOpen) {
    res.json({ success: true, data: { cleared: 0, message: 'Redis is not connected' } });
    return;
  }

  const keys: string[] = [];
  for await (const key of redisClient.scanIterator({ MATCH: 'api-cache:*', COUNT: 200 })) {
    keys.push(String(key));
    if (keys.length >= 5000) break;
  }

  if (keys.length === 0) {
    res.json({ success: true, data: { cleared: 0 } });
    return;
  }

  await redisClient.del(keys);
  res.json({ success: true, data: { cleared: keys.length } });
};
