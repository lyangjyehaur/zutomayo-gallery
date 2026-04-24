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

    // 1. 影片處理 (因為 imgproxy 不支援處理影片，所以影片永遠不過 imgproxy)
    const isVideo = targetUrl.match(/\.(mp4|webm|mov|m4v|m3u8)$/i) || targetUrl.includes('video.twimg.com');
    if (isVideo) {
      if (targetUrl.includes('r2.dan.tw')) {
        return targetUrl.replace('https://r2.dan.tw', 'https://assets.ztmr.club/r2');
      }
      if (targetUrl.includes('video.twimg.com')) {
        return isOverseas ? targetUrl : targetUrl.replace('https://video.twimg.com', 'https://assets.ztmr.club/tv');
      }
      return targetUrl;
    }

    // 2. 針對海外用戶的直連優化 (僅限圖片)
    if (isOverseas && mode !== 'raw') {
      // Twitter 圖片直連，但補上正確的尺寸參數
      if (targetUrl.includes('pbs.twimg.com')) {
        const [cleanUrl, queryString] = targetUrl.split('?');
        const params = new URLSearchParams(queryString || '');
        
        let format = params.get('format') || cleanUrl.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() || 'jpg';
        const name = mode === 'full' ? 'large' : 'small';
        return `${cleanUrl}?format=${format}&name=${name}`;
      }
      
      // Youtube 圖片直連
      if (targetUrl.includes('ytimg.com') || targetUrl.includes('youtube.com')) {
        return targetUrl;
      }
      
      // R2 圖片放大 (full) 時，直接透過 Nginx 載入原圖
      // 注意：如果 mode 是 thumb/small，海外用戶依然需要往下走 imgproxy 產生縮圖，否則瀑布流會載入 10MB 的 MD5 原圖
      if (targetUrl.includes('r2.dan.tw') && mode === 'full') {
        return targetUrl.replace('https://r2.dan.tw', 'https://assets.ztmr.club/r2');
      }
    }
    
    // ==== 中國大陸用戶（或需要代理縮圖的圖片）的處理 ====

    // 3. Twitter 圖片與 YouTube 圖片處理
    if (targetUrl.includes('pbs.twimg.com')) {
      const [cleanUrl, queryString] = targetUrl.split('?');
      const params = new URLSearchParams(queryString || '');
      
      let format = params.get('format') || cleanUrl.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() || 'jpg';
      const name = mode === 'raw' ? 'orig' : (mode === 'full' ? 'large' : 'small');
      targetUrl = `${cleanUrl}?format=${format}&name=${name}`;
      
      // 非 raw 模式：直接走 Nginx 代理，利用推特原生的 ?name=small 縮圖，節省 imgproxy 的運算
      if (!isOverseas && mode !== 'raw') {
        return targetUrl.replace('https://pbs.twimg.com', 'https://assets.ztmr.club/ti');
      }
    }

    if (targetUrl.includes('ytimg.com') || targetUrl.includes('youtube.com')) {
      if (!isOverseas && mode !== 'raw') {
        return targetUrl.replace('https://i.ytimg.com', 'https://assets.ztmr.club/yi');
      }
    }

    // 4. R2 圖片處理
    if (targetUrl.includes('r2.dan.tw')) {
      if (mode === 'full') {
        // full 模式直接透過 Nginx 下載，避免 imgproxy 處理超大圖片時耗費 CPU
        return targetUrl.replace('https://r2.dan.tw', 'https://assets.ztmr.club/r2');
      }
      // 如果是 raw 模式：必須走下方的 imgproxy 注入 filename 標頭，讓訪客下載時有正確的檔名 (而非 MD5 Hash)。
      // 如果是 thumb/small 模式：必須走下方的 imgproxy 進行壓縮，避免瀑布流載入原圖。
    }

    // 5. 統一交給 imgproxy 處理 (縮小、轉 WebP、或注入下載檔名)
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
      paramsArr.push('rs:fit:400', 'f:webp'); // thumb
    }
    const imgProxyDomain = import.meta.env.VITE_TWITTER_IMG_PROXY || 'https://img.ztmr.club';
    return `${imgProxyDomain}/${paramsArr.join('/')}/${base64Url}`;
  } catch {
    return rawUrl;
  }
};