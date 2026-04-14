import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button';
import { MVItem, MVImage } from '@/lib/types';
import { getProxyImgUrl, ProxyMode } from '@/lib/image';
import { MasonryPhotoAlbum } from "react-photo-album";
import "react-photo-album/masonry.css";
import { Gallery, Item } from 'react-photoswipe-gallery';
import 'photoswipe/style.css';
import PhotoSwipeDynamicCaption from 'photoswipe-dynamic-caption-plugin';
import 'photoswipe-dynamic-caption-plugin/photoswipe-dynamic-caption-plugin.css';
import './MVDetailsModal.css';

// 像素風圖標組件庫
const PixelPlay = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M6 4h2v2H6V4zm2 2h2v2H8V6zm2 2h2v2h-2V8zm2 2h2v2h-2v-2zm-2 2h2v2h-2v-2zm-2 2h2v2H8v-2zm-2 2h2v2H6v-2z" />
  </svg>
);

const PixelX = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M4 4h2v2H4V4zm2 2h2v2H6V6zm2 2h2v2H8V8zm2 2h4v2h-4v-2zm4-2h2v2h-2V8zm2-2h2v2h-2V6zm2-2h2v2h-2V4zM4 20h2v-2H4v2zm2-2h2v-2H6v2zm2-2h2v-2H8v2zm8 0h2v-2h-2v2zm2 2h2v-2h-2v2zm2 2h2v-2h-2v2z" />
  </svg>
);

const PixelYoutube = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M2 5h20v14H2V5zm2 2v10h16V7H4zm6 2l6 3-6 3V9z" />
  </svg>
);

const PixelTV = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M3 5h18v12H3V5zm2 2v8h14V7H5zM8 2l2 2h4l2-2h2v2h-2l-2 2H10L8 4H6V2h2z" />
  </svg>
);

const PixelGallery = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M2 4h20v16H2V4zm2 2v12h16V6H4zm2 2h4v4H6V8zm6 4h6v2h-6v-2zm0-4h6v2h-6V8z" />
  </svg>
);

const PixelPlus = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4z" />
  </svg>
);

interface MVDetailsModalProps {
  mv: MVItem | null;
  onClose: () => void;
}


