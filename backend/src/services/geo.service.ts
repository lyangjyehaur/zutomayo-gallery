import path from 'path';
import fs from 'fs';
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
export const initGeoService = () => {
  try {
    if (fs.existsSync(dbPath)) {
      searcher = new Ip2Region(dbPath);
      console.log('[GeoService] ip2region database loaded into memory.');
    } else {
      console.warn(`[GeoService] ip2region.xdb not found at ${dbPath}. Please run the update script.`);
    }
  } catch (error) {
    console.error('[GeoService] Failed to initialize geo service:', error);
  }
};

/**
 * 查詢 IP 的完整地理資訊
 */
export const getFullGeoInfo = async (ip: string): Promise<{ country: string, region: string, province: string, city: string, isp: string, raw: string } | null> => {
  if (!searcher) {
    initGeoService();
  }

  if (searcher) {
    const result = searcher.search(ip);
    if (result) {
      // ip2region 格式: 國家|區域|省份|城市|ISP
      // 範例 1: 中国|0|广东省|深圳市|电信
      // 範例 2: 美国|0|加利福尼亚|洛杉矶|Level3
      // 注意：如果某個欄位沒有資料，會用 '0' 表示
      const parts = result.split('|');
      
      return {
        country: parts[0] === '0' ? 'UNKNOWN' : parts[0],
        region: parts[1] === '0' ? '' : parts[1],
        province: parts[2] === '0' ? '' : parts[2],
        city: parts[3] === '0' ? '' : parts[3],
        isp: parts[4] === '0' ? '' : parts[4],
        raw: result // 新增：保存最原始的 ip2region 查詢結果字串
      };
    }
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
    // 特殊處理：ip2region 有時會把台港澳歸在 country="中国", province="台湾"
    if (geo.province === '台湾') return 'TW';
    if (geo.province === '香港') return 'HK';
    if (geo.province === '澳门') return 'MO';
    
    // 從映射表中尋找標準代碼
    if (countryToIsoMap[geo.country]) {
      return countryToIsoMap[geo.country];
    }
    
    // 如果不在常見映射表中，回傳 OTHERS
    return 'OTHERS';
  }
  
  return 'UNKNOWN';
};
