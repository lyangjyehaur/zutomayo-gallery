export interface GeoInfo {
  ipCountry: string;
  isChinaTimezone: boolean;
  isChinaIP: boolean;
  isVPN: boolean;
  ip?: string;
  details?: {
    country: string;
    region: string;
    province: string;
    city: string;
    isp: string;
  };
}

let geoCache: GeoInfo | null = null;

const getIsChinaTimezone = () => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const chinaTimezones = [
    'Asia/Shanghai',
    'Asia/Urumqi',
    'Asia/Chongqing',
    'Asia/Harbin',
    'Asia/Kashgar',
  ];
  return chinaTimezones.includes(timeZone);
};

const shouldUseIpLookup = () => {
  if (typeof window === 'undefined') return false;
  
  // 本地開發環境預設不調用 API，除非明確開啟 enable_ip_geo=true
  if (import.meta.env.DEV) {
    return window.localStorage.getItem('enable_ip_geo') === 'true';
  }

  // 線上環境預設開啟 IP 偵測，除非明確設定為 false
  return window.localStorage.getItem('enable_ip_geo') !== 'false';
};

/**
 * 清除目前的地理位置快取 (用於讓用戶主動重新偵測，或處理網路環境切換)
 */
export const clearGeoCache = () => {
  geoCache = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('geo_info');
  }
};

/**
 * 獲取 IP 所在的國家代碼
 * 使用 Promise.any 實現競速機制 (Race)，哪個 API 先回應就用哪個
 */
const fetchIpCountry = async (): Promise<{ countryCode: string, ip?: string, details?: GeoInfo['details'] }> => {
  const apiUrl = (import.meta.env.VITE_API_URL || '/api/mvs').replace(/\/mvs$/, '/system/geo');

  try {
    // 由於我們已經實作了高效且 100% 準確的本地 ip2region 服務
    // 且該服務位於後端，不存在前端跨域、廣告攔截或第三方 API 被牆的問題
    // 因此直接調用我們自己的 API，不再依賴第三方服務
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error('Backend Geo API failed');
    
    const json = await res.json();
    if (json && json.success && json.data && json.data.country) {
      return {
        countryCode: json.data.country === 'LOCAL' ? 'CN' : json.data.country,
        ip: json.data.ip,
        details: json.data.details
      };
    }
    throw new Error('Invalid Backend Geo response');
  } catch (e) {
    throw new Error('IP detection failed');
  }
};

/**
 * 初始化並獲取用戶的地理位置資訊
 * 優先從 sessionStorage 讀取快取，若無則呼叫多個 API 進行競速檢測
 */
export const initGeo = async (forceRefresh = false): Promise<GeoInfo> => {
  if (forceRefresh) clearGeoCache();
  if (geoCache) return geoCache;

  try {
    if (typeof window !== 'undefined') {
      // 手動 Debug 模式 (最高優先級)
      // 可以透過在控制台輸入 localStorage.setItem('mock_geo_mode', 'CN' | 'VPN' | 'GLOBAL') 來模擬
      const mockMode = window.localStorage.getItem('mock_geo_mode');
      if (mockMode) {
        console.log(`[Geo Debug] Using mock mode: ${mockMode}`);
        if (mockMode === 'CN') {
          geoCache = { ipCountry: 'CN', isChinaTimezone: true, isChinaIP: true, isVPN: false };
        } else if (mockMode === 'VPN') {
          geoCache = { ipCountry: 'JP', isChinaTimezone: true, isChinaIP: false, isVPN: true };
        } else if (mockMode === 'GLOBAL') {
          geoCache = { ipCountry: 'US', isChinaTimezone: false, isChinaIP: false, isVPN: false };
        }
        
        if (geoCache) {
          sessionStorage.setItem('geo_info', JSON.stringify(geoCache));
          return geoCache;
        }
      }

      // 檢查 sessionStorage 快取，避免每次重整都發送請求
      const cached = sessionStorage.getItem('geo_info');
      if (cached) {
        geoCache = JSON.parse(cached);
        return geoCache!;
      }
    }

    const isChinaTimezone = getIsChinaTimezone();

    if (shouldUseIpLookup() === false) {
      geoCache = {
        ipCountry: import.meta.env.DEV ? 'LOCAL_DEV' : 'UNKNOWN',
        isChinaTimezone,
        isChinaIP: isChinaTimezone,
        isVPN: false,
      };

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('geo_info', JSON.stringify(geoCache));
      }

      return geoCache;
    }

    const { countryCode, ip, details } = await fetchIpCountry();
    const ipCountry = countryCode;
    const isChinaIP = ipCountry === 'CN';
    const isVPN = !isChinaIP && isChinaTimezone;

    geoCache = { ipCountry, isChinaTimezone, isChinaIP, isVPN, ip, details };
    
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('geo_info', JSON.stringify(geoCache));
      
      // 將精確的地理與 IP 資訊上報給 Umami (如果有的話)
      if ((window as any).umami && typeof (window as any).umami.track === 'function') {
        const payload: any = {
          country: ipCountry,
          isVPN: isVPN ? 'Yes' : 'No',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language || navigator.languages?.[0] || 'unknown'
        };
        
        if (ip) payload.ip = ip;
        
        if (details) {
          if (details.province) payload.province = details.province;
          if (details.city) payload.city = details.city;
          if (details.isp) payload.isp = details.isp;
        }
        
        (window as any).umami.track('Z_Geo_Location_Detected', payload);
      }
    }
    
    return geoCache;
  } catch (e) {
    const isChinaTimezone = getIsChinaTimezone();
    
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
    const mockMode = window.localStorage.getItem('mock_geo_mode');
    if (mockMode) {
      if (mockMode === 'CN') return { ipCountry: 'CN', isChinaTimezone: true, isChinaIP: true, isVPN: false };
      if (mockMode === 'VPN') return { ipCountry: 'JP', isChinaTimezone: true, isChinaIP: false, isVPN: true };
      if (mockMode === 'GLOBAL') return { ipCountry: 'US', isChinaTimezone: false, isChinaIP: false, isVPN: false };
    }

    const cached = sessionStorage.getItem('geo_info');
    if (cached) {
      geoCache = JSON.parse(cached);
      return geoCache!;
    }
  }
  
  const isChinaTimezone = getIsChinaTimezone();
  
  return {
    ipCountry: import.meta.env.DEV ? 'LOCAL_DEV' : 'UNKNOWN',
    isChinaTimezone,
    isChinaIP: isChinaTimezone,
    isVPN: false
  };
};
