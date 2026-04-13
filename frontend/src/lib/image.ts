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

export type ProxyMode = 'thumb' | 'full' | 'small' | 'raw';

/**
 * 圖片代理工具邏輯
 * @param rawUrl 原始圖片連結
 * @param mode 模式：thumb (200px), full (Large WebP), small (400px), raw (下載)
 * @param customFilename 下載時的自定義檔名
 */
export const getProxyImgUrl = (rawUrl: string, mode: ProxyMode = 'thumb', customFilename = ''): string => {
  if (!rawUrl || rawUrl.startsWith('data:')) return rawUrl;

  try {
    let targetUrl = rawUrl;
    // 處理 Twitter 圖片連結
    if (targetUrl.includes('pbs.twimg.com')) {
      const [cleanUrl, queryString] = targetUrl.split('?');
      const params = new URLSearchParams(queryString || '');
      const format = params.get('format') || 'jpg';
      const name = mode === 'raw' ? 'orig' : (mode === 'full' ? 'large' : 'small');
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
      params.push('rs:fill:400', 'f:webp');
    } else {
      params.push('rs:fill:200', 'f:webp');
    }
    return `https://img.ztmr.club/${params.join('/')}/${base64Url}`;
  } catch {
    return rawUrl;
  }
};