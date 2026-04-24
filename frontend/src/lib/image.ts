/**
 * URL 安全的 Base64 編碼，支援 Unicode (如日文檔名)
 */
export const safeBase64 = (str: string): string => {
  try {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
};

import { getGeoInfo } from './geo';

export type ProxyMode = 'thumb' | 'full' | 'small' | 'raw';

/**
 * 圖片代理工具邏輯
 * @param rawUrl 原始圖片連結
 * @param mode 模式：thumb (200px), full (Large WebP), small (400px), raw (下載)
 * @param customFilename 下載時的自定義檔名
 */
export const getProxyImgUrl = (rawUrl: string, mode: ProxyMode = 'thumb', customFilename = ''): string => {
  if (!rawUrl || rawUrl.startsWith('data:')) return rawUrl;

  const geoInfo = getGeoInfo();
  let isOverseas = !geoInfo.isChinaIP;
  
  // 開發者除錯後門
  if (typeof window !== 'undefined' && window.localStorage.getItem('is_china') === 'false') {
    isOverseas = true;
  }

  try {
    let targetUrl = rawUrl;
    
    // 如果是相對路徑的本地資源，直接回傳，不需要過代理
    if (targetUrl.startsWith('/')) {
      return targetUrl;
    }

    // ==== 針對海外用戶的直連優化 ====
    // 注意：如果是 'raw' (下載原圖) 模式，為了避免前端 CORS 問題以及確保能正確注入自定義檔名，
    // 我們強制所有用戶 (包含海外用戶) 在下載原圖時都走我們的代理伺服器。
    if (isOverseas && mode !== 'raw') {
      // 如果已經是 R2 連結，直接直連
      if (targetUrl.includes('r2.dan.tw')) return targetUrl;
      
      // Twitter 圖片直連，但補上正確的尺寸參數
      if (targetUrl.includes('pbs.twimg.com')) {
        const [cleanUrl, queryString] = targetUrl.split('?');
        const params = new URLSearchParams(queryString || '');
        
        let format = params.get('format');
        if (!format) {
          const match = cleanUrl.match(/\.([a-zA-Z0-9]+)$/);
          format = match ? match[1].toLowerCase() : 'jpg';
        }
        
        const name = mode === 'full' ? 'large' : 'small';
        return `${cleanUrl}?format=${format}&name=${name}`;
      }
      
      // Youtube 與 Twitter 影片直連
      if (targetUrl.includes('ytimg.com') || targetUrl.includes('youtube.com') || targetUrl.includes('video.twimg.com')) {
        return targetUrl;
      }
    }
    
    // ==== 中國大陸用戶（或需要代理的圖片）的處理 ====

    // 處理 R2 圖片/影片代理
    if (targetUrl.includes('r2.dan.tw')) {
      // 即使是 raw 模式，R2 檔案也支援直接下載與 CORS，不應該過 imgproxy (它會壞掉，特別是影片)
      return targetUrl.replace('https://r2.dan.tw', 'https://assets.ztmr.club/r2');
    }

    // 處理 Twitter 影片連結 (video.twimg.com)
    if (targetUrl.includes('video.twimg.com')) {
      return targetUrl.replace('https://video.twimg.com', 'https://assets.ztmr.club/tv');
    }

    // 處理 Twitter 圖片連結
    if (targetUrl.includes('pbs.twimg.com')) {
      const [cleanUrl, queryString] = targetUrl.split('?');
      const params = new URLSearchParams(queryString || '');
      
      let format = params.get('format');
      if (!format) {
        const match = cleanUrl.match(/\.([a-zA-Z0-9]+)$/);
        format = match ? match[1].toLowerCase() : 'jpg';
      }
      
      const name = mode === 'raw' ? 'orig' : (mode === 'full' ? 'large' : 'small');
      targetUrl = `${cleanUrl}?format=${format}&name=${name}`;
      
      // 非 raw 模式走 assets 代理，raw 模式交給下方的 imgproxy 處理下載與自訂檔名
      if (mode !== 'raw') {
        return targetUrl.replace('https://pbs.twimg.com', 'https://assets.ztmr.club/ti');
      }
    }

    // 處理 YouTube 圖片連結
    if (targetUrl.includes('ytimg.com') || targetUrl.includes('youtube.com')) {
      if (mode !== 'raw') {
        return targetUrl.replace('https://i.ytimg.com', 'https://assets.ztmr.club/yi');
      }
    }

    // 其他圖片，預設使用 img.ztmr.club 代理
    const base64Url = safeBase64(targetUrl);
    let paramsArr: string[] = [];
    if (mode === 'raw') {
      paramsArr.push('raw:1', 'return_attachment:1');
      if (customFilename) paramsArr.push(`filename:${safeBase64(customFilename)}:1`);
    } else if (mode === 'full') {
      paramsArr.push('f:webp');
    } else if (mode === 'small') {
      paramsArr.push('rs:fit:600', 'f:webp');
    } else {
      paramsArr.push('rs:fit:400', 'f:webp');
    }
    const imgProxyDomain = import.meta.env.VITE_TWITTER_IMG_PROXY || 'https://img.ztmr.club';
    return `${imgProxyDomain}/${paramsArr.join('/')}/${base64Url}`;
  } catch {
    return rawUrl;
  }
};