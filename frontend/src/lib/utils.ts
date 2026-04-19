import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getProxyImgUrl(url: string, mode: 'thumb' | 'raw' | 'full' = 'raw', filename?: string) {
  if (!url) return '';
  // 若包含 twimg，表示為 Twitter 圖片/影片
  if (url.includes('twimg.com')) {
    const isVideo = url.includes('video.twimg.com') || url.match(/\.(mp4|webm)$/i);
    const isGif = url.match(/\.gif$/i) || url.includes('tweet_video_thumb'); // 簡單判斷是否為 GIF
    // 若為影片，改用影片反代
    if (isVideo) {
      const videoProxyDomain = import.meta.env.VITE_TWITTER_VIDEO_PROXY || 'https://v-proxy.ztmr.club';
      return url.replace('https://video.twimg.com', videoProxyDomain);
    }
    
    // 檢查是否已設定 Twitter 圖片反代 (可透過 vite env 或全域配置設定)
    const proxyBase = import.meta.env.VITE_TWITTER_PROXY || 'https://pbs.twimg.com';
    const baseUrl = url.replace('https://pbs.twimg.com', proxyBase);
    
    // GIF 不用改變 format 參數
    if (isGif) {
      if (mode === 'thumb') return baseUrl.replace(/name=[^&]+/, 'name=small');
      if (mode === 'full') return baseUrl.replace(/name=[^&]+/, 'name=orig');
      return baseUrl;
    }
    
    if (mode === 'thumb') {
      return baseUrl.includes('?') 
        ? baseUrl.replace(/name=[^&]+/, 'name=small')
        : `${baseUrl}?format=jpg&name=small`;
    }
    if (mode === 'full') {
      return baseUrl.includes('?')
        ? baseUrl.replace(/name=[^&]+/, 'name=orig')
        : `${baseUrl}?format=jpg&name=orig`;
    }
    return baseUrl;
  }
  return url;
}
