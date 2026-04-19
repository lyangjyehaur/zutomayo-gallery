import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area'
import { MVItem } from '@/lib/types';
import { getProxyImgUrl } from '@/lib/image';
import { initGeo } from '@/lib/geo';
import LightGalleryViewer, { GALLERY_BREAKPOINTS } from '@/components/LightGalleryViewer';
import FancyboxViewer from '@/components/FancyboxViewer';
import { WalineComments } from '@/components/WalineComments';
import { VERSION_CONFIG } from '@/config/version';
import { getLightboxProvider } from '@/config';
import { Helmet } from 'react-helmet-async';
import { CoverCarousel } from './MVCard';
import './MVDetailsModal.css';


// 圖標組件改為 pixelarticons 類名使用

interface MVDetailsModalProps {
  mv: MVItem | null;
  onClose: () => void;
}

/**
 * MVDetailsModal - 影片詳情彈窗
 * 
 * 架構說明：
 * 1. 使用 Radix Dialog 作為基礎彈窗容器
 * 2. LightGallery 燈箱通過 Portal 渲染到 body，層級高於 Dialog
 * 3. 通過 CSS 和事件管理確保兩者正確協作
 */
export function MVDetailsModal({ mv, onClose }: MVDetailsModalProps) {
  // 影片播放狀態
  const [videoPlatform, setVideoPlatform] = useState<'youtube' | 'bilibili'>('bilibili');
  const [isVideoActivated, setIsVideoActivated] = useState(false);
  const [isChinaIP, setIsChinaIP] = useState(false);

  useEffect(() => {
    initGeo().then(info => {
      setIsChinaIP(info.isChinaIP);
    });
  }, []);
  
  // 防止在退場動畫期間連續觸發 onClose 導致路由亂跳
  const isClosingRef = useRef(false);
  useEffect(() => {
    if (mv) isClosingRef.current = false;
  }, [mv]);
  
  // 使用 ref 追踪燈箱狀態，避免觸發重渲染
  const isLightboxOpenRef = useRef(false);

  // 當切換影片或獲取到 IP 狀態時重置平台選擇
  useEffect(() => {
    isLightboxOpenRef.current = false;
    
    // 根據是否為牆內 IP 決定優先順序
    if (isChinaIP) {
      if (mv?.bilibili) setVideoPlatform('bilibili');
      else if (mv?.youtube) setVideoPlatform('youtube');
    } else {
      if (mv?.youtube) setVideoPlatform('youtube');
      else if (mv?.bilibili) setVideoPlatform('bilibili');
    }
  }, [mv?.id, isChinaIP]);

  // 網頁標題管理
  useEffect(() => {
    if (mv) {
      document.title = `${mv.title} - ZUTOMAYO MV Gallery`;
    } else {
      document.title = 'ZUTOMAYO MV Gallery';
    }
    
    // 清理函數：當元件卸載時恢復預設標題
    return () => {
      document.title = 'ZUTOMAYO MV Gallery';
    };
  }, [mv]);

  const lightboxProvider = getLightboxProvider();

  const lgDismissableSelectors =
    '.lg-backdrop, .lg-outer, .lg-components, .lg-container, .lg-toolbar, .lg-actions, .lg-thumb-outer, .lg-sub-html';
  const fbDismissableSelectors =
    '.fancybox__container, .fancybox__backdrop, .fancybox__carousel, .fancybox__toolbar, .fancybox__nav, .f-thumbs, .f-caption';
  const dismissableSelectors = lightboxProvider === 'fb' ? fbDismissableSelectors : lgDismissableSelectors;

  // 處理 Dialog 外部點擊
  const handlePointerDownOutside = (e: React.PointerEvent) => {
    // 檢查點擊目標是否在燈箱元素內
    const target = e.target as HTMLElement;
    if (target.closest(dismissableSelectors)) {
      e.preventDefault();
    }
  };

  const handleInteractOutside = (e: React.FocusEvent | React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    const target = (e as unknown as React.PointerEvent).target as HTMLElement;
    if (target?.closest(dismissableSelectors)) {
      e.preventDefault();
    }
  };
  const GalleryViewer = (lightboxProvider === 'fb' ? FancyboxViewer : LightGalleryViewer) as React.ComponentType<any>;

  const leftColumnRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const [descHeight, setDescHeight] = useState<number | undefined>(undefined);
  const [scrollTop, setScrollTop] = useState(0);
  const [marqueeState, setMarqueeState] = useState({
    isMarquee: false,
    distance: 0,
    duration: 0,
  });
  const marqueeStateRef = useRef(marqueeState);
  const isScrolled = scrollTop > 20;

  // 同步 marqueeState 到 ref
  useEffect(() => {
    marqueeStateRef.current = marqueeState;
  }, [marqueeState]);

  // 當 modal 開啟時才重置一些狀態
  useEffect(() => {
    if (mv) {
      setDescHeight(undefined);
      setScrollTop(0);
      setMarqueeState({ isMarquee: false, distance: 0, duration: 0 });
      
      // 確保影片播放狀態被重置
      setIsVideoActivated(false);
    }
  }, [mv]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateHeight = () => {
      // 只有在 lg (1024px) 以上才需要精確計算高度，手機端維持 max-h-[50vh]
      if (window.innerWidth < 1024) {
        setDescHeight(undefined);
        return;
      }

      if (leftColumnRef.current && playerRef.current) {
        // 使用 window.innerHeight 減去所有已知的固定空間來精確計算
        // Modal 的結構是: 100vh，包含 header、py-8 的 padding 等
        
        // 抓取彈窗可滾動區域容器 (有 px-8 py-8 的那個)
        const scrollContainer = leftColumnRef.current.closest('.custom-scrollbar');
        if (!scrollContainer) return;
        
        // 可用總高度 = 容器實際高度 - 內部上下 padding (2rem = 32px * 2 = 64px)
        const availableHeight = scrollContainer.clientHeight - 64; 
        
        const playerHeight = playerRef.current.offsetHeight;
        const gap = 16; // space-y-4
        
        const calculated = availableHeight - playerHeight - gap;
        setDescHeight(Math.max(150, calculated));
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });

    if (leftColumnRef.current?.parentElement) {
      resizeObserver.observe(leftColumnRef.current.parentElement);
    }
    if (playerRef.current) {
      resizeObserver.observe(playerRef.current);
    }
    
    window.addEventListener('resize', updateHeight);
    // 延遲一下確保 DOM 渲染完成
    setTimeout(updateHeight, 0);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [mv?.id, isVideoActivated, videoPlatform]);

  useEffect(() => {
    // 建立提取參數的工具函式
    const getUtmSource = () => {
      try {
        return new URLSearchParams(window.location.search).get('utm_source') || 'direct';
      } catch {
        return 'direct';
      }
    };

    if (isVideoActivated && window.umami && typeof window.umami.track === 'function') {
      window.umami.track('Z_Play_Video', {
        platform: videoPlatform,
        title: mv?.title,
        utm_source: getUtmSource()
      });
    }
  }, [isVideoActivated, videoPlatform, mv?.title]);

  return (
    <>
      <Helmet>
        <title>{mv ? `${mv.title} - ZUTOMAYO MV Gallery` : 'ZUTOMAYO MV Gallery'}</title>
        {mv && (
          <>
            <meta property="og:title" content={`${mv.title} - ZUTOMAYO MV Gallery`} />
            <meta property="og:description" content={mv.description?.substring(0, 100) || ''} />
            {mv.coverImages?.[0] && <meta property="og:image" content={getProxyImgUrl(mv.coverImages[0], 'small')} />}
          </>
        )}
      </Helmet>
    <Dialog open={!!mv} onOpenChange={(open) => {
      if (!open && !isLightboxOpenRef.current && !isClosingRef.current) {
        isClosingRef.current = true;
        onClose();
      }
    }}>
      <DialogContent
        className="max-w-none border-none [&>button]:hidden"
        onPointerDownOutside={handlePointerDownOutside}
        onInteractOutside={handleInteractOutside}
      >
        <DialogHeader className="relative z-30 pt-10 py-6 border-b-4 border-border shadow-md transition-all duration-200">
          <DialogClose 
              className="absolute top-4 right-4 md:top-6 md:right-8 z-50 bg-background text-foreground border-3 border-foreground shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all w-10 h-10 flex items-center justify-center rounded-none"
              data-umami-event="Z_Close_MV_Modal"
              data-umami-event-title={mv?.title}
            >
              <i className="hn hn-times text-2xl"></i>
            </DialogClose>
          
          <DialogTitle 
            className="text-2xl pr-16 cursor-default uppercase tracking-tighter font-black flex flex-col md:flex-row md:items-center gap-x-4 overflow-hidden w-full" 
            lang="ja"
            style={{
              rowGap: typeof window !== 'undefined' && window.innerWidth < 768
                ? Math.max(0, 8 - scrollTop / 5) + 'px'
                : '8px'
            }}
          >
            {/* MV Title */}
            <span className="ztmy-cyber-title shrink-0 max-w-full md:max-w-[40%] flex min-w-0" data-text={mv?.title}>
              <span className="ztmy-cyber-text relative flex min-w-0 w-full overflow-hidden group" data-text={mv?.title}>
                <span 
                  className={`inline-block whitespace-nowrap ${marqueeState.isMarquee ? 'overflow-visible animate-card-title-marquee' : 'max-w-full truncate'}`}
                  style={{
                    '--marquee-distance': `${marqueeState.distance}px`,
                    '--marquee-duration': `${marqueeState.duration}s`,
                    animationName: marqueeState.isMarquee ? 'card-title-marquee' : 'none',
                    animationTimingFunction: 'linear',
                    animationIterationCount: 'infinite'
                  } as React.CSSProperties}
                  ref={(node) => {
                    if (node) {
                      const parent = node.parentElement;
                      if (!parent) return;
                      
                      const handleResize = () => {
                        const firstChild = node.children[0] as HTMLElement;
                        if (!firstChild) return;
                        
                        const isCurrentlyMarquee = node.classList.contains('animate-card-title-marquee');
                        
                        // 計算文字真實寬度，如果是跑馬燈狀態，需要減去我們加上的 32px padding
                        const textWidth = firstChild.offsetWidth - (isCurrentlyMarquee ? 32 : 0);
                        const parentWidth = parent.clientWidth;

                        if (textWidth > parentWidth) {
                          const gap = 32;
                          const distance = textWidth + gap;
                          const duration = Math.max(distance / 48, 8);
                          
                          if (!marqueeStateRef.current.isMarquee || marqueeStateRef.current.distance !== distance || marqueeStateRef.current.duration !== duration) {
                            setMarqueeState({ isMarquee: true, distance, duration });
                          }
                        } else {
                          if (marqueeStateRef.current.isMarquee) {
                            setMarqueeState({ isMarquee: false, distance: 0, duration: 0 });
                          }
                        }
                      };

                      // 避免重複綁定 ResizeObserver
                      if ((node as any)._resizeObserver) {
                        (node as any)._resizeObserver.disconnect();
                      }

                      const resizeObserver = new ResizeObserver(() => {
                        handleResize();
                      });
                      
                      if (node.parentElement) {
                        resizeObserver.observe(node.parentElement);
                      }
                      resizeObserver.observe(node);
                      (node as any)._resizeObserver = resizeObserver;
                      
                      // 初始觸發一次計算，並在幾毫秒後再觸發一次以確保字體等資源已載入
                      handleResize();
                      setTimeout(handleResize, 100);
                      setTimeout(handleResize, 500);
                    }
                  }}
                >
                  <span style={{ display: 'inline-block', paddingRight: marqueeState.isMarquee ? '32px' : '0px' }}>{mv?.title}</span>
                  <span style={{ display: marqueeState.isMarquee ? 'inline-block' : 'none', paddingRight: marqueeState.isMarquee ? '32px' : '0px' }} aria-hidden="true">{mv?.title}</span>
                </span>
              </span>
            </span>
            {mv?.keywords && mv.keywords.length > 0 && (
              <div 
                className="flex-1 flex flex-wrap items-center gap-2 italic text-sm font-bold tracking-normal normal-case md:pt-1.5 min-w-0 md:opacity-80 md:flex md:!max-h-full"
                style={{
                  maxHeight: typeof window !== 'undefined' && window.innerWidth < 768 
                    ? Math.max(0, 80 - scrollTop) + 'px' 
                    : undefined,
                  opacity: typeof window !== 'undefined' && window.innerWidth < 768 
                    ? Math.max(0, 1 - scrollTop / 40) * 0.8
                    : undefined,
                  overflow: 'hidden',
                  visibility: typeof window !== 'undefined' && window.innerWidth < 768 && scrollTop >= 80 ? 'hidden' : 'visible'
                }}
              >
                {mv.keywords.map((k, i) => (
                  <span key={i} lang={k.lang || undefined}>#{k.text}</span>
                ))}
              </div>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {mv?.title} 詳細資訊
          </DialogDescription>
        </DialogHeader>
        
        <div 
          className="flex-1 overflow-y-auto lg:overflow-hidden px-8 py-8 custom-scrollbar relative z-20"
          onScroll={(e) => {
            const target = e.currentTarget;
            setScrollTop(target.scrollTop);
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-screen-2xl mx-auto lg:h-full">
            {/* 左側/上方區域：影片 + 描述 + 畫廊 */}
            <div className="space-y-4 lg:sticky lg:top-0 flex flex-col min-h-0 lg:h-full" ref={leftColumnRef}>
              {/* 影片播放區 (Monitor) */}
              <div className="w-full flex flex-col border-4 border-black shadow-shadow bg-card" ref={playerRef}>
                {/* Monitor Header / Signal Switcher */}
                <div className="flex items-center justify-between px-2 min-[430px]:px-4 py-2 border-b-4 border-black bg-black/5">
                  <div className="flex items-center gap-1.5 min-[430px]:gap-3">
                    <div className={`w-2.5 h-2.5 animate-pulse ${videoPlatform === 'youtube' && isChinaIP ? 'bg-red-500 shadow-[2px_2px_0_0_rgba(239,68,68,0.4)]' : 'bg-green-500 shadow-[2px_2px_0_0_rgba(34,197,94,0.4)]'}`}></div>
                    <span className="text-[10px] font-black uppercase tracking-widest flex flex-col leading-tight min-w-0">
                      <span className="tracking-normal flex items-baseline gap-1 min-[430px]:gap-1.5 opacity-60 min-w-0">
                        <span className="whitespace-nowrap">訊號源</span>
                        <span className="text-[8px] font-mono normal-case truncate">Signal_Source</span>
                      </span>
                      {videoPlatform === 'youtube' && isChinaIP ? (
                        <span className="tracking-normal text-red-500 flex items-baseline gap-1 min-[430px]:gap-1.5 min-w-0">
                          <span className="whitespace-nowrap">已斷開</span>
                          <span className="text-[8px] font-mono normal-case truncate">Disconnected</span>
                        </span>
                      ) : (
                        <span className="tracking-normal text-green-500 flex items-baseline gap-1 min-[430px]:gap-1.5 min-w-0">
                          <span className="whitespace-nowrap">已連線</span>
                          <span className="text-[8px] font-mono normal-case truncate">Connected</span>
                        </span>
                      )}
                    </span>
                  </div>
                  
                  {mv?.bilibili && mv?.youtube && (
                    <div className="flex gap-1.5 min-[430px]:gap-3">
                      <button 
                        onClick={() => { setVideoPlatform('youtube'); setIsVideoActivated(false); }}
                        className={`px-1.5 min-[430px]:px-3 py-1 min-[430px]:py-1.5 text-[8px] min-[430px]:text-[10px] font-black uppercase transition-all border-2 border-black flex items-center gap-1 min-[430px]:gap-1.5 ${videoPlatform === 'youtube' ? 'bg-[#ff0000] text-white translate-y-[2px] translate-x-[2px] shadow-none' : 'bg-card text-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-[#ff0000]/20 hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]'}`}
                        data-umami-event="Z_Switch_Video_Platform"
                        data-umami-event-platform="youtube"
                        data-umami-event-title={mv?.title}
                      >
                        <i className="hn hn-youtube text-[10px] min-[430px]:text-sm"></i> YouTube
                      </button>
                      <button 
                        onClick={() => { setVideoPlatform('bilibili'); setIsVideoActivated(false); }}
                        className={`px-1.5 min-[430px]:px-3 py-1 min-[430px]:py-1.5 text-[8px] min-[430px]:text-[10px] font-black uppercase transition-all border-2 border-black flex items-center gap-1 min-[430px]:gap-1.5 ${videoPlatform === 'bilibili' ? 'bg-[#FB7299] text-white translate-y-[2px] translate-x-[2px] shadow-none' : 'bg-card text-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-[#FB7299]/20 hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]'}`}
                        data-umami-event="Z_Switch_Video_Platform"
                        data-umami-event-platform="bilibili"
                        data-umami-event-title={mv?.title}
                      >
                        <i className="hn hn-retro-pc text-[10px] min-[430px]:text-sm"></i> Bilibili
                      </button>
                    </div>
                  )}
                  {(!mv?.bilibili || !mv?.youtube) && (
                    <div className="px-1.5 min-[430px]:px-3 py-1 min-[430px]:py-1.5 text-[8px] min-[430px]:text-[10px] font-black uppercase border-2 border-black flex items-center gap-1 min-[430px]:gap-1.5 bg-card shadow-[2px_2px_0_0_rgba(0,0,0,1)] opacity-70">
                      {mv?.youtube ? <><i className="hn hn-youtube text-[10px] min-[430px]:text-sm"></i> YouTube</> : <><i className="hn hn-retro-pc text-[10px] min-[430px]:text-sm"></i> Bilibili</>}
                    </div>
                  )}
                </div>

                {/* Monitor Screen */}
                <div className="aspect-video bg-black overflow-hidden relative group isolate">
                  {!isVideoActivated ? (
                    <div 
                      className={`absolute inset-0 z-20 flex items-center justify-center overflow-hidden ${videoPlatform === 'youtube' && isChinaIP ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      onClick={() => {
                        if (videoPlatform === 'youtube' && isChinaIP) return;
                        setIsVideoActivated(true);
                      }}
                      data-umami-event="Z_Play_Video"
                      data-umami-event-platform={videoPlatform}
                      data-umami-event-title={mv?.title}
                    >
                      <div className="absolute inset-0 z-0">
                        <CoverCarousel coverImages={mv?.coverImages ?? []} title={mv?.title || ''} isPaused={false} forceLoad={true} hideCrt={true} />
                      </div>
                      <div className={`absolute inset-0 transition-colors z-10 ${videoPlatform === 'youtube' && isChinaIP ? 'bg-black/60' : 'bg-black/40 group-hover:bg-black/20'}`} />
                      <div className="absolute inset-0 opacity-20 pointer-events-none crt-lines z-15"></div>
                      
                      <div className="relative z-40 flex flex-col items-center gap-6">
                        {/* 播放按鈕 - 背景模糊、無陰影、無懸浮位移 */}
                        {videoPlatform === 'youtube' && isChinaIP ? (
                          <div className="flex flex-col items-center gap-3 min-[430px]:gap-4">
                            <div className="bg-red-900/50 backdrop-blur px-6 min-[430px]:px-10 py-3 min-[430px]:py-5 border-4 border-red-500 flex flex-col items-center gap-2 min-[430px]:gap-3">
                              <div className="flex items-center gap-2 min-[430px]:gap-3 mb-0 min-[430px]:mb-1">
                                <i className="hn hn-times-solid text-xl min-[430px]:text-3xl text-red-500"></i>
                                <span className="font-black tracking-widest text-red-500 text-lg min-[430px]:text-2xl">OFFLINE</span>
                              </div>
                              <span className="glitch-text text-red-400 font-black tracking-widest text-[8px] min-[430px]:text-[10px] uppercase flex flex-col items-center leading-tight opacity-70">
                                <span className="tracking-normal">信號源斷開</span>
                                <span className="text-[6px] min-[430px]:text-[8px] font-mono opacity-80 normal-case mt-0.5">Signal_Disconnected</span>
                              </span>
                            </div>
                            <div className="bg-black/60 backdrop-blur-sm px-4 py-2 border-2 border-red-500/50 text-red-400 text-xs min-[430px]:text-sm font-bold flex items-center gap-2">
                                <span className="text-base animate-bounce">👻</span>
                                <span>訊號被神秘力量攔截啦！去隔壁頻道看看吧？</span>
                              </div>
                          </div>
                        ) : (
                          <div className="bg-main/50 backdrop-blur px-6 min-[430px]:px-10 py-3 min-[430px]:py-5 border-4 border-black flex flex-col items-center gap-2 min-[430px]:gap-3">
                            <div className="flex items-center gap-2 min-[430px]:gap-3 mb-0 min-[430px]:mb-1">
                              <i className="hn hn-play text-xl min-[430px]:text-3xl text-black"></i>
                              <span className="font-black tracking-widest text-black text-lg min-[430px]:text-2xl">PLAY</span>
                            </div>
                            <span className="glitch-text text-black font-black tracking-widest text-[8px] min-[430px]:text-[10px] uppercase flex flex-col items-center leading-tight opacity-70">
                              <span className="tracking-normal">初始化訊號串流</span>
                              <span className="text-[6px] min-[430px]:text-[8px] font-mono opacity-80 normal-case mt-0.5">Initialize_Signal_Stream</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                      videoPlatform === 'youtube' && mv?.youtube ? (
                        <iframe 
                          src={`https://www.youtube.com/embed/${mv.youtube}?autoplay=1&rel=0`}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={mv.title}
                          lang="ja"
                          referrerPolicy="strict-origin-when-cross-origin"
                        />
                      ) : mv?.bilibili ? (
                        <iframe 
                          src={`//player.bilibili.com/player.html?bvid=${mv.bilibili}&page=1&high_quality=1&autoplay=1`}
                          className="w-full h-full"
                          scrolling="no" frameBorder="0" allowFullScreen
                          title={mv.title}
                          lang="ja"
                          referrerPolicy="strict-origin-when-cross-origin"
                        />
                      ) : null
                  )}
                </div>
              </div>

              {/* 描述區域 */}
              <div 
                className="flex flex-col bg-card border-4 border-border shadow-shadow relative overflow-hidden max-h-[50vh] lg:max-h-none min-h-0 transition-none"
                style={{ height: descHeight ? `${descHeight}px` : 'auto' }}
              >
                <div className="flex items-center justify-between px-3 min-[430px]:px-4 py-2 min-[430px]:py-4 border-b-4 border-black bg-black/5 shrink-0 z-10">
                  <div className="flex items-center gap-2 min-[430px]:gap-3">
                    <div className="w-2 h-2 min-[430px]:w-2.5 min-[430px]:h-2.5 bg-blue-500 animate-pulse shadow-[2px_2px_0_0_rgba(59,130,246,0.4)]"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest flex flex-col leading-tight">
                      <span className="tracking-normal flex items-baseline gap-1 min-[430px]:gap-1.5 opacity-60">
                        影像資訊 <span className="text-[6px] min-[430px]:text-[8px] font-mono normal-case">Video_Description_v{VERSION_CONFIG.app}</span>
                      </span>
                    </span>
                  </div>
                </div>
                <ScrollArea className="flex-1 min-h-0 custom-scrollbar w-full">
                  <div className="p-4 min-[430px]:p-8 pt-4 min-[430px]:pt-6">
                    <p className="text-xs min-[430px]:text-sm leading-relaxed whitespace-pre-wrap opacity-90 font-base" lang="ja">{mv?.description}</p>
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* 設定圖畫廊區與評論區 - 在左右布局時顯示在右側，在單欄時接在描述下方 */}
            <ScrollArea className="lg:h-full custom-scrollbar w-full">
              <div className="space-y-8 lg:space-y-4 lg:pr-4 lg:pb-8">
                <div className="space-y-4">
                <h4 className="font-bold border-b-3 border-black pb-2 flex items-center gap-2 uppercase tracking-widest">
                  <i className="hn hn-image text-xl text-ztmy-green"></i> 設定資料圖
                </h4>
                {mv?.images && mv.images.length > 0 ? (
                  <GalleryViewer
                    images={mv.images}
                    mvTitle={mv.title}
                    mvId={mv.id}
                    itemsPerPage={12}
                    autoLoadMore={mv.autoLoadMore || false} // 由 Admin 後台設定控制
                    showHeader={false}
                    enablePagination={true}
                    breakpointColumns={GALLERY_BREAKPOINTS}
                    className="!p-0 !min-h-0"
                    onLightboxOpen={() => { isLightboxOpenRef.current = true; }}
                    onLightboxClose={() => { isLightboxOpenRef.current = false; }}
                  />
                ) : (
                  <p className="text-sm opacity-50 italic text-center py-10 border-2 border-dashed border-white/5">
                    暫無設定圖資料
                  </p>
                )}
              </div>

              {/* Waline 評論區 */}
              {mv && (
                <div className="mt-8 pt-8">
                  <h4 className="font-bold border-b-3 border-black pb-2 flex items-center justify-between gap-2 uppercase tracking-widest mb-4">
                    <div className="flex items-center gap-2">
                      <i className="hn hn-message text-xl text-ztmy-blue"></i>
                      評論
                    </div>
                    <div className="text-xs font-mono font-normal opacity-50 tracking-normal flex items-center gap-1.5">
                      <i className="hn hn-eye"></i>
                      <span className="waline-pageview-count" data-path={`/mv/${mv.id}`}>...</span>
                    </div>
                  </h4>
                  <WalineComments
                    path={`/mv/${mv.id}`}
                    className="waline-wrapper"
                  />
                </div>
              )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
