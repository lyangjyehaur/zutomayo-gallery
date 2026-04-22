import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import ImageCard from '@/components/ui/image-card';
import { MVItem } from '@/lib/types';
import { getProxyImgUrl } from '@/lib/image';
import { useLazyImage } from '@/hooks/useLazyImage';

import { Switch } from '@/components/ui/switch';

function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(500); // 預設大於臨界點，避免初次渲染閃爍

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setWidth(entries[0].contentRect.width);
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

interface MVCardProps {
  mv: MVItem;
  isFav: boolean;
  onToggleFav: () => void;
  onClick: () => void;
}

import { useTranslation } from 'react-i18next';

const getRandomInt = (min: number, max: number) => {
  const a = Math.ceil(min);
  const b = Math.floor(max);
  return Math.floor(Math.random() * (b - a + 1)) + a;
};

const sample = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export const CoverCarousel = memo(function CoverCarousel({ coverImages, title, isPaused, forceLoad = false, hideCrt = false, initialDelay }: { coverImages: string[]; title: string; isPaused?: boolean; forceLoad?: boolean; hideCrt?: boolean; initialDelay?: number }) {
  const { t } = useTranslation();
  const urls = useMemo(() => {
    const normalized = (coverImages || []).map((u) => u?.trim()).filter(Boolean) as string[];
    return normalized;
  }, [coverImages]);

  const proxied = useMemo(() => urls.map((u) => getProxyImgUrl(u, 'small')), [urls]);
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const { elementRef, shouldLoad: lazyShouldLoad } = useLazyImage({ rootMargin: '600px', threshold: 0.01, triggerOnce: false });
  const shouldLoad = forceLoad || lazyShouldLoad;
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const isFirstRun = useRef(true);
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const [fadeState, setFadeState] = useState<'idle' | 'pre' | 'active'>('idle');
  const [transitionMode, setTransitionMode] = useState<'fade' | 'scan-wipe' | 'block-glitch' | 'vhs-ff' | 'pixelate' | null>(null);
  const [fadeMs, setFadeMs] = useState(420);
  const [glitch, setGlitch] = useState<{ active: boolean; mode: 'rgb' | 'noise' | 'scan' | 'jitter' | 'invert'; drop: boolean }>({
    active: false,
    mode: 'rgb',
    drop: false,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const glitchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const aliveRef = useRef(true);
  const [isLoaded, setIsLoaded] = useState(false);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    if (glitchTimerRef.current) clearTimeout(glitchTimerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    timerRef.current = null;
    phaseTimerRef.current = null;
    glitchTimerRef.current = null;
    rafRef.current = null;
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      clearTimers();
    };
  }, [clearTimers]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    if (!shouldLoad) {
      clearTimers();
      setNextIndex(null);
      setFadeState('idle');
      setGlitch((g) => (g.active ? { ...g, active: false } : g));
      return;
    }
  }, [shouldLoad, clearTimers]);

  const scheduleNext = useCallback(() => {
    if (!aliveRef.current) return;
    if (!shouldLoad) return;
    if (prefersReducedMotion) return;
    if (isPaused) return;

    clearTimers();
    // 1. 決定下一次切換的時間間隔
    const delay = (isFirstRun.current && initialDelay !== undefined)
      ? initialDelay
      : getRandomInt(5000, 10000);
      
    isFirstRun.current = false;

    timerRef.current = setTimeout(() => {
      if (!aliveRef.current || !shouldLoad) return;

      const current = currentIndexRef.current;
      const available = proxied.map((_, i) => i).filter((i) => i !== current);
      const next = available.length > 0 ? sample(available) : current;

      // 2. 隨機決定圖片過場方式與故障類型
      const transition = available.length > 0 
        ? sample(['cut', 'fade', 'scan-wipe', 'block-glitch', 'vhs-ff', 'pixelate'] as const)
        : 'cut';
      const mode = sample(['rgb', 'noise', 'scan', 'jitter', 'invert'] as const);
      // 故障特效持續時間 (300ms 到 800ms)
      const glitchMs = getRandomInt(300, 800);

      // 3. 隨機決定是否觸發「訊號中斷」 (40% 機率)
      const doDrop = Math.random() > 0.6;

      // 開啟特效狀態，這會讓 JSX 中的 class 生效
      setGlitch({ active: true, mode, drop: doDrop });
      glitchTimerRef.current = setTimeout(() => {
        if (!aliveRef.current) return;
        // 時間到後關閉特效
        setGlitch((g) => ({ ...g, active: false, drop: false }));
      }, Math.max(glitchMs, 500));

      if (transition !== 'cut') {
        // 動畫時間長短設定
        let ms = 500;
        if (transition === 'scan-wipe') ms = getRandomInt(800, 1200);
        else if (transition === 'fade') ms = getRandomInt(240, 760);
        else if (transition === 'block-glitch') ms = getRandomInt(600, 900);
        else if (transition === 'vhs-ff') ms = getRandomInt(400, 700);
        else if (transition === 'pixelate') ms = getRandomInt(500, 800);

        setFadeMs(ms);
        setNextIndex(next);
        setTransitionMode(transition);
        setFadeState('pre');
        rafRef.current = requestAnimationFrame(() => {
          if (!aliveRef.current) return;
          setFadeState('active');
        });
        phaseTimerRef.current = setTimeout(() => {
          if (!aliveRef.current) return;
          setCurrentIndex(next);
          setNextIndex(null);
          setFadeState('idle');
          setTransitionMode(null);
          scheduleNext();
        }, ms);
      } else {
        phaseTimerRef.current = setTimeout(() => {
          if (!aliveRef.current) return;
          setCurrentIndex(next);
          scheduleNext();
        }, Math.max(80, Math.floor(glitchMs * 0.55)));
      }
    }, delay);
  }, [clearTimers, prefersReducedMotion, proxied, shouldLoad, isPaused, initialDelay]);

  useEffect(() => {
    if (!shouldLoad) return;
    if (isPaused) {
      clearTimers();
      return;
    }
    scheduleNext();
    return () => {
      clearTimers();
    };
  }, [shouldLoad, scheduleNext, clearTimers, isPaused]);

  const currentSrc = proxied[currentIndex] || '';
  const nextSrc = nextIndex !== null ? proxied[nextIndex] : null;

  const isFading = fadeState !== 'idle' && nextSrc;
  const isScanWipe = transitionMode === 'scan-wipe';
  // 4. 隨機化 Rolling Slice 的啟動延遲時間，避免所有卡片同時出現橫線錯位 (-0 到 -6秒)
  const sliceDelay = useMemo(() => `${(Math.random() * -6).toFixed(2)}s`, []);

  // 避免模糊底圖頻繁切換時觸發瀏覽器的 repaint
  const blurBgStyle = useMemo(() => {
    return currentSrc ? { backgroundImage: `url(${currentSrc})` } : {};
  }, [currentSrc]);

  return (
    // `.crt-lines` 套用常駐掃描線與暗角 (如果有 hideCrt 則不套用)
    <div ref={elementRef} className={`absolute inset-0 w-full h-full bg-black ${!hideCrt ? 'crt-lines' : ''}`} style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 300px' }}>
      {/* 基礎模糊底層（提供柔和過渡，當沒有圖片時顯示黑色背景） */}
      <div
        className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-30 transition-all duration-1000 bg-black"
        style={blurBgStyle}
      />

      {!isLoaded && currentSrc && (
        <div className="absolute inset-0 animate-pulse bg-main/10 flex flex-col items-center justify-center gap-2 z-0 transition-opacity duration-700 pointer-events-none" style={{ opacity: isLoaded ? 0 : 1, willChange: 'opacity' }}>
          <div className="size-5 border-2 border-black/10 border-t-black animate-spin rounded-full" />
          <span className="text-[8px] font-black uppercase tracking-tighter flex flex-col items-center leading-tight">
            <span className="opacity-40 tracking-normal">{t("app.syncing_visual", "同步視覺中...")}</span>
            <span className="font-mono opacity-20 normal-case">Syncing_Visual...</span>
          </span>
        </div>
      )}

      {/* 動態追加 glitch 與 signal-drop 類別 */}
      <div className={`absolute inset-0 ${glitch.active && glitch.mode === 'jitter' ? 'ztmy-glitch-jitter' : ''} ${glitch.active && glitch.mode === 'invert' ? 'ztmy-invert-flash' : ''} ${glitch.active && glitch.drop ? 'ztmy-signal-drop' : ''}`} style={{ willChange: glitch.active ? 'transform, filter' : 'auto' }}>
        {/* 底層目前圖片 */}
        {currentSrc && (
          <img
            src={currentSrc}
            alt={title}
            className={`absolute inset-0 w-full h-full object-cover z-10 ${
              transitionMode === 'block-glitch' && fadeState !== 'idle' ? 'ztmy-block-glitch-out' : ''
            } ${
              transitionMode === 'vhs-ff' && fadeState !== 'idle' ? 'ztmy-vhs-ff-out' : ''
            } ${
              transitionMode === 'pixelate' && fadeState !== 'idle' ? 'ztmy-pixelate-out' : ''
            }`}
            style={{
              ...(transitionMode === 'fade'
                ? { opacity: fadeState === 'active' ? 0 : 1, transition: `opacity ${fadeMs}ms linear` }
                : transitionMode === 'scan-wipe'
                ? { opacity: 1 }
                : {
                    animationDuration: `${fadeMs}ms`,
                  }),
              ...(transitionMode !== 'fade' && {
                opacity: isLoaded ? 1 : 0,
                transition: isLoaded ? 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
              }),
              willChange: 'opacity, filter'
            }}
            onLoad={() => setIsLoaded(true)}
            loading={forceLoad ? "eager" : "lazy"}
            decoding="async"
          />
        )}

            {/* 頂層下一張圖片 */}
        {nextSrc && (
          <img
            src={nextSrc}
            alt={title}
            className={`absolute inset-0 w-full h-full object-cover z-20 ${
              transitionMode === 'block-glitch' && fadeState !== 'idle' ? 'ztmy-block-glitch-in' : ''
            } ${
              transitionMode === 'vhs-ff' && fadeState !== 'idle' ? 'ztmy-vhs-ff-in' : ''
            } ${
              transitionMode === 'pixelate' && fadeState !== 'idle' ? 'ztmy-pixelate-in' : ''
            }`}
            style={{
              ...(transitionMode === 'scan-wipe'
                ? {
                    clipPath: fadeState === 'active' ? 'inset(0 0 0 0)' : 'inset(0 0 100% 0)',
                    transition: `clip-path ${fadeMs}ms linear`,
                    filter: fadeState === 'active' ? 'brightness(1)' : 'brightness(1.5) contrast(1.2)',
                  }
                : transitionMode === 'fade'
                ? {
                    opacity: fadeState === 'active' ? 1 : 0,
                    transition: `opacity ${fadeMs}ms linear`,
                  }
                : {
                    // 對於透過 class 控制的動畫，確保它可見並把 duration 傳入
                    opacity: fadeState === 'active' ? 1 : 0,
                    animationDuration: `${fadeMs}ms`,
                  }),
              willChange: transitionMode === 'scan-wipe' ? 'clip-path, filter' : 'opacity'
            }}
            loading={forceLoad ? "eager" : "lazy"}
            decoding="async"
          />
        )}

        {/* 掃描擦除專用：新舊圖交界處的高亮綠色掃描帶 */}
        {fadeState !== 'idle' && isScanWipe && (
          <div
            className="absolute left-0 right-0 h-2 bg-green-400/80 mix-blend-screen shadow-[0_0_15px_5px_rgba(74,222,128,0.6)] z-30 pointer-events-none"
            style={{
              top: fadeState === 'active' ? '100%' : '0%',
              transition: `top ${fadeMs}ms linear`,
              transform: 'translateY(-50%)',
              willChange: 'top'
            }}
          />
        )}

        {/* RGB 色彩分離故障 (重疊兩張偏移的圖片) */}
        {glitch.active && glitch.mode === 'rgb' && (
          <>
            <div
              className="glitch-layer glitch-red absolute inset-0 bg-cover bg-center opacity-60 pointer-events-none"
              style={{ backgroundImage: `url(${currentSrc})`, display: 'block', willChange: 'transform' }}
            />
            <div
              className="glitch-layer glitch-blue absolute inset-0 bg-cover bg-center opacity-60 pointer-events-none"
              style={{ backgroundImage: `url(${currentSrc})`, display: 'block', willChange: 'transform' }}
            />
          </>
        )}

        {/* 閃爍噪點與掃描帶 */}
        {glitch.active && glitch.mode === 'noise' && <div className="absolute inset-0 z-30 ztmy-noise-pop" />}
        {glitch.active && glitch.mode === 'scan' && <div className="absolute inset-0 z-30 ztmy-scanline-pop" />}

        {/* 5. 常駐偶發效果：水平錯位橫紋 (Rolling Slice) - 只有在視野內才渲染以節省效能 */}
        {shouldLoad && !isPaused && currentSrc && (
          <img
            src={currentSrc}
            alt="切片效果 (slice)"
            className="absolute inset-0 w-full h-full object-cover z-20 ztmy-rolling-slice"
            style={{ animationDelay: sliceDelay, willChange: 'transform, clip-path' }}
            loading="lazy"
            decoding="async"
          />
        )}
      </div>
    </div>
  );
});

