import React, { useMemo, useEffect, useRef, useState, Suspense } from 'react';
import { Fancybox as NativeFancybox } from '@fancyapps/ui';
import '@fancyapps/ui/dist/fancybox/fancybox.css';
import { Disc3, Calendar, Play } from 'lucide-react';

import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';

// 延遲載入重量級的 Three.js 和 CDCase3D
const CDCase3D = React.lazy(() => import('./CDCase3D'));

export interface TimelineImage {
  url: string;
  thumb: string;
  src: string;
  full: string;
  raw: string;
  caption: string;
  richText: string;
  rawFilename: string;
  originalUrl: string;
  artworkBaseUrl?: string;
  releaseDateStr: string;
  year: number;
  artist: string;
  trackCount: number;
  collectionType: string;
  isHidden?: boolean;
}

/**
 * 動態轉換 Apple Music 圖片 URL 的解析度與格式
 * @param url 原始的 Apple Music 圖片網址
 * @param size 期望的寬高
 * @param format 期望的格式 (建議用 webp)
 */
function getOptimizedAppleMusicUrl(url: string, size: number, format: 'jpg' | 'webp' | 'png' = 'webp') {
  if (!url) return '';
  return url.replace(/(\d+x\d+)[^./]*\.[a-zA-Z]+(\?.*)?$/, `${size}x${size}.${format}`);
}

// 定義靜態屬性避免在渲染中重建
const INTERSECTION_OPTIONS = {
  rootMargin: '400px 0px 400px 0px',
  threshold: 0
};

// 用來快取不同語系的 Formatter (js-index-maps 最佳實踐)
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(locale: string) {
  // 如果 i18n 傳入的語系帶有底線 (例如 zh_TW)，轉換為 BCP 47 標準的連字號 (zh-TW)
  const normalizedLocale = locale.replace('_', '-');
  if (!formatterCache.has(normalizedLocale)) {
    formatterCache.set(normalizedLocale, new Intl.DateTimeFormat(normalizedLocale, { month: 'short', day: 'numeric' }));
  }
  return formatterCache.get(normalizedLocale)!;
}

