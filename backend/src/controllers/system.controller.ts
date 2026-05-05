import { Request, Response, NextFunction } from 'express';
import { GeoRawLogModel, SysConfigModel, SysDictionaryModel, sequelize } from '../models/index.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getCountryCode, getFullGeoInfo } from '../services/geo.service.js';
import { redisClient } from '../services/redis.service.js';
import { trackUmamiEvent } from '../services/umami.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

// 中國大陸時區列表 (用於 VPN 偵測)
const CHINA_TIMEZONES = ['Asia/Shanghai', 'Asia/Urumqi', 'Asia/Chongqing', 'Asia/Harbin', 'Asia/Kashgar'];
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
    // 前端傳來的瀏覽器資訊 (用於 VPN 偵測和 Umami 追蹤)
    const tz = (req.query.tz as string) || '';
    const lang = (req.query.lang as string) || '';
    const userAgent = req.headers['user-agent'] as string | undefined;

    // 1. 如果有 Cloudflare 的 CF-IPCountry 標頭，代表使用者正在透過 CF 存取
    const cfCountry = req.headers['cf-ipcountry'] as string;
    if (cfCountry && cfCountry !== 'XX') {
      // 即使走 CF 快捷路徑，也嘗試發送 Umami 事件
      if (clientIpFromReq(req)) {
        const isVpn = CHINA_TIMEZONES.includes(tz) && cfCountry !== 'CN';
        trackUmamiEvent('Z_Geo_Location_Detected', {
          country: cfCountry,
          raw_country: cfCountry,
          ip2region_raw: 'unknown',
          is_vpn: isVpn ? 'true' : 'false',
          timezone: tz || 'unknown',
          language: lang || 'unknown',
          ip: clientIpFromReq(req)!,
          source: 'cloudflare',
        }, userAgent, clientIpFromReq(req)!);
      }
      res.json({ success: true, data: { country: cfCountry, source: 'cloudflare' } });
      return;
    }

    // 2. 獲取客戶端真實 IP
    const clientIp = clientIpFromReq(req);
    
    if (!clientIp || isLocalIp(clientIp)) {
      res.json({ success: true, data: { country: 'LOCAL', source: 'local' } });
      return;
    }

    // 3. 使用我們本地自己搭建的雙引擎 geo 服務查詢
    const geoInfo = await getFullGeoInfo(clientIp);
    const countryCode = await getCountryCode(clientIp);

    // 4. 計算 VPN 偵測 (時區暗示中國但 IP 不在中國)
    const isVpn = CHINA_TIMEZONES.includes(tz) && countryCode !== 'CN';

    // 5. 發送 Umami 追蹤事件 (服務端直接帶 IP，不經過前端)
    if (countryCode !== 'LOCAL' && countryCode !== 'UNKNOWN') {
      const payload: Record<string, string | number> = {
        country: countryCode,
        raw_country: geoInfo?.country || countryCode,
        ip2region_raw: geoInfo?.ip2regionRaw || 'unknown',
        is_vpn: isVpn ? 'true' : 'false',
        timezone: tz || 'unknown',
        language: lang || 'unknown',
        ip: clientIp,
      };

      if (geoInfo?.province) payload.province = geoInfo.province;
      if (geoInfo?.city) payload.city = geoInfo.city;
      if (geoInfo?.isp) payload.isp = geoInfo.isp;

      // 解析 geoip-lite 的 JSON 字串
      if (geoInfo?.geoipRaw) {
        try {
          const geoipObj = JSON.parse(geoInfo.geoipRaw);
          if (geoipObj.country) payload.geoip_country = geoipObj.country;
          if (geoipObj.region) payload.geoip_region = geoipObj.region;
          if (geoipObj.city) payload.geoip_city = geoipObj.city;
          if (geoipObj.timezone) payload.geoip_timezone = geoipObj.timezone;
          if (geoipObj.ll && Array.isArray(geoipObj.ll)) {
            payload.geoip_lat = geoipObj.ll[0];
            payload.geoip_lon = geoipObj.ll[1];
          }
        } catch { /* ignore parse errors */ }
      }

      // 解析 MaxMind City 的 JSON 字串
      if (geoInfo?.maxmindCityRaw) {
        try {
          const mm = JSON.parse(geoInfo.maxmindCityRaw);
          if (mm?.country?.iso_code) payload.maxmind_country = mm.country.iso_code;
          const mmRegion = mm?.subdivisions?.[0]?.iso_code || '';
          if (mmRegion) payload.maxmind_region = mmRegion;
          const mmCity = mm?.city?.names?.en || '';
          if (mmCity) payload.maxmind_city = mmCity;
          const mmTz = mm?.location?.time_zone || '';
          if (mmTz) payload.maxmind_timezone = mmTz;
          const lat = mm?.location?.latitude;
          const lon = mm?.location?.longitude;
          if (typeof lat === 'number') payload.maxmind_lat = lat;
          if (typeof lon === 'number') payload.maxmind_lon = lon;
        } catch { /* ignore parse errors */ }
      }

      // 解析 MaxMind ASN 的 JSON 字串
      if (geoInfo?.maxmindAsnRaw) {
        try {
          const mmAsn = JSON.parse(geoInfo.maxmindAsnRaw);
          if (mmAsn?.autonomous_system_number) payload.maxmind_asn = mmAsn.autonomous_system_number;
          if (mmAsn?.autonomous_system_organization) payload.maxmind_org = mmAsn.autonomous_system_organization;
        } catch { /* ignore parse errors */ }
      }

      trackUmamiEvent('Z_Geo_Location_Detected', payload, userAgent, clientIp);
    }

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
        hasIp: true,
        details: geoInfo
      } 
    });
  } catch (error) {
    logger.error({ err: error }, '[Geo] Error resolving client IP');
    res.json({ success: true, data: { country: 'UNKNOWN', source: 'error' } });
  }
};

