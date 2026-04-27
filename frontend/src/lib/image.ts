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

export type ProxyMode = 'thumb' | 'full' | 'small' | 'raw' | 'sd' | 'hq';

/**
 * 判斷該媒體是否為影片 (作為資料庫 media_type 遺失時的備用判斷)
 */
export const isMediaVideo = (url?: string, type?: string): boolean => {
  if (!url) return false;
  
  // 這裡的 type 通常是指舊版資料結構或組件傳入的 type，如果有明確傳入 video 則信任之
  if (type === 'video') return true;
  
  // 檢查副檔名是否為影片格式
  const hasVideoExtension = url.match(/\.(mp4|webm|mov|m4v|m3u8)(\?.*)?$/i);
  
  // 檢查是否來自 Twitter 影片網域
  const isTwitterVideoDomain = url.includes('video.twimg.com') || url.includes('/videos/');
  
  // 排除雖然在影片網域但實際上是圖片的情況 (如 Twitter 的影片縮圖)
  const isImageExtension = url.match(/\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i);
  
  // 如果是 mp4 結尾，不論網域，一律視為影片
  if (hasVideoExtension) return true;
  
  // Twitter 影片的網址不一定都有 .mp4 副檔名，有時候是一串 hash 或是 m3u8。
  // 只要來自 video.twimg.com，且「不是」圖片結尾，且「不是」tweet_video_thumb (推特用來存 GIF 縮圖的路徑)，就視為影片
  if (isTwitterVideoDomain && !isImageExtension && !url.includes('tweet_video_thumb')) return true;
  
  return false;
};

/**
 * 專為 Apple Music Gallery 設計的圖片處理邏輯
 * 小圖與燈箱大圖一律強制走 img.ztmr.club 進行壓縮，無論海內外
 * 下載原圖 (raw) 則直接回傳 R2 的 Nginx 代理位址，不浪費伺服器效能
 */
export const getAppleMusicImgUrl = (rawUrl: string, mode: ProxyMode = 'thumb'): string => {
  if (!rawUrl) return '';

  // Apple Music 圖片網址可以直接修改解析度參數取得不同尺寸與格式
  // 例如：.../1200x1200bf-60.jpg -> .../600x600bf-60.webp

  if (mode === 'raw' || mode === 'full') {
    // 原始大小 (高畫質)
    return rawUrl;
  }
  
  if (mode === 'small' || mode === 'sd') {
    // 燈箱預覽或中等縮圖，替換為 600x600 WebP
    return rawUrl.replace(/\/\d+x\d+([a-zA-Z0-9-]*)\.(jpg|jpeg|webp|png)$/i, '/600x600$1.webp');
  }

  // thumb, hq 等瀑布流小圖，替換為 300x300 WebP
  return rawUrl.replace(/\/\d+x\d+([a-zA-Z0-9-]*)\.(jpg|jpeg|webp|png)$/i, '/300x300$1.webp');
};
/**
 * 根據需求建立 imgproxy 請求網址
 */
const buildImgproxyUrl = (targetUrl: string, mode: ProxyMode, customFilename = ''): string => {
  const base64Url = safeBase64(targetUrl);
  const paramsArr: string[] = [];

  if (mode === 'raw') {
    paramsArr.push('raw:1', 'return_attachment:1');
    if (customFilename) {
      // 移除常見副檔名，讓 imgproxy 自動推斷並加上副檔名 (避免 .jpg.jpg)
      const safeFilename = customFilename.replace(/\.(jpg|jpeg|png|gif|webp|mp4)$/i, '');
      paramsArr.push(`filename:${safeBase64(safeFilename)}:1`);
    }
  } else if (mode === 'full') {
    paramsArr.push('f:webp');
  } else if (mode === 'small' || mode === 'sd') {
    paramsArr.push('w:602', 'f:webp');
  } else {
    paramsArr.push('w:402', 'f:webp'); // thumb, hq
  }

  // 前端一律不直連 imgproxy，強制走後端 API 代理產生簽名
  // 以徹底關閉 insecure 模式
  const apiUrl = (import.meta.env.VITE_API_URL || '/api/mvs').replace(/\/mvs$/, '');
  const proxyMode = mode === 'thumb' ? 'thumb_general' : mode;
  let url = `${apiUrl}/system/image/proxy?url=${encodeURIComponent(targetUrl)}&mode=${proxyMode}`;
  if (customFilename) {
    url += `&filename=${encodeURIComponent(customFilename)}`;
  }
  return url;
};

