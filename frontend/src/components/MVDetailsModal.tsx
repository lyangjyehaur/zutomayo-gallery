import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area'
import { MVItem } from '@/lib/types';
import { getProxyImgUrl } from '@/lib/image';
import { initGeo } from '@/lib/geo';
import FancyboxViewer, { GALLERY_BREAKPOINTS } from '@/components/FancyboxViewer';
import { WalineComments } from '@/components/WalineComments';
import { VERSION_CONFIG } from '@/config/version';
import { getLightboxProvider } from '@/config';
import { Helmet } from 'react-helmet-async';
import { CoverCarousel } from './MVCard';
import './MVDetailsModal.css';
import { MODAL_THEME } from '@/lib/theme';
import { useTranslation } from 'react-i18next';


// 圖標組件改為 pixelarticons 類名使用

interface MVDetailsModalProps {
  mv: MVItem | null;
  onClose: () => void;
  isFav?: boolean;
  onToggleFav?: () => void;
}

/**
 * MVDetailsModal - 影片詳情彈窗
 * 
 * 架構說明：
 * 1. 使用 Radix Dialog 作為基礎彈窗容器
 * 2. LightGallery 燈箱通過 Portal 渲染到 body，層級高於 Dialog
 * 3. 通過 CSS 和事件管理確保兩者正確協作
 */