function AlbumCardComponent({ album, isEven, idx, itemIndex, isAllowedToLoad, onLoaded, locale }: { album: TimelineImage, isEven: boolean, idx: number, itemIndex: number, isAllowedToLoad: boolean, onLoaded: (idx: number) => void, locale: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // 使用 IntersectionObserver 處理獨立卡片的可見性
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting) {
        // 使用 RAF 確保設定狀態不會阻塞當前的滾動渲染幀
        timerRef.current = setTimeout(() => {
          requestAnimationFrame(() => {
            setIsVisible(true);
          });
        }, 300);
      } else {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        setIsVisible(false);
        setIsReady(false);
      }
    }, INTERSECTION_OPTIONS);

    observer.observe(containerRef.current);
    
    return () => {
      observer.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    // 當卡片被標記為可以加載（isAllowedToLoad = true）並且在畫面中，但可能因為網路等因素一直沒載完，給一個 timeout 兜底
    // 避免後面的卡片永遠被卡住
    if (isAllowedToLoad && isVisible && !isReady) {
      const timer = setTimeout(() => {
        onLoaded(itemIndex); // 強制放行下一個
      }, 1500); // 最多等 1.5 秒
      return () => clearTimeout(timer);
    } else if (isAllowedToLoad && !isVisible && !isReady) {
      // 若已被允許加載但不在畫面內 (例如被快速滑過跳轉)，也強制放行下一個
      // 但我們不再將它直接視為 ready，而是讓它保持未載入狀態，直到使用者再次滾動到它
      onLoaded(itemIndex);
    }
  }, [isAllowedToLoad, isVisible, isReady, onLoaded, itemIndex]);

  return (
    <div 
      ref={containerRef}
      className={`relative flex flex-col lg:flex-row items-start lg:items-center w-full ${isEven ? 'lg:justify-start' : 'lg:justify-end'} ${idx > 0 ? 'mt-16 lg:-mt-8 xl:-mt-16' : 'mt-8 lg:mt-0'}`}
    >
      
      {/* 時間軸節點圓點 */}
      <div 
        className={`absolute top-1/2 left-6 lg:left-1/2 w-6 h-6 lg:w-8 lg:h-8 bg-white border-4 border-black rounded-full -translate-x-1/2 -translate-y-1/2 z-10 shadow-[2px_2px_0px_0px_#000] flex items-center justify-center transition-colors duration-300 ${
          isVisible ? 'border-main' : ''
        }`}
      >
        <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
          isVisible ? 'bg-main animate-none' : 'bg-black animate-pulse'
        }`} />
      </div>
      
      {/* 桌面版連接線 */}
      <div className={`hidden lg:block absolute top-1/2 -translate-y-1/2 h-1.5 bg-black/20 z-0 ${isEven ? 'left-[calc(50%-4rem)] w-[4rem] xl:left-[calc(50%-4rem)] xl:w-[4rem]' : 'right-[calc(50%-4rem)] w-[4rem] xl:right-[calc(50%-4rem)] xl:w-[4rem]'}`} />
      <div 
        className={`hidden lg:block absolute top-1/2 -translate-y-1/2 h-1.5 bg-main z-0 will-change-transform ${isEven ? 'left-[calc(50%-4rem)] w-[4rem] xl:left-[calc(50%-4rem)] xl:w-[4rem] origin-right' : 'right-[calc(50%-4rem)] w-[4rem] xl:right-[calc(50%-4rem)] xl:w-[4rem] origin-left'}`}
        style={{ 
          transform: `scaleX(${isVisible ? 1 : 0})`,
          transition: 'transform 0.4s cubic-bezier(0.2, 0, 0, 1)' 
        }}
      />

      {/* 手機版連接線 */}
      <div className="block lg:hidden absolute top-1/2 -translate-y-1/2 left-6 w-[calc(3.5rem-1.5rem)] sm:w-[calc(4rem-1.5rem)] h-1.5 bg-black/20 z-0" />
      <div 
        className="block lg:hidden absolute top-1/2 -translate-y-1/2 left-6 w-[calc(3.5rem-1.5rem)] sm:w-[calc(4rem-1.5rem)] h-1.5 bg-main z-0 origin-left will-change-transform"
        style={{ 
          transform: `scaleX(${isVisible ? 1 : 0})`,
          transition: 'transform 0.4s cubic-bezier(0.2, 0, 0, 1)' 
        }}
      />
      
      {/* 專輯卡片區塊 */}
      <div 
        className={`w-[calc(100%-4.5rem)] max-w-[340px] sm:max-w-none sm:w-[calc(100%-6rem)] lg:w-[calc(50%-4rem)] xl:w-[calc(50%-6rem)] ml-[3.5rem] sm:ml-[4rem] lg:ml-0 ${isEven ? 'xl:ml-[2rem]' : 'xl:mr-[2rem]'} flex flex-col group transition-all duration-700 ease-out ${
          isReady ? 'opacity-100 translate-y-0 delay-100' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* 保持 DOM 結構以避免高度塌陷導致滾動跳動，只卸載 3D Canvas */}
        <div className="w-full relative group/card z-10 hover:z-20">
          <div className="relative w-full rounded-base border-4 border-black bg-card shadow-[4px_4px_0px_0px_#000] sm:shadow-[8px_8px_0px_0px_#000] p-4 sm:py-4 sm:pr-4 sm:pl-6 flex flex-col sm:flex-row gap-3 sm:gap-4 items-center sm:items-start transition-shadow duration-300 hover:shadow-[8px_8px_0px_0px_#000] sm:hover:shadow-[12px_12px_0px_0px_#000]">
            
            {/* 左側：3D 懸浮封面 */}
            <div className="w-full sm:w-32 md:w-40 xl:w-48 shrink-0 relative flex justify-center">
                {/* 手機版限制圖片容器寬度為 70% 抵消 inset-[-20%] 造成的放大溢出，確保左右邊距一致 */}
                {/* -ml-2 將圖片整體向左微調，以抵消 3D 視角中 CD 盒本身偏右的問題 */}
                <a
                    href={getOptimizedAppleMusicUrl(album.originalUrl, 1000, 'webp')}
                    data-fancybox="gallery"
                    data-caption={album.richText}
                    data-download-src={album.originalUrl}
                    data-download-filename={album.rawFilename || album.caption}
                    data-artwork-base-url={album.artworkBaseUrl}
                    className="cursor-zoom-in group block relative w-[70%] sm:w-full h-full -ml-2 sm:-ml-0"
                  >
                <figure className="relative w-full aspect-square flex items-center justify-center group/3d">
                    {/* 保留原圖佔位，確保高度穩定，同時供 Fancybox 抓取縮圖動畫 */}
                    <img 
                      src={getOptimizedAppleMusicUrl(album.originalUrl, 400, 'webp')} 
                      loading="lazy"
                      decoding="async"
                      alt={album.caption}
                      referrerPolicy="no-referrer"
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out opacity-0 pointer-events-none`}
                    />
                    {/* 3D CD 盒效果 - 放大容器避免裁切 */}
                    <div className="absolute inset-[-20%] z-10 pointer-events-none">
                      {isVisible && isAllowedToLoad && (
                        <Suspense fallback={null}>
                          <CDCase3D 
                            imgUrl={getOptimizedAppleMusicUrl(album.originalUrl, 400, 'webp')} 
                            className="w-full h-full pointer-events-auto transition-transform duration-300 group-hover/3d:scale-105" 
                            onReady={() => {
                              setIsReady(true);
                              onLoaded(itemIndex); // 通知父層這個已經載入完了，可以載入下一個
                            }}
                          />
                        </Suspense>
                      )}
                    </div>
                  </figure>
              </a>
            </div>

            {/* 右側：專輯資訊簡介 (靜態) */}
            <div className="flex flex-col w-full text-left justify-center h-full pt-1 sm:pt-0 sm:pl-6">
              <div className="flex flex-wrap items-end gap-3">
                <h3 className="text-lg sm:text-xl lg:text-xl font-black uppercase tracking-tight leading-tight line-clamp-3" lang="ja">{album.caption}</h3>
                <span className="text-[10px] sm:text-xs font-bold opacity-60 uppercase tracking-widest pb-0.5">{album.collectionType}</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <span className="text-xs sm:text-sm font-bold bg-black text-white px-2 py-1 shadow-[2px_2px_0px_0px_var(--main)] rotate-1">
                  {(() => {
                    const parts = album.releaseDateStr.split('-');
                    if (parts.length >= 3) {
                      const y = parseInt(parts[0], 10);
                      const m = parseInt(parts[1], 10) - 1;
                      const d = parseInt(parts[2], 10);
                      return getFormatter(locale).format(new Date(y, m, d));
                    }
                    return album.releaseDateStr;
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

const AlbumCard = React.memo(AlbumCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.album.url === nextProps.album.url &&
    prevProps.isEven === nextProps.isEven &&
    prevProps.isAllowedToLoad === nextProps.isAllowedToLoad &&
    prevProps.idx === nextProps.idx &&
    prevProps.itemIndex === nextProps.itemIndex &&
    prevProps.locale === nextProps.locale
  );
});

const TimelineOverlay = React.memo(({ timelineData, containerRef, lineRef }: { timelineData: any[], containerRef: React.RefObject<HTMLDivElement>, lineRef: React.RefObject<HTMLDivElement> }) => {
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [isTimelineVisible, setIsTimelineVisible] = useState(false);

  // 1. 處理主時間軸滾動進度與年份高亮
  useEffect(() => {
    let ticking = false;
    let frameId: number;
    
    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        frameId = window.requestAnimationFrame(() => {
          // 計算主時間軸進度
          if (containerRef.current && lineRef?.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const lineRect = lineRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            
            // 判斷時間軸是否在可視範圍內 (加上一點緩衝區，確保不會太早消失)
            const isVisible = containerRect.top <= viewportHeight && containerRect.bottom >= 0;
            setIsTimelineVisible(isVisible);
        
            const lineMaxHeight = lineRect.height;
            
            if (lineMaxHeight > 0) {
                // 改為計算整體的滾動比例
                const maxScroll = lineMaxHeight - viewportHeight;
                // 這裡的 scrolled 是線條頂部超出版面的距離（即滾動了多少）
                const scrolled = -lineRect.top;
                
                let progress = 0;
                if (maxScroll > 0) {
                  progress = scrolled / maxScroll;
                } else {
                  progress = 1;
                }
                
                progress = Math.max(0, Math.min(1, progress));
                
                // 批次寫入 CSS 變數，避免多次觸發 Layout/Paint
                containerRef.current.style.cssText = `
                  --scroll-percent: ${progress};
                  --fixed-line-scale: ${progress};
                  --fixed-line-opacity: ${lineRect.top <= 0 && lineRect.bottom > 0 ? '1' : '0'};
                `;
              }
            }

          // 計算目前年份
          let currentYear = timelineData[0]?.year || null;
          for (const group of timelineData) {
            const el = document.getElementById(`year-${group.year}`);
            if (el) {
              const rect = el.getBoundingClientRect();
              if (rect.top <= window.innerHeight / 2) {
                currentYear = group.year;
              }
            }
          }
          if (currentYear && currentYear !== activeYear) {
            setActiveYear(currentYear);
          }
          ticking = false;
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll(); // 初始化

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [timelineData, activeYear, containerRef]);

  return (
    <>
      {/* 年份快速跳轉導航 (所有裝置) - 緊貼主要內容區 */}
      <div className="fixed inset-y-0 left-0 pointer-events-none z-[50] flex justify-center w-full h-full">
        <div className="w-full max-w-7xl max-[1430px]:max-w-[calc(100%-12rem)] max-[1024px]:max-w-[calc(100%-10rem)] max-[768px]:max-w-[80%] relative px-4 h-full">
          <div className={`absolute bottom-0 left-4 max-[768px]:left-0 -translate-x-[calc(100%+1rem)] max-[768px]:translate-x-0 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-[768px]:pb-[calc(4.5rem+env(safe-area-inset-bottom))] flex flex-col items-end max-[768px]:items-start pr-2 md:pr-4 max-[768px]:pl-2 max-[768px]:pr-0 group/nav transition-all duration-300 pointer-events-none ${
            isTimelineVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-8 pointer-events-none'
          }`}>
            <div className="relative pointer-events-auto overflow-visible max-[768px]:-translate-x-[calc(100%+1rem)]">
              {/* 最底層：共用的靜態黑色陰影塊。增加 4px 的偏移量 */}
              <div className="absolute top-[4px] left-[4px] bottom-[-4px] right-[-4px] bg-black pointer-events-none z-0" />
              
              <div className="flex flex-col-reverse relative z-10">
                {/* 因為 flex-col-reverse 會把渲染順序反過來顯示，所以我們先 reverse 陣列，這樣畫面上的「年份順序（大到小）」才會保持正確 */}
                {[...timelineData].reverse().map(({ year }, index) => {
                  // 現在的 index 0 其實是畫面最上面的按鈕，index 最大的是畫面最下面的按鈕
                  const isTopButton = index === timelineData.length - 1;
                  
                  return (
                    <Button
                      key={year}
                      variant="noShadow"
                      size="icon"
                      data-active={activeYear === year}
                      onClick={() => {
                        const el = document.getElementById(`year-${year}`);
                        if (el) {
                          const y = el.getBoundingClientRect().top + window.scrollY - 100;
                          window.scrollTo({ top: y, behavior: 'smooth' });
                        }
                      }}
                      style={{ zIndex: timelineData.length - index }}
                      className={`w-10 h-10 md:w-12 md:h-12 text-xs md:text-sm rounded-none transition-transform duration-150 relative ${
                        !isTopButton ? 'mt-[-2px]' : ''
                      } bg-[#1A1A1A] text-white hover:bg-main hover:text-black data-[active=true]:bg-main data-[active=true]:text-black active:bg-main active:text-black border-2 border-border hover:translate-x-[4px] hover:translate-y-[4px] active:translate-x-[4px] active:translate-y-[4px] data-[active=true]:translate-x-[4px] data-[active=true]:translate-y-[4px]`}
                      aria-label={`Scroll to year ${year}`}
                    >
                      {year.toString().slice(2)}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 垂直時間軸主線 - 原有的背景色與填滿色，恢復原本的邏輯讓它與節點等高 */}
      <div 
        className="absolute left-6 lg:left-1/2 top-0 bottom-12 w-1.5 lg:w-2 bg-main z-10 will-change-transform pointer-events-none origin-top" 
        style={{ 
          transform: `translateX(-50%) scaleY(var(--scroll-percent, 0))`,
          transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      />

      {/* 獨立的固定視窗進度線 (Sticky Line) - 根據您的新思路實作 */}
      {/* 這個外層絕對定位容器用來「裁切」，保證進度線絕對不會畫出背景線的範圍 */}
      <div 
        className="absolute left-6 lg:left-1/2 top-0 bottom-12 w-1.5 lg:w-2 z-[5] pointer-events-none overflow-hidden -translate-x-1/2"
      >
        <div 
          className="fixed top-0 w-full h-screen bg-main will-change-transform origin-top"
          style={{
            transform: 'scaleY(var(--fixed-line-scale, 0))',
            opacity: 'var(--fixed-line-opacity, 0)',
            // 移除不必要的 transition，因為我們已經在 requestAnimationFrame 裡每幀實時更新 CSS 變數了，
            // 加上 transition 反而會造成計算上的互相干擾與動畫延遲。
          }}
        />
      </div>
    </>
  );
});