/**
 * 處理並格式化推特圖片網址，確保尺寸參數正確
 */
const formatTwitterImageUrl = (url: string, mode: ProxyMode): string => {
  if (url.includes('tweet_video_thumb')) return url;

  const [cleanUrl, queryString] = url.split('?');
  const params = new URLSearchParams(queryString || '');
  
  let format = params.get('format') || cleanUrl.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() || 'jpg';
  
  // 如果是 webp 或 twimg 預設不支援的格式，強制轉為 jpg
  if (format === 'webp') format = 'jpg';
  
  const name = mode === 'full' ? 'large' : (mode === 'raw' ? 'orig' : 'small');
  return `${cleanUrl}?format=${format}&name=${name}`;
};

/**
 * 處理並格式化 YouTube 圖片網址，根據請求模式動態降級畫質
 */
const formatYoutubeImageUrl = (url: string, mode: ProxyMode): string => {
  // YouTube 縮圖有以下幾種畫質級別（由高到低）：
  // maxresdefault / maxres1 / maxres2 / maxres3 (1080p, 只有上傳了高畫質封面的影片才有)
  // sddefault / sd1 / sd2 / sd3 (640x480, 標準畫質)
  // hqdefault / hq1 / hq2 / hq3 (480x360, 高畫質)
  // mqdefault / mq1 / mq2 / mq3 (320x180, 中畫質)
  // default / 1 / 2 / 3 (120x90, 低畫質)
  
  // 對於播放器背景或縮圖，降級到 sd 畫質以節省頻寬
  if (mode === 'sd' || mode === 'small') {
    return url.replace(/maxres(default|\d*)\.jpg/i, 'sd$1.jpg');
  }
  
  // 對於首頁卡片，降級到 hq 畫質
  if (mode === 'hq' || mode === 'thumb') {
    return url.replace(/maxres(default|\d*)\.jpg/i, 'hq$1.jpg');
  }
  
  // 原圖保留 maxres
  return url;
};

/**
 * 決定圖片/影片的最終訪問網域 (直連、Nginx 代理、或 imgproxy)
 */
