import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { X } from "lucide-react"
import { Button } from '@/components/ui/button';
import { MVItem } from '@/lib/types';
import { getProxyImgUrl, ProxyMode } from '@/lib/image';
import Masonry from 'react-masonry-css';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import 'photoswipe/style.css';

interface MVDetailsModalProps {
  mv: MVItem | null;
  onClose: () => void;
}

// 內部使用的圖片組件，處理加載狀態與 Neo-brutalism 骨架屏
function GalleryItem({ img, index, getProxyImgUrl }: { 
  img: any; 
  index: number; 
  getProxyImgUrl: (rawUrl: string, mode?: ProxyMode) => string 
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <a 
      href={getProxyImgUrl(img.url, 'full')}
      data-pswp-width={img.width || 1600}
      data-pswp-height={img.height || 1200}
      target="_blank"
      data-raw-src={img.url}
      data-caption={img.caption || ''}
      rel="noreferrer"
      className="pswp-item block mb-4 border-2 border-black overflow-hidden cursor-zoom-in group relative bg-secondary-background"
    >
      {!isLoaded && (
        <div className="absolute inset-0 bg-main/5 animate-pulse flex flex-col items-center justify-center gap-2 z-10">
          <div className="size-6 border-2 border-black/10 border-t-black animate-spin rounded-full" />
          <span className="text-[8px] font-black opacity-20 uppercase font-mono tracking-widest">Asset_Loading...</span>
        </div>
      )}
      <img 
        src={getProxyImgUrl(img.url, 'thumb')} 
        alt={img.alt || `setting-${index}`}
        onLoad={() => setIsLoaded(true)}
        style={{ aspectRatio: img.width && img.height ? `${img.width}/${img.height}` : 'auto' }}
        className={`w-full h-auto block transition-all duration-700 group-hover:scale-105 ${isLoaded ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-2xl scale-110'}`}
      />
      {img.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[10px] p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity z-20">
          {img.caption}
        </div>
      )}
    </a>
  );
}

