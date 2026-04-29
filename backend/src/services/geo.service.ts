import path from 'path';
import fs from 'fs';
import geoip from 'geoip-lite';
import maxmind, { type Reader } from 'maxmind';
import { fileURLToPath } from 'url';
import { Ip2Region, Ip2RegionV6 } from '../utils/ip2region.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// xdb 檔案存放在 backend/data/
const dbDir = path.join(__dirname, '../../data');
const dbV4Path = path.join(dbDir, 'ip2region.xdb');
const dbV6Path = path.join(dbDir, 'ip2region_v6.xdb');
const maxmindCityPath = path.join(dbDir, 'GeoLite2-City.mmdb');
const maxmindAsnPath = path.join(dbDir, 'GeoLite2-ASN.mmdb');

let searcherV4: Ip2Region | null = null;
let searcherV6: Ip2RegionV6 | null = null;
let maxmindCityReader: Reader<any> | null = null;
let maxmindAsnReader: Reader<any> | null = null;

/**
 * 初始化 Geo 服務 (載入資料庫至記憶體)
 * 改為啟動時直接讀取本地檔案，由外部 crontab 腳本負責下載與更新
 */
export const initGeoService = async () => {
  try {
    // 1. 載入 ip2region (中國大陸高精度)
    if (fs.existsSync(dbV4Path)) {
      searcherV4 = new Ip2Region(dbV4Path);
      console.log('[GeoService] ip2region v4 database loaded into memory.');
    } else {
      console.warn(`[GeoService] ip2region.xdb not found at ${dbV4Path}. Please run the update script.`);
    }

    if (fs.existsSync(dbV6Path)) {
      searcherV6 = new Ip2RegionV6(dbV6Path);
      console.log('[GeoService] ip2region v6 database loaded into memory.');
    } else {
      console.warn(`[GeoService] ip2region_v6.xdb not found at ${dbV6Path}. Please run the update script.`);
    }

    if (fs.existsSync(maxmindCityPath)) {
      maxmindCityReader = await maxmind.open(maxmindCityPath, {
        watchForUpdates: false,
        cache: { max: 1000 }
      });
      console.log('[GeoService] MaxMind GeoLite2 City database loaded.');
    }

    if (fs.existsSync(maxmindAsnPath)) {
      maxmindAsnReader = await maxmind.open(maxmindAsnPath, {
        watchForUpdates: false,
        cache: { max: 2000 }
      });
      console.log('[GeoService] MaxMind GeoLite2 ASN database loaded.');
    }

    // 2. geoip-lite 內建自帶資料庫，會在首次呼叫 lookup 時自動載入記憶體
    console.log('[GeoService] geoip-lite is ready.');
  } catch (error) {
    console.error('[GeoService] Failed to initialize geo service:', error);
  }
};

/**
 * 查詢 IP 的完整地理資訊
 */
