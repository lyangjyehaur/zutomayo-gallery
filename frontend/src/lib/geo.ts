export interface GeoInfo {
  ipCountry: string;
  isChinaTimezone: boolean;
  isChinaIP: boolean;
  isVPN: boolean;
  rawCountry?: string; // 原始的中文國家名稱
  rawString?: string;  // 完整的原始字串 (主要來源)
  ip2regionRaw?: string; // 獨立回傳 ip2region 解析結果
  geoipRaw?: string;     // 獨立回傳 geoip-lite 解析結果
  maxmindCityRaw?: string;
  maxmindAsnRaw?: string;
  details?: {
    country: string;
    region: string;
    province: string;
    city: string;
    isp: string;
  };
}

let geoCache: GeoInfo | null = null;
let geoInitPromise: Promise<GeoInfo> | null = null;

const getGeoSessionId = (): string => {
  if (typeof window === 'undefined') return '';
  const existing = sessionStorage.getItem('geo_session_id');
  if (existing) return existing;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const id = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  sessionStorage.setItem('geo_session_id', id);
  return id;
};

const sha256Hex = async (input: string): Promise<string> => {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

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
  geoInitPromise = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('geo_info');
    sessionStorage.removeItem('geo_session_id');
    sessionStorage.removeItem('umami_geo_raw_reported');
  }
};

/**
 * 獲取 IP 所在的國家代碼
 * 使用 Promise.any 實現競速機制 (Race)，哪個 API 先回應就用哪個
 */
const fetchIpCountry = async (): Promise<{ countryCode: string, rawCountry?: string, rawString?: string, ip2regionRaw?: string, geoipRaw?: string, maxmindCityRaw?: string, maxmindAsnRaw?: string, details?: GeoInfo['details'] }> => {
  const baseApiUrl = (import.meta.env.VITE_API_URL || '/api/mvs').replace(/\/mvs$/, '/system/geo');

  // 傳遞瀏覽器時區和語言給後端 (用於 VPN 偵測和 Umami 追蹤)
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lang = navigator.language || navigator.languages?.[0] || '';
  const apiUrl = `${baseApiUrl}?tz=${encodeURIComponent(tz)}&lang=${encodeURIComponent(lang)}`;

  try {
    // 由於我們已經實作了高效且 100% 準確的本地 ip2region 服務
    // 直接調用我們自己的 API，不再依賴第三方服務
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error('Backend Geo API failed');
    
    const json = await res.json();
    if (json && json.success && json.data && json.data.country) {
      return {
        countryCode: json.data.country === 'LOCAL' ? 'CN' : json.data.country,
        rawCountry: json.data.rawCountry, // 後端傳來的原始名稱
        rawString: json.data.rawString,   // 後端傳來的完整原始字串
        ip2regionRaw: json.data.ip2regionRaw,
        geoipRaw: json.data.geoipRaw,
        maxmindCityRaw: json.data.maxmindCityRaw,
        maxmindAsnRaw: json.data.maxmindAsnRaw,
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
  if (geoInitPromise) return geoInitPromise;

  geoInitPromise = (async () => {
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

    const { countryCode, rawCountry, rawString, ip2regionRaw, geoipRaw, maxmindCityRaw, maxmindAsnRaw, details } = await fetchIpCountry();
    const ipCountry = countryCode;
    const isChinaIP = ipCountry === 'CN';
    const isVPN = !isChinaIP && isChinaTimezone;

    geoCache = { ipCountry, isChinaTimezone, isChinaIP, isVPN, rawCountry, rawString, ip2regionRaw, geoipRaw, maxmindCityRaw, maxmindAsnRaw, details };
    
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('geo_info', JSON.stringify(geoCache));
      
      // Umami 追蹤已移至後端 (getClientGeo)，前端不再發送 IP 相關事件
      // 後端直接呼叫 Umami API，IP 不經過前端

      // 上報原始 Geo 數據到後端 (不包含 IP，後端從請求頭提取)
      if (ip2regionRaw || geoipRaw || maxmindCityRaw || maxmindAsnRaw) {
        const rawReported = sessionStorage.getItem('umami_geo_raw_reported') === 'true';
        if (rawReported) return geoCache;

        const geoRawApi = (import.meta.env.VITE_API_URL || '/api/mvs').replace(/\/mvs$/, '/system/geo/raw');
        const rawCountryStr = rawCountry || ipCountry;

        // SHA-256 雜湊 (後端也會自行計算，前端仍計算作為備用)
        const [
          ip2regionSha,
          geoipSha,
          maxmindCitySha,
          maxmindAsnSha
        ] = await Promise.all([
          ip2regionRaw ? sha256Hex(ip2regionRaw) : Promise.resolve(''),
          geoipRaw ? sha256Hex(geoipRaw) : Promise.resolve(''),
          maxmindCityRaw ? sha256Hex(maxmindCityRaw) : Promise.resolve(''),
          maxmindAsnRaw ? sha256Hex(maxmindAsnRaw) : Promise.resolve(''),
        ]);

        try {
          const geoSessionId = getGeoSessionId();
          await fetch(geoRawApi, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
            body: JSON.stringify({
              geo_session_id: geoSessionId,
              country: ipCountry,
              raw_country: rawCountryStr,
              ip2region_raw: ip2regionRaw || undefined,
              geoip_raw: geoipRaw || undefined,
              maxmind_city_raw: maxmindCityRaw || undefined,
              maxmind_asn_raw: maxmindAsnRaw || undefined,
              ip2region_sha256: ip2regionSha || undefined,
              geoip_sha256: geoipSha || undefined,
              maxmind_city_sha256: maxmindCitySha || undefined,
              maxmind_asn_sha256: maxmindAsnSha || undefined,
            }),
          });
        } catch {}

        // Z_Geo_Raw_Detected 追蹤已移至後端 (saveGeoRaw)
        sessionStorage.setItem('umami_geo_raw_reported', 'true');
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
    } finally {
      geoInitPromise = null;
    }
  })();

  return geoInitPromise;
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
