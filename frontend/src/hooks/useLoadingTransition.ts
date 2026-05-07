import { useState, useEffect, useCallback, useRef } from 'react';

interface UseLoadingTransitionParams {
  isLoading: boolean;
  error: string | null;
  mvDataLength: number;
  networkType?: string;
  networkSaveData?: boolean;
  isIosMobileSafari?: boolean;
}

export function useLoadingTransition({
  isLoading,
  error,
  mvDataLength,
  networkType,
  networkSaveData,
  isIosMobileSafari,
}: UseLoadingTransitionParams) {
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const showLoadingScreenRef = useRef(true);
  useEffect(() => { showLoadingScreenRef.current = showLoadingScreen; }, [showLoadingScreen]);
  const [showWarningScreen, setShowWarningScreen] = useState(false);
  const [isContentReady, setIsContentReady] = useState(false);
  const [isContentFadingIn, setIsContentFadingIn] = useState(false);
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
  const [isTransitioningOut, setIsTransitioningOut] = useState(false);
  const [networkAlertAcknowledged, setNetworkAlertAcknowledged] = useState(() => {
    try {
      return sessionStorage.getItem('ztmy_network_alerted') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (error && mvDataLength === 0) {
      setShowLoadingScreen(false);
      setShowWarningScreen(false);
      setIsTransitioningOut(false);
      return;
    }

    if (isLoading) {
      setShowLoadingScreen(true);
      return;
    }

    const needsWarning = !networkAlertAcknowledged && (networkType === 'cellular' || networkSaveData || isIosMobileSafari);

    if (needsWarning) {
      setIsTransitioningOut(true);
      const timer = setTimeout(() => {
        setShowLoadingScreen(false);
        setShowWarningScreen(true);
        setTimeout(() => setIsTransitioningOut(false), 50);
      }, 500);
      return () => clearTimeout(timer);
    } else if (showLoadingScreenRef.current) {
      setIsTransitioningOut(true);
      const timer = setTimeout(() => {
        setShowLoadingScreen(false);
        setIsContentReady(true);
        setTimeout(() => {
          setIsTransitioningOut(false);
          setIsContentFadingIn(true);
          setTimeout(() => setIsAnimationComplete(true), 1000);
        }, 50);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, error, networkAlertAcknowledged, networkType, networkSaveData, isIosMobileSafari, mvDataLength]);

  const handleWarningConfirm = useCallback(() => {
    try {
      sessionStorage.setItem('ztmy_network_alerted', 'true');
    } catch {}

    if (window.umami && typeof window.umami.track === 'function') {
      window.umami.track('Z_Network_Warning_Accepted', {
        is_ios_safari: isIosMobileSafari ? 'true' : 'false',
        network_type: networkType || 'unknown',
        save_data: networkSaveData ? 'true' : 'false'
      });
    }

    setIsTransitioningOut(true);
    setTimeout(() => {
      setNetworkAlertAcknowledged(true);
      setShowWarningScreen(false);
      setIsContentReady(true);
      setTimeout(() => {
        setIsTransitioningOut(false);
        setIsContentFadingIn(true);
        setTimeout(() => setIsAnimationComplete(true), 1000);
      }, 50);
    }, 500);
  }, [isIosMobileSafari, networkType, networkSaveData]);

  return {
    showLoadingScreen,
    showWarningScreen,
    isContentReady,
    isContentFadingIn,
    isAnimationComplete,
    isTransitioningOut,
    networkAlertAcknowledged,
    handleWarningConfirm,
  };
}
