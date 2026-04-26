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

  // 1. 下載原圖 (raw) 
  if (mode === 'raw') {
    return rawUrl;
  }

  // 2. 針對需要縮圖與燈箱壓縮的情境 (thumb, small, full)
  // 強制使用 imgproxy 進行壓縮
  let targetUrl = rawUrl;

  const base64Url = safeBase64(targetUrl);
  let paramsArr: string[] = [];

  // 3. 組合參數並回傳 imgproxy 網址
  // 針對 imgproxy，我們確保 paramsArr 正確組合
  if (mode === 'full') {
    // 燈箱大圖，使用者指定 1000px 就足夠了 (使用 1002 破除 Service Worker 惡意快取)
    paramsArr.push('w:1002', 'f:webp');
  } else if (mode === 'small') {
    // 中等縮圖，600px WebP (使用 602 破除 Service Worker 惡意快取)
    paramsArr.push('w:602', 'f:webp');
  } else {
    // 瀑布流小圖，300px WebP (使用 302 破除 Service Worker 惡意快取)
    paramsArr.push('w:302', 'f:webp');
  }

  const imgProxyDomain = (import.meta.env.VITE_TWITTER_IMG_PROXY || 'https://img.ztmr.club').replace(/\/$/, '');
  
  if (!import.meta.env.VITE_IMGPROXY_SALT || !import.meta.env.VITE_IMGPROXY_KEY) {
    const baseUrl = imgProxyDomain.endsWith('/insecure') ? imgProxyDomain : `${imgProxyDomain}/insecure`;
    return `${baseUrl}/${paramsArr.join('/')}/${base64Url}`;
  }

  const apiUrl = (import.meta.env.VITE_API_URL || '/api/mvs').replace(/\/mvs$/, '');
  return `${apiUrl}/system/image/proxy?url=${encodeURIComponent(targetUrl)}&mode=${mode}`;
};
/**
 * 根據需求建立 imgproxy 請求網址
 */
const buildImgproxyUrl = (targetUrl: string, mode: ProxyMode, customFilename: string): string => {
  const base64Url = safeBase64(targetUrl);
  const paramsArr: string[] = [];

  if (mode === 'raw') {
    paramsArr.push('raw:1', 'return_attachment:1');
    if (customFilename) {
      // imgproxy 的 filename 參數會自動根據檔案格式補上副檔名 (.jpg, .png 等)
      // 如果我們自己傳入 .jpg，下載時就會變成 .jpg.jpg
      // 因此這裡必須把檔名尾部的常見副檔名移除，只保留主檔名
      const safeFilename = customFilename.replace(/\.(jpg|jpeg|png|gif|webp|mp4)$/i, '');
      paramsArr.push(`filename:${safeBase64(safeFilename)}:1`);
    }
  } else if (mode === 'full') {
    paramsArr.push('f:webp');
  } else if (mode === 'small') {
    paramsArr.push('w:602', 'f:webp');
  } else {
    paramsArr.push('w:402', 'f:webp'); // thumb
  }

  const imgProxyDomain = (import.meta.env.VITE_TWITTER_IMG_PROXY || 'https://img.ztmr.club').replace(/\/$/, '');

  // 如果環境變數中沒有提供 SALT/KEY，直接回傳 insecure，避免發送多餘的 API 請求
  if (!import.meta.env.VITE_IMGPROXY_SALT || !import.meta.env.VITE_IMGPROXY_KEY) {
    const baseUrl = imgProxyDomain.endsWith('/insecure') ? imgProxyDomain : `${imgProxyDomain}/insecure`;
    return `${baseUrl}/${paramsArr.join('/')}/${base64Url}`;
  }

  // 由於 getProxyImgUrl 必須是同步回傳字串給 React 組件使用，我們無法在這裡進行 async API Call
  // 因此在有設定 SALT/KEY 的環境下，我們將圖片 URL 指向後端的代理路由 `/api/system/image/proxy`
  // 後端收到請求後，會產生簽名並 302 重定向至真正的 imgproxy 網址
  const apiUrl = (import.meta.env.VITE_API_URL || '/api/mvs').replace(/\/mvs$/, '');
  const proxyMode = mode === 'thumb' ? 'thumb_general' : mode;
  const proxyUrl = `${apiUrl}/system/image/proxy?url=${encodeURIComponent(targetUrl)}&mode=${proxyMode}`;
  return customFilename ? `${proxyUrl}&filename=${encodeURIComponent(customFilename)}` : proxyUrl;
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
  
  // YouTube 封面圖片不存在下載原圖的需求，
  // modal (MVDetailsModal) 打開時播放器的背景圖片使用 full 模式，降級為標準畫質 (sd, 640x480) 即可
  if (mode === 'full' || mode === 'small') {
    return url.replace(/maxres(default|1|2|3)\.jpg/, 'sd$1.jpg');
  }
  
  // 若是首頁瀑布流縮圖 (thumb) 或其他情況，降級為高畫質 (hq, 480x360) 已經非常足夠
  // 這樣直連載入時會快很多，且足以應付卡片大小的展示
  return url.replace(/maxres(default|1|2|3)\.jpg/, 'hq$1.jpg');
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

    // ==== 2. 圖片下載模式 (Raw) 必須走 Imgproxy ====
    // 無論海內外，下載模式都必須透過 imgproxy 注入 filename 標頭，
    // 確保使用者下載的檔案有語義化名稱 (如: 勘冴えて悔しいわ_1.jpg)，而非推特亂碼或 R2 MD5。
    if (mode === 'raw') {
      if (targetUrl.includes('pbs.twimg.com')) {
        targetUrl = formatTwitterImageUrl(targetUrl, mode);
      }
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
      return buildImgproxyUrl(targetUrl, mode, customFilename);
    }

    // ---- 3B. 中國大陸用戶代理策略 ----
    if (isTwitter) {
      // 巧妙利用推特原生縮圖參數 (?name=small)，並直接走 Nginx 反代，刻意繞過 imgproxy 節省伺服器 CPU
      // 因為這是在前端組件 (Fancybox) 嘗試 original_url 的情況下進來的
      return targetUrl.replace('https://pbs.twimg.com', 'https://assets.ztmr.club/ti');
    }
    
    if (isYoutube) {
      return targetUrl.replace('https://i.ytimg.com', 'https://assets.ztmr.club/yi');
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

    // 預設 Fallback (如果都不是上述網域，交給 imgproxy 處理)
    return buildImgproxyUrl(targetUrl, mode, customFilename);

  } catch (e) {
    return rawUrl;
  }
};