import { useState, useEffect, useCallback, useRef } from 'react';
import { globalDeferredPrompt, pwaEventTarget } from '@/App';

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(globalDeferredPrompt);

  useEffect(() => {
    const handlePwaReady = () => setDeferredPrompt(globalDeferredPrompt);
    pwaEventTarget.addEventListener('pwa-ready', handlePwaReady);
    return () => pwaEventTarget.removeEventListener('pwa-ready', handlePwaReady);
  }, []);

  const [isInstallPromptOpen, setIsInstallPromptOpen] = useState(false);
  const [isRecoverPromptOpen, setIsRecoverPromptOpen] = useState(false);
  const pwaRecoverTapCountRef = useRef(0);
  const pwaRecoverTapTimerRef = useRef<number | null>(null);

  const runPWARecovery = useCallback(async () => {
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } finally {
      const url = new URL(window.location.href);
      url.searchParams.set("__refresh", String(Date.now()));
      window.location.replace(url.toString());
    }
  }, []);

  const triggerPWARecovery = useCallback(() => {
    pwaRecoverTapCountRef.current += 1;
    if (pwaRecoverTapTimerRef.current) window.clearTimeout(pwaRecoverTapTimerRef.current);
    pwaRecoverTapTimerRef.current = window.setTimeout(() => {
      pwaRecoverTapCountRef.current = 0;
      pwaRecoverTapTimerRef.current = null;
    }, 1500);

    if (pwaRecoverTapCountRef.current < 7) return;

    pwaRecoverTapCountRef.current = 0;
    if (pwaRecoverTapTimerRef.current) {
      window.clearTimeout(pwaRecoverTapTimerRef.current);
      pwaRecoverTapTimerRef.current = null;
    }

    setIsRecoverPromptOpen(true);
  }, []);

  return {
    deferredPrompt,
    setDeferredPrompt,
    isInstallPromptOpen,
    setIsInstallPromptOpen,
    isRecoverPromptOpen,
    setIsRecoverPromptOpen,
    triggerPWARecovery,
    runPWARecovery,
  };
}
