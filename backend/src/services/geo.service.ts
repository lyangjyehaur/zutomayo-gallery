import path from 'path';
import fs from 'fs';
import geoip from 'geoip-lite';
import { fileURLToPath } from 'url';
import { Ip2Region } from '../utils/ip2region.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// xdb 檔案存放在 backend/data/ip2region.xdb
const dbDir = path.join(__dirname, '../../data');
const dbPath = path.join(dbDir, 'ip2region.xdb');

let searcher: Ip2Region | null = null;

/**
 * 初始化 Geo 服務 (載入資料庫至記憶體)
 * 改為啟動時直接讀取本地檔案，由外部 crontab 腳本負責下載與更新
 */
export const initGeoService = async () => {
  try {
    // 1. 載入 ip2region (中國大陸高精度)
    if (fs.existsSync(dbPath)) {
      searcher = new Ip2Region(dbPath);
      console.log('[GeoService] ip2region database loaded into memory.');
    } else {
      console.warn(`[GeoService] ip2region.xdb not found at ${dbPath}. Please run the update script.`);
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
export const getFullGeoInfo = async (ip: string): Promise<{ country: string, region: string, province: string, city: string, isp: string, raw: string, source: 'ip2region' | 'geoip-lite', ip2regionRaw?: string, geoipRaw?: string } | null> => {
  if (!searcher) {
    await initGeoService();
  }

  let ip2regionResult: string | null = null;
  let geoipResult: geoip.Lookup | null = null;

  // 1. 同時執行兩個引擎的查詢
  if (searcher) {
    ip2regionResult = searcher.search(ip);
  }
  
  try {
    geoipResult = geoip.lookup(ip);
  } catch (e) {
    console.warn(`[GeoService] geoip-lite lookup failed for ${ip}:`, e);
  }

  const ip2regionRaw = ip2regionResult || undefined;
  const geoipRaw = geoipResult ? JSON.stringify(geoipResult) : undefined;

  // 2. 判斷邏輯：優先採用 ip2region 的大中華區結果
  if (ip2regionResult) {
    const parts = ip2regionResult.split('|');
    // 最新版的 ip2region_v4.xdb 格式為: 國家 | 省份/州 | 城市 | ISP | 國家代碼
    // 範例: 中国|浙江省|杭州市|中国教育网|CN
    const country = parts[0] === '0' ? 'UNKNOWN' : parts[0];
    const province = parts[1] === '0' ? '' : parts[1];
    const city = parts[2] === '0' ? '' : parts[2];
    const isp = parts[3] === '0' ? '' : parts[3];
    const countryCodeStr = parts[4] === '0' ? '' : parts[4]; // 這是 CN, TW 等代碼
    
    // 如果 ip2region 判斷是亞洲核心區域，直接採信它的結果作為主數據
    if (['中国', '台湾', '香港', '澳门'].includes(country) || ['台湾', '香港', '澳门'].includes(province)) {
      return {
        country,
        region: province, // 這裡的 region 其實對應到省份
        province,
        city,
        isp,
        raw: ip2regionResult,
        source: 'ip2region',
        ip2regionRaw,
        geoipRaw
      };
    }
  }
  
  // 3. 海外 IP，採用 geoip-lite 作為主數據
  if (geoipResult && geoipResult.country) {
    return {
      country: geoipResult.country, // 直接回傳標準代碼 (如 US, GB)
      region: geoipResult.region || '',
      province: geoipResult.region || '', // geoip-lite 的 region 通常對應省/州
      city: geoipResult.city || '',
      isp: '', // geoip-lite 免費版無 ISP
      raw: JSON.stringify(geoipResult),
      source: 'geoip-lite',
      ip2regionRaw,
      geoipRaw
    };
  }
  
  // 4. Fallback (最差情況：geoip-lite 查不到，但 ip2region 之前有查到海外資訊)
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
    // 若為 geoip-lite 回傳的結果，它本身就已經是 ISO 2 字母代碼 (例如 'US', 'GB')
    if (geo.source === 'geoip-lite') {
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