/** 從請求中提取客戶端 IP */
function clientIpFromReq(req: Request): string | null {
  let ip = (req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip || '') as string;
  if (ip.includes(',')) ip = ip.split(',')[0].trim();
  if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
  return ip || null;
}

/** 判斷是否為本地/內網 IP */
function isLocalIp(ip: string): boolean {
  return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
}

export const saveGeoRaw = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = saveGeoRawSchema.parse(req.body);
    const {
      geo_session_id,
      ip: bodyIp,
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
    // 優先使用 body 中的 IP，否則從請求頭提取
    const clientIp = bodyIp || clientIpFromReq(req) || '';

    const sessionId = typeof geo_session_id === 'string' && geo_session_id.length > 0 ? geo_session_id : null;
    if (sessionId) {
      const existing = await GeoRawLogModel.findOne({ where: { geo_session_id: sessionId } });
      if (existing) {
        res.json({ success: true, data: { id: (existing as any).id } });
        return;
      }
    }

    // 如果前端沒傳 SHA-256，後端自己計算
    const sha = (raw: string | undefined, provided: string | undefined) => {
      if (provided) return provided;
      if (!raw) return null;
      return crypto.createHash('sha256').update(raw).digest('hex');
    };
    const computedIp2regionSha = sha(ip2region_raw, ip2region_sha256);
    const computedGeoipSha = sha(geoip_raw, geoip_sha256);
    const computedMaxmindCitySha = sha(maxmind_city_raw, maxmind_city_sha256);
    const computedMaxmindAsnSha = sha(maxmind_asn_raw, maxmind_asn_sha256);

    const row = await GeoRawLogModel.create({
      geo_session_id: sessionId,
      ip: clientIp,
      country: typeof country === 'string' ? country : null,
      raw_country: typeof raw_country === 'string' ? raw_country : null,
      ip2region_raw: typeof ip2region_raw === 'string' ? ip2region_raw : null,
      geoip_raw: typeof geoip_raw === 'string' ? geoip_raw : null,
      maxmind_city_raw: typeof maxmind_city_raw === 'string' ? maxmind_city_raw : null,
      maxmind_asn_raw: typeof maxmind_asn_raw === 'string' ? maxmind_asn_raw : null,
      ip2region_sha256: computedIp2regionSha,
      geoip_sha256: computedGeoipSha,
      maxmind_city_sha256: computedMaxmindCitySha,
      maxmind_asn_sha256: computedMaxmindAsnSha,
      user_agent: typeof userAgent === 'string' ? userAgent : null,
    });

    // 發送 Z_Geo_Raw_Detected 事件到 Umami (服務端直接帶 IP)
    const rawCountryStr = raw_country || country || '';
    if (clientIp && (ip2region_raw || geoip_raw || maxmind_city_raw || maxmind_asn_raw)) {
      const rawPayload: Record<string, string> = {
        country: country || '',
        raw_country: rawCountryStr,
        ip: clientIp,
      };
      const geoRawId = String((row as any).id);
      if (geoRawId) rawPayload.geo_raw_id = geoRawId;
      if (!geoRawId) {
        if (computedIp2regionSha) rawPayload.ip2region_hash = computedIp2regionSha.slice(0, 12);
        if (computedGeoipSha) rawPayload.geoip_hash = computedGeoipSha.slice(0, 12);
        if (computedMaxmindCitySha) rawPayload.maxmind_city_hash = computedMaxmindCitySha.slice(0, 12);
        if (computedMaxmindAsnSha) rawPayload.maxmind_asn_hash = computedMaxmindAsnSha.slice(0, 12);
      }
      trackUmamiEvent('Z_Geo_Raw_Detected', rawPayload, typeof userAgent === 'string' ? userAgent : undefined, clientIp);
    }

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