export const getFullGeoInfo = async (ip: string): Promise<{ country: string, region: string, province: string, city: string, isp: string, raw: string, source: 'ip2region' | 'geoip-lite' | 'maxmind', ip2regionRaw?: string, geoipRaw?: string, maxmindCityRaw?: string, maxmindAsnRaw?: string } | null> => {
  if (!searcherV4 && !searcherV6 && !maxmindCityReader && !maxmindAsnReader) {
    await initGeoService();
  }

  let ip2regionResult: string | null = null;
  let geoipResult: geoip.Lookup | null = null;
  let maxmindCityResult: any | null = null;
  let maxmindAsnResult: any | null = null;

  // 1. 同時執行兩個引擎的查詢
  const isIPv6 = ip.includes(':');
  if (isIPv6) {
    if (searcherV6) ip2regionResult = searcherV6.search(ip);
  } else {
    if (searcherV4) ip2regionResult = searcherV4.search(ip);
  }
  
  try {
    geoipResult = geoip.lookup(ip);
  } catch (e) {
    console.warn(`[GeoService] geoip-lite lookup failed for ${ip}:`, e);
  }

  const ip2regionRaw = ip2regionResult || undefined;
  const geoipRaw = geoipResult ? JSON.stringify(geoipResult) : undefined;
  if (maxmindCityReader) {
    try {
      maxmindCityResult = maxmindCityReader.get(ip) || null;
    } catch (e) {
      console.warn(`[GeoService] maxmind city lookup failed for ${ip}:`, e);
    }
  }

  if (maxmindAsnReader) {
    try {
      maxmindAsnResult = maxmindAsnReader.get(ip) || null;
    } catch (e) {
      console.warn(`[GeoService] maxmind asn lookup failed for ${ip}:`, e);
    }
  }

  const maxmindCityRaw = maxmindCityResult ? JSON.stringify(maxmindCityResult) : undefined;
  const maxmindAsnRaw = maxmindAsnResult ? JSON.stringify(maxmindAsnResult) : undefined;

  if (maxmindCityResult?.country?.iso_code || geoipResult?.country) {
    const isoCountry = (maxmindCityResult?.country?.iso_code || geoipResult?.country) as string;

    // 如果判斷為中國大陸 (CN)，我們才使用 ip2region 的高精度詳細資料
    if (isoCountry === 'CN' && ip2regionResult) {
      const parts = ip2regionResult.split('|');
      const country = parts[0] === '0' ? 'UNKNOWN' : parts[0];
      const province = parts[1] === '0' ? '' : parts[1];
      const city = parts[2] === '0' ? '' : parts[2];
      const isp = parts[3] === '0' ? '' : parts[3];

      return {
        country,
        region: province,
        province,
        city,
        isp,
        raw: ip2regionResult,
        source: 'ip2region',
        ip2regionRaw,
        geoipRaw,
        maxmindCityRaw,
        maxmindAsnRaw
      };
    }

    const provinceName = maxmindCityResult?.subdivisions?.[0]?.names?.['zh-CN']
      || maxmindCityResult?.subdivisions?.[0]?.names?.en
      || maxmindCityResult?.subdivisions?.[0]?.iso_code
      || geoipResult?.region
      || '';
    const cityName = maxmindCityResult?.city?.names?.['zh-CN']
      || maxmindCityResult?.city?.names?.en
      || geoipResult?.city
      || '';
    const asnOrg = maxmindAsnResult?.autonomous_system_organization || '';

    return {
      country: isoCountry, // 直接回傳標準代碼 (如 TW, US)
      region: provinceName,
      province: provinceName,
      city: cityName,
      isp: asnOrg,
      raw: maxmindCityRaw || (geoipResult ? JSON.stringify(geoipResult) : ''),
      source: maxmindCityRaw ? 'maxmind' : 'geoip-lite',
      ip2regionRaw,
      geoipRaw,
      maxmindCityRaw,
      maxmindAsnRaw
    };
  }
  
  // 3. Fallback (最差情況：geoip-lite 查不到，但 ip2region 之前有查到資訊)
  if (ip2regionResult) {
    const parts = ip2regionResult.split('|');
    const country = parts[0] === '0' ? 'UNKNOWN' : parts[0];
    const province = parts[1] === '0' ? '' : parts[1];
    const city = parts[2] === '0' ? '' : parts[2];
    const isp = parts[3] === '0' ? '' : parts[3];
    
    return {
      country,
      region: province,
      province,
      city,
      isp,
      raw: ip2regionResult,
      source: 'ip2region',
      ip2regionRaw,
      geoipRaw,
      maxmindCityRaw,
      maxmindAsnRaw
    };
  }
  
  return null;
};

// 常見國家中文名到 ISO 3166-1 alpha-2 代碼的映射表
// 用於將 ip2region 返回的中文國家名稱轉換為標準代碼
const countryToIsoMap: Record<string, string> = {
  '中国': 'CN', '台湾': 'TW', '香港': 'HK', '澳门': 'MO',
  '日本': 'JP', '韩国': 'KR', '美国': 'US', '英国': 'GB',
  '法国': 'FR', '德国': 'DE', '意大利': 'IT', '加拿大': 'CA',
  '澳大利亚': 'AU', '新西兰': 'NZ', '新加坡': 'SG', '马来西亚': 'MY',
  '泰国': 'TH', '印度尼西亚': 'ID', '越南': 'VN', '菲律宾': 'PH',
  '俄罗斯': 'RU', '印度': 'IN', '巴西': 'RU', '南非': 'ZA',
  '荷兰': 'NL', '瑞士': 'NL', '瑞典': 'CH', '西班牙': 'ES'
};

/**
 * 查詢 IP 的國家代碼 (CN, TW, US 等)
 */
export const getCountryCode = async (ip: string): Promise<string> => {
  const geo = await getFullGeoInfo(ip);
  
  if (geo && geo.country !== 'UNKNOWN') {
    // 若為 geoip-lite / maxmind 回傳的結果，它本身就已經是 ISO 2 字母代碼 (例如 'US', 'GB')
    if (geo.source === 'geoip-lite' || geo.source === 'maxmind') {
      return geo.country;
    }
    
    // 特殊處理：ip2region 有時會把台港澳歸在 country="中国", province="台湾"
    if (geo.province === '台湾') return 'TW';
    if (geo.province === '香港') return 'HK';
    if (geo.province === '澳门') return 'MO';
    
    // 從映射表中尋找標準代碼 (針對 ip2region 的中文回傳)
    if (countryToIsoMap[geo.country]) {
      return countryToIsoMap[geo.country];
    }
    
    // 如果不在常見映射表中，回傳 OTHERS
    return 'OTHERS';
  }
  
  return 'UNKNOWN';
};