export function AppleMusicTimeline({ images }: { images: TimelineImage[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language || 'en';

  // 在背景預加載 3D 模型組件，但不阻塞主線程渲染
  useEffect(() => {
    // 利用 requestIdleCallback 或 setTimeout 將 import 放到下一個事件循環
    const prefetch3D = () => import('./CDCase3D');
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(prefetch3D);
    } else {
      setTimeout(prefetch3D, 1000);
    }
  }, []);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // 初始化 Fancybox 綁定
    NativeFancybox.bind(containerRef.current, '[data-fancybox="gallery"]', {
      Thumbs: { type: 'classic' },
      Carousel: {
        infinite: true,
        Toolbar: {
          display: {
            left: ['counter'],
            middle: [],
            right: ['download', 'zoomIn', 'zoomOut', 'toggle1to1', 'slideshow', 'thumbs', 'close']
          },
          items: {
            download: {
              tpl: `<button class="f-button" title="{{DOWNLOAD}}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/></svg></button>`,
              click: () => {
                const api = NativeFancybox.getInstance();
                if (!api) return;
                const slide = api.getSlide();
                if (!slide) return;
                
                const btn = slide.triggerEl as HTMLElement | undefined;
                
                // 優先從 triggerEl 拿，如果沒有就拿 slide 的備用資料
                const originalUrl = btn?.getAttribute('data-download-src') || slide.downloadSrc || slide.src;
                const filename = btn?.getAttribute('data-download-filename') || slide.downloadFilename || 'AppleMusic.jpg';
                const baseUrl = btn?.getAttribute('data-artwork-base-url') || (originalUrl ? originalUrl.replace('100x100bb.jpg', '').replace('10000x10000-999.jpg', '').replace('10000x10000-999.png', '') : '');
                
                // 動態取得副檔名
                const extMatch = originalUrl?.match(/\.([a-zA-Z0-9]+)$/);
                const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';

                if (originalUrl) {
                  // Create a custom dialog for download options
                  // 加入 inline style 確保 z-index 足夠高，並為按鈕指定背景色防止 Tailwind JIT 未掃描到
                  // 使用 Tailwind 的 animate-in / animate-out 來製作進退場動畫
                  const dialogHtml = `
                    <div class="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 ztmy-dl-overlay" style="z-index: 2147483647;" id="ztmy-download-dialog">
                      <div class="border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-sm flex flex-col gap-4 animate-in zoom-in-95 duration-300 ease-out ztmy-dl-content" style="background-color: #d1baff; color: #000000;">
                        <h3 class="text-xl font-black uppercase text-center border-b-2 border-black/10 pb-2">選擇下載畫質</h3>
                        
                        <button class="dl-btn h-12 w-full text-base font-bold text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all" style="background-color: var(--main, #bcff00);" data-url="${originalUrl}" data-name="${filename}">
                          下載原始圖
                        </button>

                        <div class="grid grid-cols-2 gap-2 mt-2">
                          <button class="dl-btn h-10 text-xs font-bold text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all" style="background-color: #ffffff;" data-url="${baseUrl}3000x3000bb.${ext}" data-name="${filename.replace('-999', '3000px')}">3000px</button>
                          <button class="dl-btn h-10 text-xs font-bold text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all" style="background-color: #ffffff;" data-url="${baseUrl}1500x1500bb.${ext}" data-name="${filename.replace('-999', '1500px')}">1500px</button>
                          <button class="dl-btn h-10 text-xs font-bold text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all" style="background-color: #ffffff;" data-url="${baseUrl}1000x1000bb.${ext}" data-name="${filename.replace('-999', '1000px')}">1000px</button>
                          <button class="dl-btn h-10 text-xs font-bold text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all" style="background-color: #ffffff;" data-url="${baseUrl}600x600bb.${ext}" data-name="${filename.replace('-999', '600px')}">600px</button>
                        </div>

                        <button class="mt-2 text-sm font-bold text-black/60 hover:text-black transition-colors underline underline-offset-4 decoration-2 decoration-black/20" id="ztmy-dl-cancel">取消</button>
                      </div>
                    </div>
                  `;
                  
                  // 使用 container 內部插入，避免與 Fancybox z-index context 競爭
                  const fancyboxContainer = document.querySelector('.fancybox__container');
                  const targetContainer = fancyboxContainer || document.body;
                  targetContainer.insertAdjacentHTML('beforeend', dialogHtml);
                  
                  const dialog = document.getElementById('ztmy-download-dialog');
                  if (!dialog) return;

                  let isClosing = false;
                  const closeDialog = () => {
                    if (isClosing) return;
                    isClosing = true;

                    // 觸發退場動畫
                    dialog.classList.remove('animate-in', 'fade-in');
                    dialog.classList.add('animate-out', 'fade-out', 'duration-200');
                    
                    const content = dialog.querySelector('.ztmy-dl-content');
                    if (content) {
                      content.classList.remove('animate-in', 'zoom-in-95');
                      content.classList.add('animate-out', 'zoom-out-95', 'duration-200');
                    }

                    // 等待動畫結束後再清理 DOM
                    setTimeout(() => {
                      // 如果游標還在 dialog 裡面，先把它搬回 container，避免游標跟著 dialog 一起被刪除
                      const cursor = dialog.querySelector('.custom-cursor');
                      if (cursor && fancyboxContainer) {
                        fancyboxContainer.appendChild(cursor);
                      } else if (cursor) {
                        document.body.appendChild(cursor);
                      }
                      dialog.remove();
                    }, 200);
                  };
                  dialog.querySelector('#ztmy-dl-cancel')?.addEventListener('click', closeDialog);
                  dialog.addEventListener('click', (e) => {
                    if (e.target === dialog) closeDialog();
                  });

                  dialog.querySelectorAll('.dl-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                      const target = e.currentTarget as HTMLButtonElement;
                      const url = target.getAttribute('data-url');
                      const name = target.getAttribute('data-name');
                      if (url && name) {
                        try {
                          const response = await fetch(url);
                          const blob = await response.blob();
                          const objectUrl = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = objectUrl;
                          a.download = name;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(objectUrl);
                        } catch (err) {
                          window.open(url, '_blank');
                        }
                      }
                      closeDialog();
                    });
                  });
                }
              }
            }
          }
        },
      },
      Toolbar: {
        display: {
          left: ['counter'],
          middle: [],
          right: ['download', 'zoomIn', 'zoomOut', 'toggle1to1', 'slideshow', 'thumbs', 'close']
        },
      },
      on: {
        ready: (api) => {
          const container = api?.getContainer?.() as HTMLElement | undefined;
          if (!container) return;

          // 注入靜態提示於 Toolbar 下方
          const hint = document.createElement('div');
          hint.className = "absolute top-14 sm:top-16 left-0 right-2 sm:right-4 text-white/70 text-[10px] sm:text-xs flex justify-end items-center pt-2 sm:pt-4 py-1 font-mono tracking-tighter md:tracking-widest pointer-events-none z-50 transition-opacity duration-300 opacity-100 ztmy-hint drop-shadow-md";
          hint.innerHTML = `<span class="flex items-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"><i class="hn hn-apple mr-1"></i><span class="whitespace-nowrap">${t('timeline.gallery_hint', 'High-res artwork sourced from Apple Music')}</span></span>`;
          container.appendChild(hint);

          // 注入自動隱藏邏輯 (MutationObserver)
          const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            for (const m of mutations) {
              const target = m.target as HTMLElement;
              if (target.classList && (target.classList.contains('f-panzoom__wrapper') || target.classList.contains('f-thumbs'))) {
                shouldUpdate = true;
                break;
              }
            }

            if (!shouldUpdate) return;

            let zooming = false;
            const wrappers = container.getElementsByClassName('f-panzoom__wrapper');
            for (let i = 0; i < wrappers.length; i++) {
              if (wrappers[i].classList.contains('can-drag') || wrappers[i].classList.contains('will-zoom-out')) {
                zooming = true;
                break;
              }
            }

            const hasClass = container.classList.contains('ztmy-is-zooming');
            if (zooming && !hasClass) {
              container.classList.add('ztmy-is-zooming');
            } else if (!zooming && hasClass) {
              container.classList.remove('ztmy-is-zooming');
            }
          });

          observer.observe(container, { attributes: true, subtree: true, attributeFilter: ['class'] });

          (api as any).__ztmyObserver = observer;
        },
        destroy: (api) => {
          const observer = (api as any).__ztmyObserver;
          if (observer) {
            observer.disconnect();
          }
        }
      }
    });

    return () => {
      NativeFancybox.unbind(containerRef.current);
      NativeFancybox.close();
    };
  }, [t, currentLocale]);

  const timelineData = useMemo(() => {
    // 依年份分組
    const groups: Record<number, TimelineImage[]> = {};
    for (let i = 0; i < images.length; i++) {
      const img = { ...images[i] };
      
      // 取得真實副檔名
      const extMatch = img.originalUrl?.match(/\.([a-zA-Z0-9]+)$/);
      const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';

      if (!img.rawFilename && img.caption) {
        img.rawFilename = `AppleMusic_${img.caption.replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]/g, '_')}_-999.${ext}`;
      }
      if (img.originalUrl && !img.artworkBaseUrl) {
        img.artworkBaseUrl = img.originalUrl.replace('100x100bb.jpg', '').replace('10000x10000-999.jpg', '').replace(`10000x10000-999.${ext}`, '');
      }
      if (!groups[img.year]) groups[img.year] = [];
      groups[img.year].push(img);
    }
    
    // 將年份排序 (由新到舊)
    const years = Object.keys(groups).map(Number).sort((a, b) => b - a);
    const result = new Array(years.length);
    
    for (let i = 0; i < years.length; i++) {
      const year = years[i];
      // 每個年份內的專輯依據發行日期由新到舊排序
      // 我們在上一層已經將 releaseDateStr 格式化為 YYYY-MM-DD，所以可以直接做字串比較，
      // 省去大量 new Date().getTime() 的高昂計算成本
      const sortedAlbums = groups[year].sort((a, b) => {
        if (a.releaseDateStr > b.releaseDateStr) return -1;
        if (a.releaseDateStr < b.releaseDateStr) return 1;
        return 0;
      });
      
      result[i] = { year, albums: sortedAlbums };
    }
    
    return result;
  }, [images]);

  // 用來追蹤「已經被允許加載」的卡片數量（依序加載機制）
  const [loadedCount, setLoadedCount] = useState(0);

  const handleLoaded = React.useCallback((itemIndex: number) => {
    setLoadedCount(prev => Math.max(prev, itemIndex + 1));
  }, []);

  let globalIndex = 0; // 用於控制左右交替的版面

  return (
    <>
      <style>{`
        /* Auto hide native elements on idle/zoom for AppleMusicTimeline */
        .fancybox__container.ztmy-is-zooming .fancybox__toolbar,
        .fancybox__container.ztmy-is-zooming .fancybox__nav,
        .fancybox__container.ztmy-is-zooming .f-thumbs,
        .fancybox__container.ztmy-is-zooming .ztmy-hint,
        .fancybox__container.ztmy-is-zooming .fancybox__caption {
          opacity: 0 !important;
          pointer-events: none !important;
        }
        
        .fancybox__container.ztmy-is-zooming .f-thumbs {
          max-height: 0 !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          margin-top: 0 !important;
          overflow: hidden !important;
        }

        .f-thumbs, .fancybox__caption {
          transition: opacity 0.2s ease, max-height 0.2s ease, padding 0.2s ease, margin 0.2s ease !important;
        }
      `}</style>
      
      <div className="w-full max-w-7xl mx-auto py-12 px-0 lg:px-4 xl:px-0 flex flex-col items-start overflow-visible" ref={containerRef}>
        
        {/* 時間軸主內容區塊 */}
        <div className="relative flex-1 w-full max-w-7xl mx-auto">
        {/* 中間的垂直進度線 */}
        <div ref={lineRef} className="absolute left-6 lg:left-1/2 top-0 bottom-12 w-1.5 lg:w-2 bg-black/20 z-0 -translate-x-1/2" />
        
        <TimelineOverlay timelineData={timelineData} containerRef={containerRef} lineRef={lineRef} />
        
        <div className="w-full relative">
            {timelineData.map(({ year, albums }, index) => (
              <div key={year} id={`year-${year}`} className={`relative mb-16 lg:mb-24 scroll-mt-24 w-full group flex flex-col items-start lg:items-stretch ${index === 0 ? 'pt-[calc(4.5rem-2rem)] lg:pt-20 mt-[calc(-4.5rem+2rem)] lg:mt-[-5rem]' : ''}`}>
                {/* 年份節點 */}
                <div 
                  className={`absolute left-6 lg:left-1/2 w-4 h-4 bg-black rounded-none border-2 border-main flex items-center justify-center shadow-[2px_2px_0px_0px_#000] z-20 group-hover:scale-125 group-hover:bg-main transition-all duration-300 -translate-x-1/2 ${index === 0 ? 'top-[calc(4.5rem-0.5rem)] lg:top-20' : 'top-4 lg:top-0'}`}
                />
                {/* 年份標籤 (Neobrutalism 風格) */}
                <div className="sticky top-[4.5rem] lg:top-20 z-20 flex justify-start lg:justify-center mb-8 lg:mb-16 ml-[calc(1.5rem-12px)] lg:ml-0 self-start w-full lg:w-full">
                <div className="bg-main text-black px-6 py-2 border-2 border-black shadow-[4px_4px_0px_0px_#000] transform -rotate-2 hover:rotate-0 transition-transform cursor-default flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span className="text-2xl font-black tracking-widest">{year}</span>
                </div>
              </div>

            <div className="flex flex-col w-full">
              {albums.map((album, idx) => {
                const isEven = globalIndex % 2 === 0;
                const itemIndex = globalIndex;
                globalIndex++;
                
                return (
                  <AlbumCard 
                    key={album.url} 
                    album={album} 
                    isEven={isEven} 
                    idx={idx} 
                    itemIndex={itemIndex}
                    isAllowedToLoad={itemIndex <= loadedCount + 2} // 允許前 2 個預加載
                    onLoaded={handleLoaded}
                    locale={currentLocale}
                  />
                );
              })}
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
    </>
  );
}