export const getProxyImgUrl = (rawUrl: string, mode: ProxyMode = 'thumb', customFilename = ''): string => {
  if (!rawUrl || rawUrl.startsWith('data:') || rawUrl.startsWith('/')) return rawUrl;

  const geoInfo = getGeoInfo();
  // 判斷是否為「海外直連用戶」：如果不是中國 IP，或者是翻牆 (VPN) 狀態，皆視為海外直連。
  // 因為翻牆用戶的網路出口在海外，直連 Twitter/YouTube 或 R2 不會被牆，且能節省我方反代伺服器的流量。
  let isOverseasDirect = (!geoInfo.isChinaIP) || geoInfo.isVPN;
  
  // 開發者除錯後門
  if (typeof window !== 'undefined' && window.localStorage.getItem('is_china') === 'false') {
    isOverseasDirect = true;
  }

  try {
    let targetUrl = rawUrl;
    
    // ==== 1. 影片處理 ====
    // 因為 imgproxy 不支援影片處理，所以影片永遠不過 imgproxy，直接走 Nginx 反代或直連
    // 這必須放在最前面，否則 raw 模式會把影片丟給 imgproxy 導致載入失敗！
    if (isMediaVideo(targetUrl)) {
      if (targetUrl.includes('r2.dan.tw')) {
        // R2 的網域本身在 Cloudflare 後面，中國大陸通常也能直連 (或者透過自訂網域綁定 Cloudflare)，
        // 而且我們已經在 R2 設定了 CORS。因此不論海內外，影片都可以直接存取 R2。
        return targetUrl;
      }
      if (targetUrl.includes('video.twimg.com')) {
        return isOverseasDirect ? targetUrl : targetUrl.replace('https://video.twimg.com', 'https://assets.ztmr.club/tv');
      }
      return targetUrl;
    }

    // ==== 2. 圖片下載模式 (Raw) 處理 ====
    // 對於下載模式：
    // - 跨域下載 (Cross-Origin) 時，HTML5 的 <a download> 屬性會被瀏覽器安全機制忽略。
    //   為了讓下載的檔案有正確名稱 (而非推特雜湊或 R2 MD5)，我們必須透過 imgproxy 的 filename 參數，
    //   並由伺服器回傳 Content-Disposition: attachment; filename="xxx" 標頭。
    // - 因此，無論海內外，下載 (raw 模式) 且需要自訂檔名時，一律走 imgproxy 代理。
    if (mode === 'raw') {
      if (targetUrl.includes('pbs.twimg.com')) {
        targetUrl = formatTwitterImageUrl(targetUrl, mode);
      }
      
      // 如果沒有提供自訂檔名，且是海外用戶，才允許直連 (因為沒檔名要求)
      if (!customFilename && isOverseasDirect) return targetUrl;
      
      // 其他情況 (尤其是需要自訂檔名的)，必須透過 imgproxy 代理下載以注入 Content-Disposition
      return buildImgproxyUrl(targetUrl, mode, customFilename);
    }

    // ==== 3. 圖片處理 ====
    const isTwitter = targetUrl.includes('pbs.twimg.com');
    const isYoutube = targetUrl.includes('ytimg.com') || targetUrl.includes('youtube.com');
    const isR2 = targetUrl.includes('r2.dan.tw');

    if (isTwitter) {
      targetUrl = formatTwitterImageUrl(targetUrl, mode);
    }
    
    if (isYoutube) {
      targetUrl = formatYoutubeImageUrl(targetUrl, mode);
    }

    // ---- 3A. 海外/翻牆用戶直連策略 ----
    if (isOverseasDirect) {
      if (isTwitter || isYoutube) return targetUrl;
      // R2 圖片放大 (full) 時，海外用戶直接直連 Cloudflare R2，不經過我方 Nginx 代理以節省流量
      if (isR2 && mode === 'full') return targetUrl;
      // R2 的縮圖 (thumb/small) 仍需走 imgproxy 壓縮，以避免載入 10MB 的 MD5 原圖
      if (isR2) return buildImgproxyUrl(targetUrl, mode, customFilename);
      
      // 其他未知來源 (如果有的話)，預設回傳原網址直連
      return targetUrl;
    }

    // ---- 3B. 中國大陸用戶代理策略 ----
    if (isTwitter) {
      // 巧妙利用推特原生縮圖參數 (?name=small)，並直接走 Nginx 反代，刻意繞過 imgproxy 節省伺服器 CPU
      // 因為這是在前端組件 (Fancybox) 嘗試 original_url 的情況下進來的
      return targetUrl.replace('https://pbs.twimg.com', 'https://assets.ztmr.club/ti');
    }
    
    if (isYoutube) {
      return targetUrl.replace(/https:\/\/(i\d*\.ytimg\.com|img\.youtube\.com)/i, 'https://assets.ztmr.club/yi');
    }
    
    if (isR2) {
      if (mode === 'full') {
        // full 模式 (燈箱大圖)：中國大陸用戶也可以直接連 Cloudflare R2，不需要 Nginx 反代
        // 因為 R2 綁定的自訂網域本身就已經在 Cloudflare CDN 後面，沒有被牆的問題。
        return targetUrl;
      }
      // R2 的縮圖 (thumb/small) 走 imgproxy 壓縮
      return buildImgproxyUrl(targetUrl, mode, customFilename);
    }

    // 預設 Fallback (如果都不是上述網域，預設不走 imgproxy，直接回傳以防萬一)
    return targetUrl;

  } catch (e) {
    return rawUrl;
  }
};