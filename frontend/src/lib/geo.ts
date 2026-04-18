export interface GeoInfo {
  ipCountry: string;
  isChinaTimezone: boolean;
  isChinaIP: boolean;
  isVPN: boolean;
}

let geoCache: GeoInfo | null = null;

/**
 * 初始化並獲取用戶的地理位置資訊
 * 優先從 sessionStorage 讀取快取，若無則呼叫 Cloudflare Trace API
 */
export const initGeo = async (): Promise<GeoInfo> => {
  if (geoCache) return geoCache;

  try {
    // 檢查 sessionStorage 快取，避免每次重整都發送請求
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('geo_info');
      if (cached) {
        geoCache = JSON.parse(cached);
        return geoCache!;
      }
    }

    // 呼叫 Cloudflare Trace API (免費、極速、支援 HTTPS、無 CORS 限制)
    const res = await fetch('https://1.1.1.1/cdn-cgi/trace', { method: 'GET' });
    const text = await res.text();
    
    // 解析文本中的 loc=XX 欄位
    const match = text.match(/loc=([A-Z]+)/);
    const ipCountry = match ? match[1] : 'UNKNOWN';
    
    // 獲取使用者本地時區
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // 定義中國大陸標準時區 (不含港澳台，避免將港澳台用戶誤判為翻牆)
    const chinaTimezones = [
      'Asia/Shanghai', 'Asia/Urumqi', 'Asia/Chongqing', 
      'Asia/Harbin', 'Asia/Kashgar'
    ];
    const isChinaTimezone = chinaTimezones.includes(timeZone);
    
    const isChinaIP = ipCountry === 'CN';
    
    // 判斷是否為翻牆的 VPN 用戶 (IP 顯示在海外，但本地時區是中國大陸標準時間)
    const isVPN = !isChinaIP && isChinaTimezone;

    geoCache = { ipCountry, isChinaTimezone, isChinaIP, isVPN };
    
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('geo_info', JSON.stringify(geoCache));
    }
    
    return geoCache;
  } catch (e) {
    console.warn('Geo detection failed, falling back to timezone:', e);
    // 降級方案：如果 API 呼叫失敗，純粹依賴時區猜測
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const isChinaTimezone = ['Asia/Shanghai', 'Asia/Urumqi', 'Asia/Chongqing', 'Asia/Harbin', 'Asia/Kashgar'].includes(timeZone);
    
    geoCache = {
      ipCountry: 'UNKNOWN',
      isChinaTimezone,
      isChinaIP: isChinaTimezone, // 只能靠猜的
      isVPN: false
    };
    return geoCache;
  }
};

/**
 * 同步獲取地理位置資訊 (給 render 函數或 hook 內使用)
 * 注意：如果 initGeo 還沒執行完，會回傳基於時區的預設猜測值
 */
export const getGeoInfo = (): GeoInfo => {
  if (geoCache) return geoCache;
  
  if (typeof window !== 'undefined') {
    const cached = sessionStorage.getItem('geo_info');
    if (cached) {
      geoCache = JSON.parse(cached);
      return geoCache!;
    }
  }
  
  // 預設降級猜測
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const isChinaTimezone = ['Asia/Shanghai', 'Asia/Urumqi', 'Asia/Chongqing', 'Asia/Harbin', 'Asia/Kashgar'].includes(timeZone);
  
  return {
    ipCountry: 'UNKNOWN',
    isChinaTimezone,
    isChinaIP: isChinaTimezone,
    isVPN: false
  };
};
