import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface NetworkStatus {
  online: boolean;
  type?: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  saveData?: boolean;
  isIosMobileSafari?: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const { t } = useTranslation();
  const prevTypeRef = useRef<string | undefined>(undefined);

  const [status, setStatus] = useState<NetworkStatus>(() => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    let reducedData = false;
    if (typeof window !== 'undefined' && window.matchMedia) {
      reducedData = window.matchMedia('(prefers-reduced-data: reduce)').matches;
    }

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIosMobileSafari = isIos && isSafari;

    const initialType = connection?.type;
    prevTypeRef.current = initialType;

    return {
      online: navigator.onLine,
      type: initialType,
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

      const newType = connection?.type;
      const prevType = prevTypeRef.current;

      if (newType === 'cellular' && prevType !== 'cellular') {
        let alreadyAccepted = false;
        try {
          alreadyAccepted = localStorage.getItem('ztmy_network_alerted') === 'true';
        } catch {}
        if (!alreadyAccepted) {
          toast.warning(t('app.cellular_network_switched', '已切換到行動網路，請注意流量消耗'), {
            duration: Infinity,
            cancel: {
              label: t('app.cellular_network_switched_acknowledge', '我知道了'),
              onClick: () => {},
            },
          });
        }
      }

      prevTypeRef.current = newType;

      setStatus({
        online: navigator.onLine,
        type: newType,
        effectiveType: connection?.effectiveType,
        saveData: connection?.saveData || reducedData,
      });
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    if (connection) {
      connection.addEventListener('change', updateStatus);
    }

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
  }, [t]);

  return status;
}
