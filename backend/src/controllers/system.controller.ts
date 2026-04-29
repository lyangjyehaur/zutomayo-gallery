import { Request, Response, NextFunction } from 'express';
import { SysConfigModel, SysDictionaryModel, sequelize } from '../models/index.js';
import fs from 'fs';
import path from 'path';
import { getCountryCode, getFullGeoInfo } from '../services/geo.service.js';
import { redisClient } from '../services/redis.service.js';
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
  console.warn('Unable to determine backend build time or version', err);
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
        rawCountry: geoInfo ? (geoInfo.source === 'geoip-lite' ? geoInfo.country : geoInfo.country) : 'UNKNOWN', // 單獨回傳原始的國家名稱
        rawString: geoInfo ? geoInfo.raw : '', // 回傳主要的原始字串
        ip2regionRaw: geoInfo?.ip2regionRaw, // 獨立回傳 ip2region 解析結果
        geoipRaw: geoInfo?.geoipRaw,         // 獨立回傳 geoip-lite 解析結果
        maxmindCityRaw: geoInfo?.maxmindCityRaw,
        maxmindAsnRaw: geoInfo?.maxmindAsnRaw,
        source: geoInfo ? geoInfo.source : 'fallback',
        ip: clientIp, // 將真實 IP 傳給前端，讓前端可以上報給 Umami
        details: geoInfo // 把詳細資訊也傳給前端備用
      } 
    });
  } catch (error) {
    console.error('[Geo] Error resolving client IP:', error);
    res.json({ success: true, data: { country: 'UNKNOWN', source: 'error' } });
  }
};

export const toggleMaintenance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { maintenance, type, eta } = req.body;
    if (typeof maintenance !== 'boolean') {
      res.status(400).json({ success: false, error: 'Maintenance flag must be a boolean' });
      return;
    }
    if (type && type !== 'data' && type !== 'ui') {
      res.status(400).json({ success: false, error: 'Invalid maintenance type' });
      return;
    }

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
    const { dicts, deletedIds } = req.body;
    
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
    next(error);
  }
};

export const clearRedisApiCache = async (req: Request, res: Response) => {
  try {
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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
