export interface GeoInfo {
  ipCountry: string;
  isChinaTimezone: boolean;
  isChinaIP: boolean;
  isVPN: boolean;
  ip?: string;
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
    sessionStorage.removeItem('umami_geo_location_reported');
    sessionStorage.removeItem('umami_geo_raw_reported');
  }
};

/**
 * 獲取 IP 所在的國家代碼
 * 使用 Promise.any 實現競速機制 (Race)，哪個 API 先回應就用哪個
 */
const fetchIpCountry = async (): Promise<{ countryCode: string, ip?: string, rawCountry?: string, rawString?: string, ip2regionRaw?: string, geoipRaw?: string, maxmindCityRaw?: string, maxmindAsnRaw?: string, details?: GeoInfo['details'] }> => {
  const apiUrl = (import.meta.env.VITE_API_URL || '/api/mvs').replace(/\/mvs$/, '/system/geo');

  try {
    // 由於我們已經實作了高效且 100% 準確的本地 ip2region 服務
    // 直接調用我們自己的 API，不再依賴第三方服務
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error('Backend Geo API failed');
    
    const json = await res.json();
    if (json && json.success && json.data && json.data.country) {
      return {
        countryCode: json.data.country === 'LOCAL' ? 'CN' : json.data.country,
        ip: json.data.ip,
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

    const { countryCode, ip, rawCountry, rawString, ip2regionRaw, geoipRaw, maxmindCityRaw, maxmindAsnRaw, details } = await fetchIpCountry();
    const ipCountry = countryCode;
    const isChinaIP = ipCountry === 'CN';
    const isVPN = !isChinaIP && isChinaTimezone;

    geoCache = { ipCountry, isChinaTimezone, isChinaIP, isVPN, ip, rawCountry, rawString, ip2regionRaw, geoipRaw, maxmindCityRaw, maxmindAsnRaw, details };
    
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('geo_info', JSON.stringify(geoCache));
      
      // 將精確的地理與 IP 資訊上報給 Umami (如果有的話)
      if ((window as any).umami && typeof (window as any).umami.track === 'function') {
        const locationReported = sessionStorage.getItem('umami_geo_location_reported') === 'true';
        const payload: any = {
            country: ipCountry,
            raw_country: rawCountry || ipCountry, // 同時上報原始的中文國家名稱
            ip2region_raw: ip2regionRaw || 'unknown', // 獨立上報 ip2region 結果字串
            is_vpn: isVPN ? 'true' : 'false',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language || navigator.languages?.[0] || 'unknown'
          };
        
        if (ip) payload.ip = ip;
        
        if (details) {
          if (details.province) payload.province = details.province;
          if (details.city) payload.city = details.city;
          if (details.isp) payload.isp = details.isp;
        }
        
        // 解析 geoip-lite 的 JSON 字串，並加上 geoip_ 前綴平鋪到 payload 中
        if (geoipRaw) {
          try {
            const geoipObj = JSON.parse(geoipRaw);
            if (geoipObj.country) payload.geoip_country = geoipObj.country;
            if (geoipObj.region) payload.geoip_region = geoipObj.region;
            if (geoipObj.city) payload.geoip_city = geoipObj.city;
            if (geoipObj.timezone) payload.geoip_timezone = geoipObj.timezone;
            if (geoipObj.ll && Array.isArray(geoipObj.ll)) {
              payload.geoip_lat = geoipObj.ll[0];
              payload.geoip_lon = geoipObj.ll[1];
            }
          } catch (e) {
            console.warn('[Geo] Failed to parse geoipRaw for Umami tracking');
          }
        }

        if (maxmindCityRaw) {
          try {
            const mm = JSON.parse(maxmindCityRaw);
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
          } catch (e) {
            console.warn('[Geo] Failed to parse maxmindCityRaw for Umami tracking');
          }
        }

        if (maxmindAsnRaw) {
          try {
            const mmAsn = JSON.parse(maxmindAsnRaw);
            if (mmAsn?.autonomous_system_number) payload.maxmind_asn = mmAsn.autonomous_system_number;
            if (mmAsn?.autonomous_system_organization) payload.maxmind_org = mmAsn.autonomous_system_organization;
          } catch (e) {
            console.warn('[Geo] Failed to parse maxmindAsnRaw for Umami tracking');
          }
        }
        
        if (!locationReported) {
          (window as any).umami.track('Z_Geo_Location_Detected', payload);
          sessionStorage.setItem('umami_geo_location_reported', 'true');
        }
      }

      if (ip && (ip2regionRaw || geoipRaw || maxmindCityRaw || maxmindAsnRaw)) {
        const rawReported = sessionStorage.getItem('umami_geo_raw_reported') === 'true';
        if (rawReported) return geoCache;

        const geoRawApi = (import.meta.env.VITE_API_URL || '/api/mvs').replace(/\/mvs$/, '/system/geo/raw');
        const rawCountryStr = rawCountry || ipCountry;

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

        let geoRawId: string | null = null;
        try {
          const resp = await fetch(geoRawApi, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
            body: JSON.stringify({
              ip,
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
          if (resp.ok) {
            const json = await resp.json();
            geoRawId = json?.data?.id || null;
          }
        } catch {}

        if ((window as any).umami && typeof (window as any).umami.track === 'function') {
          const rawPayload: any = {
            country: ipCountry,
            raw_country: rawCountryStr,
          };
          if (ip) rawPayload.ip = ip;
          if (geoRawId) rawPayload.geo_raw_id = geoRawId;
          if (!geoRawId) {
            if (ip2regionSha) rawPayload.ip2region_hash = ip2regionSha.slice(0, 12);
            if (geoipSha) rawPayload.geoip_hash = geoipSha.slice(0, 12);
            if (maxmindCitySha) rawPayload.maxmind_city_hash = maxmindCitySha.slice(0, 12);
            if (maxmindAsnSha) rawPayload.maxmind_asn_hash = maxmindAsnSha.slice(0, 12);
          }
          (window as any).umami.track('Z_Geo_Raw_Detected', rawPayload);
        }

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
