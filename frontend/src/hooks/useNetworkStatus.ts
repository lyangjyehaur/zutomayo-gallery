import { useState, useEffect } from 'react';

interface NetworkStatus {
  online: boolean;
  type?: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  saveData?: boolean;
  isIosMobileSafari?: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => {
    // 兼容部分舊版瀏覽器
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    // 檢查 CSS 媒體查詢 prefers-reduced-data (部分新版 iOS Safari 支援)
    let reducedData = false;
    if (typeof window !== 'undefined' && window.matchMedia) {
      reducedData = window.matchMedia('(prefers-reduced-data: reduce)').matches;
    }

    // 檢查是否為 iOS Mobile Safari (最保守的 fallback)
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIosMobileSafari = isIos && isSafari;

    return {
      online: navigator.onLine,
      type: connection?.type,
      effectiveType: connection?.effectiveType,
      saveData: connection?.saveData || reducedData,
      isIosMobileSafari,
    };
  });

  useEffect(() => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    const updateStatus = () => {
      let reducedData = false;
      if (typeof window !== 'undefined' && window.matchMedia) {
        reducedData = window.matchMedia('(prefers-reduced-data: reduce)').matches;
      }

      setStatus({
        online: navigator.onLine,
        type: connection?.type,
        effectiveType: connection?.effectiveType,
        saveData: connection?.saveData || reducedData,
      });
    };

    // 監聽上下線狀態
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    
    // 監聽網路環境改變 (如從 wifi 切換到 4g)
    if (connection) {
      connection.addEventListener('change', updateStatus);
    }
    
    // 監聽 CSS 媒體查詢的變化
    let mediaQueryList: MediaQueryList | null = null;
    if (typeof window !== 'undefined' && window.matchMedia) {
      mediaQueryList = window.matchMedia('(prefers-reduced-data: reduce)');
      if (mediaQueryList.addEventListener) {
        mediaQueryList.addEventListener('change', updateStatus);
      }
    }

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      if (connection) {
        connection.removeEventListener('change', updateStatus);
      }
      if (mediaQueryList && mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', updateStatus);
      }
    };
  }, []);

  return status;
}