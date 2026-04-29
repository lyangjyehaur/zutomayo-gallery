import path from 'path';
import fs from 'fs';
import maxmind, { type Reader } from 'maxmind';
import { fileURLToPath } from 'url';
import { Ip2Region, Ip2RegionV6 } from '../utils/ip2region.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// xdb 檔案存放在 backend/data/
const dbDir = path.join(__dirname, '../../data');
const dbV4Path = path.join(dbDir, 'ip2region.xdb');
const dbV6Path = path.join(dbDir, 'ip2region_v6.xdb');
const mmdbCityPath = path.join(dbDir, 'GeoLite2-City.mmdb');
const mmdbAsnPath = path.join(dbDir, 'GeoLite2-ASN.mmdb');

let searcherV4: Ip2Region | null = null;
let searcherV6: Ip2RegionV6 | null = null;
let cityReader: Reader<any> | null = null;
let asnReader: Reader<any> | null = null;

/**
 * 初始化 Geo 服務 (載入資料庫至記憶體)
 * 改為啟動時直接讀取本地檔案，由外部 crontab 腳本負責下載與更新
 */
export const initGeoService = async () => {
  try {
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

    if (fs.existsSync(mmdbCityPath)) {
      cityReader = await maxmind.open(mmdbCityPath, { cache: { max: 5000 }, watchForUpdates: false });
      console.log('[GeoService] GeoLite2 City database loaded.');
    } else {
      console.warn(`[GeoService] GeoLite2-City.mmdb not found at ${mmdbCityPath}.`);
    }

    if (fs.existsSync(mmdbAsnPath)) {
      asnReader = await maxmind.open(mmdbAsnPath, { cache: { max: 5000 }, watchForUpdates: false });
      console.log('[GeoService] GeoLite2 ASN database loaded.');
    } else {
      console.warn(`[GeoService] GeoLite2-ASN.mmdb not found at ${mmdbAsnPath}.`);
    }
  } catch (error) {
    console.error('[GeoService] Failed to initialize geo service:', error);
  }
};

/**
 * 查詢 IP 的完整地理資訊
 */
export const getFullGeoInfo = async (ip: string): Promise<{ country: string, region: string, province: string, city: string, isp: string, raw: string, source: 'ip2region' | 'maxmind', ip2regionRaw?: string, geoipRaw?: string } | null> => {
  if (!searcherV4 && !searcherV6 && !cityReader && !asnReader) {
    await initGeoService();
  }

  let ip2regionResult: string | null = null;
  let mmCity: any = null;
  let mmAsn: any = null;

  // 1. 同時執行兩個引擎的查詢
  const isIPv6 = ip.includes(':');
  if (isIPv6) {
    if (searcherV6) ip2regionResult = searcherV6.search(ip);
  } else {
    if (searcherV4) ip2regionResult = searcherV4.search(ip);
  }
  
  try {
    if (cityReader) mmCity = cityReader.get(ip);
    if (asnReader) mmAsn = asnReader.get(ip);
  } catch (e) {
    console.warn(`[GeoService] MaxMind lookup failed for ${ip}:`, e);
  }

  const ip2regionRaw = ip2regionResult || undefined;
  const maxmindLite: any = {};
  if (mmCity?.country?.iso_code) {
    maxmindLite.country = mmCity.country.iso_code;
    maxmindLite.timezone = mmCity.location?.time_zone || '';
    if (typeof mmCity.location?.latitude === 'number' && typeof mmCity.location?.longitude === 'number') {
      maxmindLite.ll = [mmCity.location.latitude, mmCity.location.longitude];
    }

    const locale = mmCity.country.iso_code === 'CN' ? 'zh-CN' : 'en';
    const subdivision = Array.isArray(mmCity.subdivisions) ? mmCity.subdivisions[0] : undefined;
    const regionIso = subdivision?.iso_code || '';
    const regionName = subdivision?.names?.[locale] || subdivision?.names?.en || '';
    maxmindLite.region = regionIso || regionName;

    const cityName = mmCity.city?.names?.[locale] || mmCity.city?.names?.en || '';
    maxmindLite.city = cityName;
  }
  if (mmAsn?.autonomous_system_number) {
    maxmindLite.asn = mmAsn.autonomous_system_number;
    maxmindLite.org = mmAsn.autonomous_system_organization || '';
  }
  const geoipRaw = Object.keys(maxmindLite).length > 0 ? JSON.stringify(maxmindLite) : undefined;

  if (maxmindLite.country) {
    const isoCountry = maxmindLite.country;

    // 如果 MaxMind 判斷為中國大陸 (CN)，我們才使用 ip2region 的高精度詳細資料
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
        geoipRaw
      };
    }

    const province = maxmindLite.region || '';
    const city = maxmindLite.city || '';

    return {
      country: isoCountry,
      region: province,
      province,
      city,
      isp: '',
      raw: geoipRaw || '',
      source: 'maxmind',
      ip2regionRaw,
      geoipRaw
    };
  }
  
  // 3. Fallback
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
      geoipRaw
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
    if (geo.source === 'maxmind') {
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