export function MVDetailsModal({ mv, onClose, isFav, onToggleFav }: MVDetailsModalProps) {
  const { t } = useTranslation();

  // 影片播放狀態
  const [videoPlatform, setVideoPlatform] = useState<'youtube' | 'bilibili'>('bilibili');
  const [isVideoActivated, setIsVideoActivated] = useState(false);
  const [isChinaIP, setIsChinaIP] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

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
    setIsLightboxOpen(false);
    
    // 根據是否為牆內 IP 決定優先順序
    if (isChinaIP) {
      if (mv?.bilibili) setVideoPlatform('bilibili');
      else if (mv?.youtube) setVideoPlatform('youtube');
    } else {
      if (mv?.youtube) setVideoPlatform('youtube');
      else if (mv?.bilibili) setVideoPlatform('bilibili');
    }
  }, [mv?.id, isChinaIP]);

  // 網頁標題管理交由 Helmet 處理，移除直接操作 document.title 以避免 React DOM 衝突
  // 參考: react-helmet-async 會在 head 內進行 Portal 掛載，手動修改會導致 removeChild 崩潰

  const lightboxProvider = getLightboxProvider();

  const fbDismissableSelectors =
    '.fancybox__container, .fancybox__backdrop, .fancybox__carousel, .fancybox__toolbar, .fancybox__nav, .f-thumbs, .f-caption';
  const dismissableSelectors = fbDismissableSelectors;

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
  const GalleryViewer = FancyboxViewer;

  const leftColumnRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const [descHeight, setDescHeight] = useState<number | undefined>(undefined);
  const [scrollTop, setScrollTop] = useState(0);
  const [isDeferredReady, setIsDeferredReady] = useState(false);
  const [marqueeState, setMarqueeState] = useState({
    isMarquee: false,
    distance: 0,
    duration: 0,
  });
  const marqueeStateRef = useRef(marqueeState);
  const isScrolled = scrollTop > 20;

  const titleMarqueeRef = useRef<HTMLSpanElement>(null);

  // 處理標題跑馬燈的 ResizeObserver
  useEffect(() => {
    const node = titleMarqueeRef.current;
    if (!node) return;
    
    const parent = node.parentElement;
    if (!parent) return;

    let timeoutId: number;

    const handleResize = () => {
      requestAnimationFrame(() => {
        const firstChild = node.children[0] as HTMLElement;
        if (!firstChild) return;
        
        const isCurrentlyMarquee = node.classList.contains('animate-card-title-marquee');
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
      });
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    
    resizeObserver.observe(parent);
    resizeObserver.observe(node);
    
    // 延遲觸發，避免阻塞 Modal 開啟時的動畫
    timeoutId = window.setTimeout(handleResize, 350);

    return () => {
      resizeObserver.disconnect();
      window.clearTimeout(timeoutId);
    };
  }, [mv?.title]);

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
      
      // 手動處理背景滾動鎖定 (使用 modal={false} 避免 pointer-events 導致的大量 DOM 樣式重算卡頓)
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      
      // 延遲渲染重型組件以保持彈窗動畫流暢
      // 等待 600ms，確保 Dialog 動畫與 Modal 開啟流程徹底完成後再加載畫廊與評論
      const timer = setTimeout(() => {
        requestAnimationFrame(() => {
          setIsDeferredReady(true);
        });
      }, 600); 
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      };
    } else {
      setIsDeferredReady(false);
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
  }, [mv]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateHeight = () => {
      requestAnimationFrame(() => {
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
      });
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
    
    window.addEventListener('resize', updateHeight, { passive: true });
    // 延遲執行，避免阻塞彈窗動畫，給予 350ms 讓彈窗完成過場 
    const initialTimer = setTimeout(updateHeight, 350);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeight);
      window.clearTimeout(initialTimer);
    };
  }, [mv?.id, isVideoActivated, videoPlatform]);

  const handleLightboxOpen = () => {
    if (window.umami && typeof window.umami.track === 'function') {
      window.umami.track('Z_Open_Reference_Art', {
        title: mv?.title,
        id: mv?.id
      });
    }
    isLightboxOpenRef.current = true;
    setIsLightboxOpen(true);
  };

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

  // 判斷是否為 macOS (排除 iOS 與觸控裝置，讓手機端統一顯示右上角叉叉)
  const isMac = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    const isMacOs = /Mac/i.test(navigator.userAgent) || navigator.platform?.toUpperCase().indexOf('MAC') >= 0;
    const isMobileOrTouch = /(iPhone|iPod|iPad)/i.test(navigator.userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    return isMacOs && !isMobileOrTouch;
  }, []);

  return (
    <>
      {mv && (
        <Helmet>
          <title>{`${mv.title} | ZUTOMAYO MV Gallery`}</title>
        </Helmet>
      )}
      <Dialog modal={false} open={!!mv} onOpenChange={(open) => {
        // 這裡非常重要：Radix 的 Dialog 會在關閉動畫開始時，先呼叫 onOpenChange(false)
        // 如果我們在這裡就呼叫 onClose，React Router 會立刻切換網址
        // 網址一切換，上層的 <MVDetailsModal> 就會直接被卸載 (Unmount)
        // 這就是為什麼沒有關閉動畫的原因！
        
        // 當點擊 X 按鈕或背景時，也會觸發這個事件，但 open 會是 false
        if (!open) {
          // 如果燈箱開著，我們不關閉 Modal
          if (document.body.classList.contains('fancybox__body') || document.querySelector('.fancybox__container') || isLightboxOpenRef.current) {
            return;
          }
          
          // 只有在不是因為燈箱開啟而觸發的關閉，才真正準備關閉 Modal
          if (!isClosingRef.current) {
            isClosingRef.current = true;
            // 我們只把內部狀態標記為關閉，讓 Radix 的動畫開始跑
            // 但因為 Radix 的 open={!!mv} 是綁定在外部 prop 上，
            // 如果不呼叫 onClose，Dialog 就會卡在畫面上（因為 open 永遠是 true）。
            // 為了讓關閉動畫順利執行，我們必須呼叫 onClose 來讓外部 mv 變成 null，
            // 不過我們已經在父層用 AnimatePresence 或 Radix 自帶的卸載機制處理好了嗎？
            // 事實上，React Router 的 navigate 會直接把組件樹換掉，Radix 根本沒機會播動畫。
            
            // 所以正確的做法是：直接呼叫 onClose，但把「延遲關閉」的邏輯放到父層，
            // 或者放棄 Dialog 原生的退出動畫（因為 Router 切換是瞬間的）。
            onClose();
          }
        }
      }}>
      <DialogContent
        overlayClassName={MODAL_THEME.overlay.dialog}
        className={`max-w-none w-screen h-[100dvh] left-0 top-0 !translate-x-0 !translate-y-0 border-0 shadow-none rounded-none p-0 md:max-w-none md:w-screen md:h-[100dvh] md:left-0 md:top-0 md:!translate-x-0 md:!translate-y-0 md:border-0 md:shadow-none !flex !flex-col !gap-0 [&>button]:hidden ${MODAL_THEME.content.dialog}`}
        onPointerDownOutside={(e) => {
          // 當點擊 Modal 外部時，如果 Fancybox 開著，阻止關閉
          if (document.body.classList.contains('fancybox__body') || document.querySelector('.fancybox__container') || isLightboxOpenRef.current) {
            e.preventDefault();
            return;
          }
          // 不再使用 handlePointerDownOutside，這也是多餘的攔截
        }}
        onInteractOutside={(e) => {
          if (document.body.classList.contains('fancybox__body') || document.querySelector('.fancybox__container') || isLightboxOpenRef.current) {
            e.preventDefault();
            return;
          }
          // 不再使用 handleInteractOutside
        }}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          // 如果 Fancybox 存在，阻止 Modal 處理 ESC 鍵，完全交由 Fancybox 處理
          if (document.body.classList.contains('fancybox__body') || document.querySelector('.fancybox__container') || isLightboxOpenRef.current) {
            e.preventDefault();
            return;
          }
        }}
      >
        {/* CRT 背景層 */}
        <div className={MODAL_THEME.crt}></div>

        <DialogHeader className="relative z-30 pt-10 py-6 border-b-4 border-border shadow-md transition-all duration-200">
          {/* 使用一般的 button 取代 DialogClose 來完全控制關閉行為 */}
          <div className={`absolute top-4 z-[110] ${isMac ? 'left-4 md:left-8 md:top-6' : 'right-4 md:right-8 md:top-6'}`}>
            <button 
              className={`bg-background text-foreground border-3 border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all ${isMac ? 'w-auto px-3' : 'w-10'} h-10 flex items-center justify-center rounded-none font-black uppercase tracking-widest text-xs gap-1.5`}
              onClick={() => {
                if (!isClosingRef.current) {
                  isClosingRef.current = true;
                  onClose();
                }
              }}
              data-umami-event="Z_Close_MV_Modal"
              data-umami-event-title={mv?.title}
            >
              {isMac ? (
                <>
                  <i className="hn hn-angle-left text-xs leading-none"></i>
                  <span>返回</span>
                </>
              ) : (
                <i className="hn hn-times text-2xl leading-none"></i>
              )}
            </button>
          </div>
          
          <DialogTitle 
            className={`text-2xl cursor-default uppercase tracking-tighter font-black flex flex-col md:flex-row md:items-center gap-x-4 overflow-hidden w-full ${isMac ? 'pl-24 md:pl-32 pr-4' : 'pr-16 md:pr-20'}`} 
            lang="ja"
            style={{
              rowGap: typeof window !== 'undefined' && window.innerWidth < 768
                ? Math.max(0, 8 - scrollTop / 5) + 'px'
                : '8px'
            }}
          >
            {/* MV Title & Favorite Button Wrapper */}
            <div className="shrink-0 max-w-full md:max-w-[40%] flex items-center min-w-0 gap-3">
              {/* Favorite Button */}
              {onToggleFav && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFav();
                  }}
                  className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-none hover:scale-110 hover:-translate-y-0.5 transition-all ${
                    isFav 
                      ? 'text-yellow-400 drop-shadow-[0_0_2px_rgba(250,204,21,0.5)]' 
                      : 'text-foreground opacity-50 hover:opacity-100 hover:text-yellow-400'
                  }`}
                  data-umami-event="Z_Toggle_Favorite_Modal"
                  data-umami-event-title={mv?.title}
                  data-umami-event-id={mv?.id}
                  data-umami-event-action={isFav ? 'remove' : 'add'}
                  title={isFav ? t('app.unfavorited', '已取消收藏') : t('app.favorite', '收藏')}
                >
                  <i className={`hn ${isFav ? 'hn-star-solid' : 'hn-star'} text-2xl`}></i>
                </button>
              )}
              
              {/* MV Title Text */}
              <span className="flex min-w-0" data-text={mv?.title}>
                <span className="ztmy-modal-glitch relative flex min-w-0 w-full overflow-hidden group" data-text={mv?.title}>
                <span 
                  className={`inline-block whitespace-nowrap ${marqueeState.isMarquee ? 'overflow-visible animate-card-title-marquee' : 'max-w-full truncate'}`}
                  style={{
                    '--marquee-distance': `${marqueeState.distance}px`,
                    '--marquee-duration': `${marqueeState.duration}s`,
                    animationName: marqueeState.isMarquee ? 'card-title-marquee' : 'none',
                    animationTimingFunction: 'linear',
                    animationIterationCount: 'infinite'
                  } as React.CSSProperties}
                  ref={titleMarqueeRef}
                >
                  <span style={{ display: 'inline-block', paddingRight: marqueeState.isMarquee ? '32px' : '0px' }}>{mv?.title}</span>
                  <span style={{ display: marqueeState.isMarquee ? 'inline-block' : 'none', paddingRight: marqueeState.isMarquee ? '32px' : '0px' }} aria-hidden="true">{mv?.title}</span>
                </span>
              </span>
            </span>
            </div>
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
            {mv?.title} {t('app.details', '詳細資訊')}
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
                <Tabs 
                  value={videoPlatform} 
                  onValueChange={(val) => {
                    setVideoPlatform(val as 'youtube' | 'bilibili');
                    setIsVideoActivated(false);
                  }}
                  className="w-full flex flex-col"
                >
                {/* Monitor Header / Signal Switcher */}
                <div className="flex items-center justify-between px-2 min-[430px]:px-4 py-2 border-b-4 border-black bg-black/5">
                  <div className="flex items-center gap-1.5 min-[430px]:gap-3">
                    <div className={`w-2.5 h-2.5 animate-pulse ${videoPlatform === 'youtube' && isChinaIP ? 'bg-red-500 shadow-[2px_2px_0_0_rgba(239,68,68,0.4)]' : 'bg-green-500 shadow-[2px_2px_0_0_rgba(34,197,94,0.4)]'}`}></div>
                    <span className="text-[10px] font-black uppercase tracking-widest flex flex-col leading-tight min-w-0">
                      <span className="tracking-normal flex items-baseline gap-1 min-[430px]:gap-1.5 opacity-60 min-w-0">
                        <span className="whitespace-nowrap">{t('app.signal_source', '訊號源')}</span>
                        <span className="text-[8px] font-mono normal-case truncate">Signal_Source</span>
                      </span>
                      {videoPlatform === 'youtube' && isChinaIP ? (
                        <span className="tracking-normal text-red-500 flex items-baseline gap-1 min-[430px]:gap-1.5 min-w-0">
                          <span className="whitespace-nowrap">{t('app.disconnected', '已斷開')}</span>
                          <span className="text-[8px] font-mono normal-case truncate">Disconnected</span>
                        </span>
                      ) : (
                        <span className="tracking-normal text-green-500 flex items-baseline gap-1 min-[430px]:gap-1.5 min-w-0">
                          <span className="whitespace-nowrap">{t('app.connected', '已連線')}</span>
                          <span className="text-[8px] font-mono normal-case truncate">Connected</span>
                        </span>
                      )}
                    </span>
                  </div>
                  
                  {mv?.bilibili && mv?.youtube && (
                    <TabsList className="!bg-transparent !border-0 !p-0 h-auto !shadow-none flex gap-1.5 min-[430px]:gap-3">
                      <TabsTrigger 
                        value="youtube"
                        className="px-1.5 min-[430px]:px-3 py-1 min-[430px]:py-1.5 text-[8px] min-[430px]:text-[10px] font-black uppercase transition-all border-2 border-black flex items-center gap-1 min-[430px]:gap-1.5 bg-card text-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)] data-[state=active]:bg-[#ff0000] data-[state=active]:text-white data-[state=active]:translate-y-[2px] data-[state=active]:translate-x-[2px] data-[state=active]:shadow-none data-[state=active]:hover:bg-[#ff0000] data-[state=active]:border-black"
                        data-umami-event="Z_Switch_Video_Platform"
                        data-umami-event-platform="youtube"
                        data-umami-event-title={mv?.title}
                      >
                        <i className="hn hn-youtube text-[10px] min-[430px]:text-sm"></i> YouTube
                      </TabsTrigger>
                      <TabsTrigger 
                        value="bilibili"
                        className="px-1.5 min-[430px]:px-3 py-1 min-[430px]:py-1.5 text-[8px] min-[430px]:text-[10px] font-black uppercase transition-all border-2 border-black flex items-center gap-1 min-[430px]:gap-1.5 bg-card text-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:-translate-y-[1px] hover:-translate-x-[1px] hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)] data-[state=active]:bg-[#FB7299] data-[state=active]:text-white data-[state=active]:translate-y-[2px] data-[state=active]:translate-x-[2px] data-[state=active]:shadow-none data-[state=active]:hover:bg-[#FB7299] data-[state=active]:border-black"
                        data-umami-event="Z_Switch_Video_Platform"
                        data-umami-event-platform="bilibili"
                        data-umami-event-title={mv?.title}
                      >
                        <i className="hn hn-retro-pc text-[10px] min-[430px]:text-sm"></i> Bilibili
                      </TabsTrigger>
                    </TabsList>
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
                        <CoverCarousel coverImages={mv?.images?.filter(img => img.MVMedia?.usage === 'cover').map(img => img.url) || []} title={mv?.title || ''} isPaused={isLightboxOpen} forceLoad={true} hideCrt={true} />
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
                                <span className="tracking-normal">{t('app.signal_disconnected', '訊號源斷開')}</span>
                                <span className="text-[6px] min-[430px]:text-[8px] font-mono opacity-80 normal-case mt-0.5">Signal_Disconnected</span>
                              </span>
                            </div>
                            <div className="bg-black/60 backdrop-blur-sm px-4 py-2 border-2 border-red-500/50 text-red-400 text-xs min-[430px]:text-sm font-bold flex items-center gap-2">
                                <span className="text-base animate-bounce">👻</span>
                                <span>{t('app.signal_intercepted', '訊號被神秘力量攔截啦！去隔壁頻道看看吧？')}</span>
                              </div>
                          </div>
                        ) : (
                          <div className="bg-main/50 backdrop-blur px-6 min-[430px]:px-10 py-3 min-[430px]:py-5 border-4 border-black flex flex-col items-center gap-2 min-[430px]:gap-3">
                            <div className="flex items-center gap-2 min-[430px]:gap-3 mb-0 min-[430px]:mb-1">
                              <i className="hn hn-play text-xl min-[430px]:text-3xl text-black"></i>
                              <span className="font-black tracking-widest text-black text-lg min-[430px]:text-2xl">PLAY</span>
                            </div>
                            <span className="glitch-text text-black font-black tracking-widest text-[8px] min-[430px]:text-[10px] uppercase flex flex-col items-center leading-tight opacity-70">
                              <span className="tracking-normal">{t('app.init_signal', '初始化訊號串流')}</span>
                              <span className="text-[6px] min-[430px]:text-[8px] font-mono opacity-80 normal-case mt-0.5">Initialize_Signal_Stream</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {mv?.youtube && (
                        <TabsContent value="youtube" className="w-full h-full m-0 border-0 p-0 shadow-none outline-none">
                          <iframe
                            src={`https://www.youtube.com/embed/${mv.youtube}?autoplay=1&rel=0`}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={mv.title}
                            lang="ja"
                            referrerPolicy="strict-origin-when-cross-origin"
                          />
                        </TabsContent>
                      )}
                      {mv?.bilibili && (
                        <TabsContent value="bilibili" className="w-full h-full m-0 border-0 p-0 shadow-none outline-none">
                          <iframe 
                            src={`//player.bilibili.com/player.html?bvid=${mv.bilibili}&page=1&high_quality=1&autoplay=1`}
                            className="w-full h-full"
                            scrolling="no"
                            frameBorder="0"
                            allowFullScreen
                            title={mv.title}
                            lang="ja"
                            referrerPolicy="strict-origin-when-cross-origin"
                          />
                        </TabsContent>
                      )}
                    </>
                  )}
                </div>
                </Tabs>
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
                      <span className="tracking-normal flex items-baseline gap-1 min-[430px]:gap-1.5 opacity-60">{t("app.video_info", "影像資訊")}<span className="text-[6px] min-[430px]:text-[8px] font-mono normal-case">Video_Description_v{VERSION_CONFIG.app}</span>
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
                {isDeferredReady ? (
                  <>
                    <div className="space-y-4">
                    <h4 className="font-bold border-b-3 border-black pb-2 flex items-center gap-2 uppercase tracking-widest">
                      <i className="hn hn-image text-xl text-ztmy-green"></i>{t("app.reference_art", "設定資料圖")}</h4>
                    {mv?.images && mv.images.filter(img => img.MVMedia?.usage !== 'cover').length > 0 ? (
                      <GalleryViewer
                        images={mv.images.filter(img => img.MVMedia?.usage !== 'cover')}
                        mvTitle={mv.title}
                        mvId={mv.id}
                        itemsPerPage={12}
                        autoLoadMore={mv.autoLoadMore || false} // 由 Admin 後台設定控制
                        showHeader={false}
                        enablePagination={true}
                        breakpointColumns={GALLERY_BREAKPOINTS}
                        className="!p-0 !min-h-0"
                          onLightboxOpen={handleLightboxOpen}
                          onLightboxClose={() => { 
                            // 延遲更新狀態，避免與 Radix 的事件衝突
                            setTimeout(() => {
                              isLightboxOpenRef.current = false; 
                              setIsLightboxOpen(false);
                            }, 50);
                          }}
                      />
                    ) : (
                      <div className="w-full py-16 flex flex-col items-center justify-center border-4 border-dashed border-border mt-2 select-none">
                        <div className="text-5xl mb-4 opacity-20">
                          <i className="hn hn-image text-5xl"></i>
                        </div>
                        <div className="flex flex-col items-center leading-tight">
                          <h3 className="text-lg font-black uppercase tracking-widest opacity-80">
                            {t("app.no_reference_art", "暫無設定圖資料")}
                          </h3>
                          <span className="text-[10px] font-mono opacity-40 mt-1">
                            NO_REFERENCE_ASSETS
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Waline 評論區 */}
                  {mv && (
                    <div className="mt-8 pt-8">
                      <h4 className="font-bold border-b-3 border-black pb-2 flex items-center justify-between gap-2 uppercase tracking-widest mb-4">
                        <div className="flex items-center gap-2">
                          <i className="hn hn-message text-xl text-ztmy-blue"></i>
                          {t("app.comments", "留言")}
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
                  </>
                ) : (
                  <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center opacity-50 bg-card border-4 border-dashed border-border p-8 animate-pulse">
                    <div className="relative mb-6">
                      <i className="hn hn-image text-5xl opacity-20"></i>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center leading-tight">
                      <h3 className="text-lg font-black uppercase tracking-widest opacity-80 mb-1">
                        {t("app.loading", "載入中...")}
                      </h3>
                      <span className="text-[10px] font-mono opacity-40 tracking-widest">
                        LOADING_ASSETS...
                      </span>
                    </div>
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
