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

  // 取得目前使用者的地區資訊 (來自快取，避免每張圖片渲染都發送網路請求)
  const geoInfo = getGeoInfo();
  
  // 如果是純海外用戶（IP 為海外），或是翻牆的大陸用戶（IP 為海外但時區是大陸），都視為「可以直連」的海外狀態。
  // 原因：翻牆用戶既然能連上海外 IP，就能直連 Twitter/Youtube，不需要浪費我們代理伺服器的頻寬。
  let isOverseas = !geoInfo.isChinaIP;
  
  // 開發者除錯後門
  if (typeof window !== 'undefined' && window.localStorage.getItem('is_china') === 'false') {
    isOverseas = true;
  }

  try {
    let targetUrl = rawUrl;
    
    // ==== 針對海外用戶的優化處理 ====
    // 注意：如果是 'raw' (下載原圖) 模式，為了避免前端 CORS 問題以及確保能正確注入自定義檔名 (Content-Disposition)，
    // 我們強制所有用戶 (包含海外用戶) 在下載原圖時都走我們的代理伺服器。
    if (isOverseas && mode !== 'raw') {
      // 處理 Twitter 圖片連結 (海外用戶直連官方並加上尺寸參數)
      if (targetUrl.includes('pbs.twimg.com')) {
        const [cleanUrl, queryString] = targetUrl.split('?');
        const params = new URLSearchParams(queryString || '');
        
        // 優先從 URL 參數獲取 format，如果沒有，則嘗試從路徑的副檔名提取，最後預設為 jpg
        let format = params.get('format');
        if (!format) {
          const match = cleanUrl.match(/\.([a-zA-Z0-9]+)$/);
          format = match ? match[1].toLowerCase() : 'jpg';
        }
        
        const name = mode === 'full' ? 'large' : (mode === 'small' ? 'small' : 'thumb');
        
        // 組合出 Twitter 官方支援的格式，例如：https://pbs.twimg.com/media/xxx?format=png&name=large
        return `${cleanUrl}?format=${format}&name=${name}`;
      }
      
      // Youtube 圖片海外直連
      if (targetUrl.includes('ytimg.com') || targetUrl.includes('youtube.com')) {
        return targetUrl;
      }
      
      // 其他圖片如果不需要代理，也可以直接回傳
      // return targetUrl; 
    }
    // ==== 海外用戶優化結束 ====

    // ==== 中國大陸用戶（或需要代理的圖片）的處理 ====
    // 處理 Twitter 圖片連結的 URL 參數重組（給代理伺服器用）
    if (targetUrl.includes('pbs.twimg.com')) {
      const [cleanUrl, queryString] = targetUrl.split('?');
      const params = new URLSearchParams(queryString || '');
      
      // 同樣，先從 URL 參數找，沒有就找副檔名，預設為 jpg
      let format = params.get('format');
      if (!format) {
        const match = cleanUrl.match(/\.([a-zA-Z0-9]+)$/);
        format = match ? match[1].toLowerCase() : 'jpg';
      }
      
      const name = mode === 'raw' ? 'orig' : (mode === 'full' ? 'large' : (mode === 'small' ? 'small' : 'thumb'));
      targetUrl = `${cleanUrl}?format=${format}&name=${name}`;
    }

    const base64Url = safeBase64(targetUrl);
    let params: string[] = [];
    if (mode === 'raw') {
      params.push('raw:1', 'return_attachment:1');
      if (customFilename) params.push(`filename:${safeBase64(customFilename)}:1`);
    } else if (mode === 'full') {
      params.push('f:webp');
    } else if (mode === 'small') {
      // 首頁卡片與預覽使用的 small 模式，也改用 fit:contain 保持真實比例，避免 rs:fill 的裁切
      params.push('rs:fit:600', 'f:webp');
    } else {
      // 瀑布流使用的 thumb 模式，改用 fit:contain 保持真實比例，避免 rs:fill 的裁切
      // rs:fit 會在指定邊界內等比例縮放，不會改變圖片原有的長寬比
      params.push('rs:fit:400', 'f:webp');
    }
    return `https://img.ztmr.club/${params.join('/')}/${base64Url}`;
  } catch {
    return rawUrl;
  }
};