export const MVCard = memo(function MVCard({ mv, isFav, onToggleFav, onClick, isPaused }: MVCardProps & { isPaused?: boolean }) {
  const { t } = useTranslation();
  
  // 處理藝術家名稱，過濾掉 "未知"、"Unknown" 等字串，若全為空則使用 t('app.unknown_artist')
  const artistName = (Array.isArray(mv.artist) ? mv.artist : [mv.artist])
    .map(a => a?.trim())
    .filter(Boolean)
    .filter(a => a !== '未知' && a !== 'Unknown' && a !== 'unknown')
    .join(', ') || t('app.unknown_artist', '未知 (Unknown)');
    
  const fallbackThumbUrl = mv.coverImages?.[0] ? getProxyImgUrl(mv.coverImages[0], 'thumb') : '';
  const [containerRef, containerWidth] = useContainerWidth();
  
  const isCompact = containerWidth < 280;
  const isVeryCompact = containerWidth < 320;

  return (
    <div
      ref={containerRef}
      className="relative group isolate cursor-pointer transition-all hover:translate-x-[4px] hover:translate-y-[4px] mv-card shadow-[4px_4px_0px_0px_#000] hover:shadow-none rounded-base"
      data-umami-event="Z_MV_Card_Click"
      data-umami-event-title={mv.title}
      data-umami-event-id={mv.id}
      onClick={onClick}
    >
      <ImageCard
        imageUrl={fallbackThumbUrl}
        caption={mv.title}
        isPaused={isPaused}
        lang="ja"
        className="border-2 bg-card text-foreground transition-all"
        media={
          <CoverCarousel coverImages={mv.coverImages ?? []} title={mv.title} isPaused={isPaused} />
        }
      >
        <div className={`flex flex-col ${!isVeryCompact ? 'gap-3 px-4 py-3 text-xs' : 'gap-2 px-3 py-2 text-[10px]'} bg-main text-main-foreground uppercase transition-all duration-300`}>
          <div className={`flex ${!isCompact ? 'flex-row items-end justify-between gap-4' : 'flex-col gap-3'}`}>
            
            {/* 上排左側：發行 + 製作 (在 compact 模式下並排，非 compact 模式下也是並排但各自獨立) */}
            <div className={`flex justify-between items-end ${!isCompact ? 'gap-6 min-w-0 flex-1' : 'gap-3 w-full'}`}>
              {/* 發行 */}
              <div className="min-w-0 flex-1">
                <div className={`mb-1 font-black opacity-70 flex items-baseline ${!isVeryCompact ? 'gap-1.5' : 'gap-1'}`}>
                  <span className={`tracking-normal ${!isVeryCompact ? 'tracking-[0.2em]' : 'tracking-[0.1em]'}`}>{t('app.release', '發行')}</span>
                  <span className="text-[8px] font-mono opacity-60 normal-case tracking-normal">Release</span>
                </div>
                <p className={`truncate text-center border-2 border-border bg-main text-main-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] h-[24px] flex items-center justify-center ${!isVeryCompact ? 'px-2' : 'px-1.5'}`}>
                  {mv.date}
                </p>
              </div>
              
              {/* 製作 */}
              <div className={`min-w-0 flex-1 ${!isCompact ? 'text-left' : 'text-right'}`}>
                <div className={`mb-1 font-black opacity-70 flex items-baseline ${!isCompact ? 'justify-start' : 'justify-end'} ${!isVeryCompact ? 'gap-1.5' : 'gap-1'}`}>
                  {!isCompact ? (
                    <>
                      <span className={`tracking-normal ${!isVeryCompact ? 'tracking-[0.2em]' : 'tracking-[0.1em]'}`}>{t('app.creator', '製作')}</span>
                      <span className="text-[8px] font-mono opacity-60 normal-case tracking-normal">Artist</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[8px] font-mono opacity-60 normal-case tracking-normal">Artist</span>
                      <span className={`tracking-normal ${!isVeryCompact ? 'tracking-[0.2em]' : 'tracking-[0.1em]'}`}>{t('app.creator', '製作')}</span>
                    </>
                  )}
                </div>
                <p className={`truncate text-center border-2 border-border bg-main text-main-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] h-[24px] flex items-center justify-center ${!isVeryCompact ? 'px-2' : 'px-1.5'}`} lang="ja">
                  {artistName}
                </p>
              </div>
            </div>
            
            {/* 上排右側：收藏 (非 compact 模式) */}
            {!isCompact && (
              <div className="min-w-0 text-left shrink-0 ml-2">
                <div className={`mb-1 font-black opacity-70 flex items-baseline justify-start ${!isVeryCompact ? 'gap-1.5' : 'gap-1'}`}>
                  <span className={`tracking-normal ${!isVeryCompact ? 'tracking-[0.2em]' : 'tracking-[0.1em]'}`}>{t('app.favorite', '收藏')}</span>
                  <span className="text-[8px] font-mono opacity-60 normal-case tracking-normal">Favorite</span>
                </div>
                <div 
                  onClick={(e) => e.stopPropagation()} 
                  className={`flex items-center justify-start h-[24px]`}
                  data-umami-event="Z_Toggle_Favorite"
                  data-umami-event-title={mv.title}
                  data-umami-event-id={mv.id}
                  data-umami-event-action={isFav ? 'remove' : 'add'}
                >
                  <Switch 
                    checked={isFav}
                    onCheckedChange={onToggleFav}
                    className="origin-left"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* 下排：收藏 (compact 模式專用) */}
          {isCompact && (
            <div className={`flex items-center justify-between border-t-2 border-border/20 ${!isVeryCompact ? 'pt-3' : 'pt-2'}`}>
              <div className={`font-black opacity-70 flex items-baseline ${!isVeryCompact ? 'tracking-[0.2em] gap-1.5' : 'tracking-[0.1em] gap-1'}`}>
                <span className="tracking-normal">{t('app.favorite', '收藏')}</span>
                <span className="text-[8px] font-mono opacity-60 normal-case tracking-normal">Favorite</span>
              </div>
              <div 
                onClick={(e) => e.stopPropagation()} 
                className="flex items-center justify-end h-[24px]"
                data-umami-event="Z_Toggle_Favorite"
                data-umami-event-title={mv.title}
                data-umami-event-id={mv.id}
                data-umami-event-action={isFav ? 'remove' : 'add'}
              >
                <Switch 
                  checked={isFav}
                  onCheckedChange={onToggleFav}
                  className="origin-right"
                />
              </div>
            </div>
          )}
        </div>
      </ImageCard>
    </div>
  );
});