export function MVDetailsModal({ mv, onClose }: MVDetailsModalProps) {
 // 分批加載狀態
  const [displayLimit, setDisplayLimit] = useState(8);

  // 影片播放狀態
  const [videoPlatform, setVideoPlatform] = useState<'youtube' | 'bilibili'>('bilibili');
  const [isVideoActivated, setIsVideoActivated] = useState(false);

  // 當切換影片時重置顯示數量
  useEffect(() => {
    setDisplayLimit(8);
    setIsVideoActivated(false);
    // 預設選擇有資料的平台
    if (mv?.bilibili) setVideoPlatform('bilibili');
    else if (mv?.youtube) setVideoPlatform('youtube');
  }, [mv?.id]);

  const visibleImages = useMemo(() => {
    return mv?.images?.slice(0, displayLimit) || [];
  }, [mv?.images, displayLimit]);

  // 轉換格式以符合 react-photo-album 要求
  const photos = useMemo(() => {
    return visibleImages.map((img) => ({
      ...img,
      src: getProxyImgUrl(img.url, 'thumb'),
      width: img.width || 1600,
      height: img.height || 1200,
      key: img.url,
    }));
  }, [visibleImages]);

  // 使用 PhotoAlbum v3 的 renderPhoto 邏輯進行重構
  const renderPhoto = useCallback(({ 
    photo, 
    wrapperStyle, 
    renderDefaultPhoto 
  }: any) => (
    <div style={{ ...wrapperStyle, position: "relative" }}>
      <Item
        original={getProxyImgUrl(photo.url, 'full')}
        thumbnail={photo.src}
        width={photo.width}
        height={photo.height}
      >
        {({ ref, open }) => (
          <div
            ref={ref as React.MutableRefObject<HTMLDivElement>}
            onClick={(e) => {
              e.preventDefault();
              open(e);
            }}
            className="cursor-zoom-in overflow-hidden border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 transition-all group bg-secondary-background"
            data-raw-src={photo.url}
            data-caption={photo.caption || ''}
          >
            {/* 使用 PhotoAlbum 內置渲染以獲取 srcset 支持 */}
            {renderDefaultPhoto({ wrapped: true })}
            
            {/* PhotoSwipe 插件標題容器 */}
            <div className="pswp-caption-content hidden">
              <div className="font-black text-[10px] uppercase tracking-widest text-main bg-black px-2 py-0.5 mb-2 inline-block">Asset_Metadata_Source</div>
              {photo.richText ? (
                <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: photo.richText }} />
              ) : (
                <div className="font-bold">{photo.caption}</div>
              )}
            </div>
          </div>
        )}
      </Item>
    </div>
  ), []);

  // 手動加載更多圖片
  const handleLoadMore = () => setDisplayLimit(prev => prev + 8);

  // 自定義 UI 元素配置 (下載按鈕)
  const uiElements = [
    {
      name: 'download-button',
      order: 8,
      isButton: true,
      tagName: 'a',
      html: '<svg aria-hidden="true" class="pswp__icn" viewBox="0 0 32 32" width="32" height="32"><path d="M20.5 14.3 17.1 18V10h-2.2v7.9l-3.4-3.6L10 16l6 6.1 6-6.1ZM23 23H9v2h14Z" /></svg>',
      onInit: (el: HTMLAnchorElement, pswpInstance: any) => {
        el.title = '下載原圖 (RAW)';
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener');
        el.setAttribute('download', '');

        const updateDownloadHref = () => {
          const currSlide = pswpInstance.currSlide;
          const element = currSlide?.data.element as HTMLElement;
          const rawSrc = element?.getAttribute('data-raw-src');
          const caption = element?.getAttribute('data-caption') || 'ztmy-asset';
          if (rawSrc) {
            el.href = getProxyImgUrl(rawSrc, 'raw', caption);
          }
        };

        pswpInstance.on('change', updateDownloadHref);
        pswpInstance.on('contentActivate', updateDownloadHref);
      }
    }
  ];

  return (
    <Dialog open={!!mv} onOpenChange={(open) => !open && onClose()}>
        <DialogContent 
          className="max-w-none crt-lines crt-scanline border-none"
          // 防止點擊燈箱背景時觸發 Radix 的「點擊外部關閉」邏輯，這會導致衝突
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
        <DialogHeader className="relative z-30 pt-10 px-8 pb-6 border-b-4 border-border">
          <DialogClose className="absolute top-6 right-8 z-50 bg-white text-black border-3 border-black p-2 shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all">
            <PixelX className="size-6" />
          </DialogClose>
          
          <DialogTitle className="text-2xl pr-16 hover:animate-glitch cursor-default transition-colors hover:text-main uppercase tracking-tighter font-black">

              {mv?.title}
          </DialogTitle>
                <DialogDescription asChild className="mt-2">
            <div className="flex flex-wrap gap-3 opacity-80 italic text-sm font-bold">
   
               {mv?.keywords?.map(k => <span key={k}>#{k}</span>)}
            </div>
          </DialogDescription>
        </DialogHeader>
             <div className="flex-1 overflow-y-auto px-8 py-12 custom-scrollbar relative z-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-screen-2xl mx-auto">
   
              {/* 影片播放區 */}
             {/* 計算高度：100vh - Header(約160px) - 上下Padding(96px) - 緩衝 = 約 280px */}
             <div className="space-y-4 lg:sticky lg:top-0 lg:h-[calc(100vh-240px)] flex flex-col">
                <div className="aspect-video border-4 border-black shadow-shadow bg-black overflow-hidden relative group isolate">
                  {!isVideoActivated ? (
                    /* 播放遮罩 (Mask) */
                    <div 
                      className="absolute inset-0 z-20 cursor-pointer flex items-center justify-center overflow-hidden"
                      onClick={() => setIsVideoActivated(true)}
                    >
                      {/* 封面背景圖 - 基礎層 */}
                      <div 
                        className="glitch-base absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                        style={{ backgroundImage: `url(${getProxyImgUrl(mv?.coverImages?.[0] || '', 'small')})` }}
                      />

                      {/* Glitch 疊加層 (僅在 hover 時顯示) */}
                      <div 
                        className="glitch-layer glitch-red absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${getProxyImgUrl(mv?.coverImages?.[0] || '', 'small')})` }}
                      />
                      <div 
                        className="glitch-layer glitch-blue absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${getProxyImgUrl(mv?.coverImages?.[0] || '', 'small')})` }}
                      />

                      {/* 黑色疊加層與 CRT 線條 */}
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors z-10" />
                      <div className="absolute inset-0 opacity-20 pointer-events-none crt-lines z-15"></div>
                      
                      {/* 播放按鈕 UI */}
                      <div className="relative z-40 flex flex-col items-center gap-4">
                        <div className="bg-main p-6 rounded-full shadow-neo transform transition-transform group-hover:scale-110 active:scale-95 border-4 border-black">
                          <PixelPlay className="size-12 text-black" />
                        </div>
                        <span className="glitch-text text-white font-black tracking-widest text-[10px] bg-black px-4 py-1 border-2 border-main uppercase">
                          Initialize_Signal_Stream
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* 實際加載 iframe */
                    <div className="w-full h-full">
                      {videoPlatform === 'youtube' && mv?.youtube ? (
                        <iframe 
                          src={`https://www.youtube.com/embed/${mv.youtube}?autoplay=1&rel=0`}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={mv.title}
                        />
                      ) : (
                        <iframe 
                          src={`//player.bilibili.com/player.html?bvid=${mv?.bilibili}&page=1&high_quality=1&autoplay=1`}
                          className="w-full h-full"
                          scrolling="no" frameBorder="0" allowFullScreen
                        />
                      )}
                    </div>
                  )}
               </div>

               {/* 平台切換按鈕 */}
               <div className="flex gap-2">
                {mv?.bilibili && (
                   <Button 
                     variant={videoPlatform === 'bilibili' ? 'default' : 'neutral'}
                     className={`flex-1 gap-2 font-black text-xs ${videoPlatform === 'bilibili' ? 'bg-[#00aeec] text-white border-3 border-black' : 'opacity-50'}`}
                     onClick={() => { setVideoPlatform('bilibili'); setIsVideoActivated(false); }}
                   >
                     <PixelTV className="size-5" /> BILIBILI
                   </Button>
                 )}
                 {mv?.youtube && (
                   <Button 
                     variant={videoPlatform === 'youtube' ? 'default' : 'neutral'}
                     className={`flex-1 gap-2 font-black text-xs ${videoPlatform === 'youtube' ? 'bg-main text-black border-3 border-black' : 'opacity-50'}`}
                     onClick={() => { setVideoPlatform('youtube'); setIsVideoActivated(false); }}
                   >
                     <PixelYoutube className="size-5" /> YOUTUBE
                   </Button>
                 )}
                 
               </div>

               <div className="p-8 bg-card border-4 border-border shadow-shadow flex-1 overflow-y-auto custom-scrollbar">
                 <h4 className="text-xs font-black uppercase tracking-widest text-main mb-6 opacity-50 border-b-2 border-border pb-2 inline-block">File_Description_v3.0</h4>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap opacity-90 font-base">{mv?.description}</p>
               </div>
             </div>

             {/* 設定圖畫廊區 */}
             <div className="space-y-4">
                <h4 className="font-bold border-b-3 border-black pb-2 flex items-center gap-2 uppercase tracking-widest">
                  <PixelGallery className="size-5 text-ztmy-green" /> 設定資料圖
                </h4>
                {mv?.images && visibleImages.length > 0 ? (
                  <>
                    <Gallery
                      onBeforeOpen={(pswp) => {
                        document.body.style.pointerEvents = 'auto';
                      }}
                      onDestroy={() => {
                        document.body.style.pointerEvents = '';
                      }}
                      plugins={(lightbox) => {
                        new PhotoSwipeDynamicCaption(lightbox, { type: 'auto' });
                      }}
                      uiElements={uiElements}
                    >
                      <MasonryPhotoAlbum
                        photos={photos}
                        columns={(containerWidth) => {
                          if (containerWidth < 640) return 2;
                          if (containerWidth < 1024) return 2;
                          return 4;
                        }}
                        spacing={16}
                        renderPhoto={renderPhoto}
                      />
                    </Gallery>
                    
                    {/* 手動加載控制項 */}
                    {displayLimit < (mv.images?.length || 0) && (
                      <div className="py-12 flex flex-col items-center gap-4 border-t-2 border-black/5 mt-8">
                        <Button 
                          variant="neutral" 
                          onClick={handleLoadMore}
                          className="w-full sm:w-auto bg-ztmy-green/5 border-3 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all font-black text-xs h-12 px-8 uppercase"
                        >
                          <PixelPlus className="size-5 mr-2 text-ztmy-green" />
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
