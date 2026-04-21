export interface GeoInfo {
  ipCountry: string;
  isChinaTimezone: boolean;
  isChinaIP: boolean;
  isVPN: boolean;
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
  return window.localStorage.getItem('enable_ip_geo') === 'true';
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
const fetchIpCountry = async (): Promise<string> => {
  // 備用 API 列表 (皆為免費、支援 HTTPS、無 CORS 限制、回傳格式簡單的服務)
  const controllers = [new AbortController(), new AbortController(), new AbortController()];
  
  const fetchers = [
    // 1. Cloudflare Trace API (原本的)
    fetch('https://1.1.1.1/cdn-cgi/trace', { signal: controllers[0].signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('CF API failed');
        const text = await res.text();
        const match = text.match(/loc=([A-Z]+)/);
        if (match && match[1]) return match[1];
        throw new Error('Invalid CF response');
      }),
      
    // 2. IP API (備用) - 回傳純文字國家代碼 (例如 "CN", "TW", "US")
    fetch('https://ipapi.co/country_code', { signal: controllers[1].signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('IP API failed');
        const text = await res.text();
        const code = text.trim();
        if (code.length === 2) return code;
        throw new Error('Invalid IP API response');
      }),

    // 3. 第三備用：ip.country.is
    // 極度精簡的開源專案，回傳 {"ip":"...","country":"TW"}
    fetch('https://api.country.is', { signal: controllers[2].signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('country.is failed');
        const data = await res.json();
        if (data && data.country) return data.country;
        throw new Error('Invalid country.is response');
      })
  ];

  try {
    // 競速：誰先成功回傳國家代碼，就用誰的
    const countryCode = await Promise.any(fetchers);
    
    // 成功拿到一個後，中斷其他還在跑的請求，節省頻寬與資源
    controllers.forEach(c => c.abort());
    
    return countryCode;
  } catch (e) {
    throw new Error('All IP detection APIs failed');
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
    // 檢查 sessionStorage 快取，避免每次重整都發送請求
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('geo_info');
      if (cached) {
        geoCache = JSON.parse(cached);
        return geoCache!;
      }
    }

    const isChinaTimezone = getIsChinaTimezone();

    if (shouldUseIpLookup() === false) {
      geoCache = {
        ipCountry: 'UNKNOWN',
        isChinaTimezone,
        isChinaIP: isChinaTimezone,
        isVPN: false,
      };

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('geo_info', JSON.stringify(geoCache));
      }

      return geoCache;
    }

    const ipCountry = await fetchIpCountry();
    const isChinaIP = ipCountry === 'CN';
    const isVPN = !isChinaIP && isChinaTimezone;

    geoCache = { ipCountry, isChinaTimezone, isChinaIP, isVPN };
    
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('geo_info', JSON.stringify(geoCache));
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
    const cached = sessionStorage.getItem('geo_info');
    if (cached) {
      geoCache = JSON.parse(cached);
      return geoCache!;
    }
  }
  
  const isChinaTimezone = getIsChinaTimezone();
  
  return {
    ipCountry: 'UNKNOWN',
    isChinaTimezone,
    isChinaIP: isChinaTimezone,
    isVPN: false
  };
};