export function MVDetailsModal({ mv, onClose }: MVDetailsModalProps) {
  // Masonry 響應式斷點配置
  const breakpointColumnsObj = {
    default: 4,
    1024: 3,
    640: 2
  };

  const galleryRef = useRef<HTMLDivElement>(null);

  // 分批加載狀態 (初始 12 張)
  const [displayLimit, setDisplayLimit] = useState(12);

  // 當切換影片時重置顯示數量
  useEffect(() => {
    setDisplayLimit(12);
  }, [mv?.id]);

  const visibleImages = useMemo(() => {
    return mv?.images?.slice(0, displayLimit) || [];
  }, [mv?.images, displayLimit]);

  // 手動加載更多圖片
  const handleLoadMore = () => setDisplayLimit(prev => prev + 12);

  // 初始化 PhotoSwipe
  useEffect(() => {
    // 稍微延遲以確保 Dialog 內容已掛載到 DOM
    const timer = setTimeout(() => {
      if (!mv || !mv.images?.length || !galleryRef.current) return;

      const lightbox = new PhotoSwipeLightbox({
        gallery: galleryRef.current,
        children: 'a.pswp-item',
        pswpModule: () => import('photoswipe'),
      });

      // 修復：當燈箱開啟時，暫時允許 body 的交互
      // 否則 Radix Dialog 的 pointer-events: none 會導致燈箱 UI 無法點擊
      lightbox.on('beforeOpen', () => {
        document.body.style.pointerEvents = 'auto';
      });

      lightbox.on('destroy', () => {
        // 燈箱關閉時恢復由 Radix 管理的狀態
        document.body.style.pointerEvents = '';
      });

      // 註冊下載按鈕
      lightbox.on('uiRegister', () => {
        const pswp = lightbox.pswp;
        if (!pswp) return;
        
        pswp.ui.registerElement({
          name: 'download-button',
          order: 8,
          isButton: true,
          tagName: 'a',
          html: '<svg aria-hidden="true" class="pswp__icn" viewBox="0 0 32 32" width="32" height="32"><use class="pswp__icn-shadow" xlink:href="#pswp__button--download-button"></use><path d="M20.5 14.3 17.1 18V10h-2.2v7.9l-3.4-3.6L10 16l6 6.1 6-6.1ZM23 23H9v2h14Z" /></svg>',
          onInit: (el, pswpInstance) => {
            const a = el as HTMLAnchorElement;
            a.title = '下載原圖 (RAW)';
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener');
            a.setAttribute('download', '');

            const updateDownloadHref = () => {
              const currSlide = pswpInstance.currSlide;
              const element = currSlide?.data.element as HTMLElement;
              const rawSrc = element?.getAttribute('data-raw-src');
              const caption = element?.getAttribute('data-caption') || 'ztmy-asset';
              if (rawSrc) {
                a.href = getProxyImgUrl(rawSrc, 'raw', caption);
              }
            };

            pswpInstance.on('change', updateDownloadHref);
            // 確保燈箱開啟時第一張圖的連結即被正確初始化
            pswpInstance.on('contentActivate', updateDownloadHref);
          }
        });
      });

      lightbox.init();

      return () => {
        lightbox.destroy();
      };
    }, 100);

    return () => clearTimeout(timer);
  }, [mv]);

  return (
    <Dialog open={!!mv} onOpenChange={(open) => !open && onClose()}>
        <DialogContent 
          className="max-w-none crt-lines crt-scanline border-none"
          // 防止點擊燈箱背景時觸發 Radix 的「點擊外部關閉」邏輯，這會導致衝突
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <style>{`
            .pswp { z-index: 10000 !important; }
          `}</style>
        <DialogHeader className="relative z-30 pt-10 px-8 pb-6 border-b-4 border-border">
          <DialogClose className="absolute top-6 right-8 z-50 bg-white text-black border-3 border-black p-2 shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all">
            <X className="size-6" />
          </DialogClose>
          
          <DialogTitle className="text-5xl pr-16 hover:animate-glitch cursor-default transition-colors hover:text-main uppercase tracking-tighter font-black">

              {mv?.title}
          </DialogTitle>
                <DialogDescription asChild className="mt-4">
            <div className="flex flex-wrap gap-3 opacity-80 italic text-sm font-bold">
   
               {mv?.keywords?.map(k => <span key={k}>#{k}</span>)}
            </div>
          </DialogDescription>
        </DialogHeader>
             <div className="flex-1 overflow-y-auto px-8 py-12 custom-scrollbar relative z-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-screen-2xl mx-auto">
   
              {/* 影片播放區 */}
             <div className="space-y-4">
                         <div className="aspect-video border-4 border-border shadow-shadow bg-black overflow-hidden relative group isolate">
                 <div className="absolute inset-0 bg-main/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"></div>
      
                            {mv?.youtube && (
                   <iframe 
                     src={`https://www.youtube.com/embed/${mv.youtube}?autoplay=1`}
                     className="w-full h-full"
                     allowFullScreen
                     title={mv.title}
                   ></iframe>
                 )}
               </div>
               <div className="p-8 bg-card border-4 border-border shadow-shadow">
                 <h4 className="text-xs font-black uppercase tracking-widest text-main mb-6 opacity-50 border-b-2 border-border pb-2 inline-block">File_Description_v3.0</h4>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap opacity-90 font-base">{mv?.description}</p>
               </div>
             </div>

             {/* 設定圖畫廊區 */}
             <div className="space-y-4">
                <h4 className="font-bold border-b-3 border-black pb-2 flex items-center gap-2 uppercase tracking-widest">
                  <i className="fa-solid fa-image text-ztmy-green"></i> 設定資料圖
                </h4>
                {mv?.images && visibleImages.length > 0 ? (
                  <>
                    <div ref={galleryRef}>
                      <Masonry
                        breakpointCols={breakpointColumnsObj}
                        className="flex -ml-4 w-auto"
                        columnClassName="pl-4 bg-clip-padding"
                      >
                      {visibleImages.map((img, index) => (
                        <GalleryItem 
                          key={`${mv?.id}-${index}`}
                          img={img}
                          index={index}
                          getProxyImgUrl={getProxyImgUrl}
                        />
                      ))}
                      </Masonry>
                    </div>
                    
                    {/* 手動加載控制項 */}
                    {displayLimit < (mv.images?.length || 0) && (
                      <div className="py-12 flex flex-col items-center gap-4 border-t-2 border-black/5 mt-8">
                        <Button 
                          variant="neutral" 
                          onClick={handleLoadMore}
                          className="w-full sm:w-auto bg-ztmy-green/5 border-3 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all font-black text-xs h-12 px-8 uppercase"
                        >
                          <i className="fa-solid fa-plus-circle mr-2 text-ztmy-green"></i>
                          LOAD_MORE_IMAGE_ASSETS ({displayLimit} / {mv.images.length})
                        </Button>
                        <span className="text-[10px] opacity-30 font-bold uppercase tracking-[0.2em]">End_Of_Buffered_Content</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm opacity-50 italic text-center py-10 border-2 border-dashed border-white/5">
                    暫無設定圖資料
                  </p>
                )}
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
