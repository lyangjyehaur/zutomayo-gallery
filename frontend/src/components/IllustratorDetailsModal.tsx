import React, { useMemo, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { MODAL_THEME } from '@/lib/theme';
import { useTranslation } from 'react-i18next';
import { MVItem, ArtistMeta } from '@/lib/types';
import { useLazyImage } from '@/hooks/useLazyImage';
import FancyboxViewer from '@/components/FancyboxViewer';

interface IllustratorDetailsModalProps {
  illustrator: { name: string; snsId?: string; mvs: MVItem[]; meta?: ArtistMeta } | null;
  onClose: () => void;
}

const MasonryImage = ({ item, index, mvTitle }: { item: any, index: number, mvTitle: string }) => {
  const { elementRef, shouldLoad } = useLazyImage({
    rootMargin: '300px',
    threshold: 0,
    triggerOnce: true,
  });

  return (
    <div 
      ref={elementRef}
      className="border-4 border-black bg-card shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:-translate-y-1 group-hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 relative overflow-hidden h-full"
    >
      {shouldLoad ? (
        <>
          <img 
            src={item.thumbnail || item.url} 
            alt={item.caption || item.alt || mvTitle} 
            className="w-full h-auto object-cover border-b-4 border-black bg-white"
            loading="lazy"
          />
          <div className="p-3 bg-card flex flex-col gap-1 relative z-10">
            <span className="text-sm font-black truncate">{item.caption || 'Artwork'}</span>
            <div className="flex justify-between items-center text-[10px] font-mono opacity-70">
              <span className="bg-black/10 px-1 truncate max-w-[90%]" title={mvTitle}>{mvTitle}</span>
            </div>
          </div>
          {/* Glitch Overlay Effect on Hover */}
          <div className="absolute inset-0 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 ztmy-noise-pop"></div>
          
          {/* Video Icon Indicator */}
          {(item.url?.match(/\.(mp4|webm)$/i) || item.url?.includes('video.twimg.com') || (item.thumbnail && item.thumbnail !== item.url && !item.url.match(/\.gif$/i))) && (
            <div className="absolute top-2 left-2 bg-black/70 text-white p-1.5 border border-white/20 shadow-sm z-30 pointer-events-none">
              <i className="hn hn-play-solid text-xs"></i>
            </div>
          )}
          
          {/* GIF Icon Indicator */}
          {(item.url?.match(/\.gif$/i) || item.url?.includes('tweet_video_thumb')) && (
            <div className="absolute top-2 left-2 bg-black/70 text-white px-1.5 py-0.5 border border-white/20 shadow-sm z-30 pointer-events-none">
              <span className="font-black text-[10px] tracking-widest">GIF</span>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-64 bg-black/5 animate-pulse flex items-center justify-center">
          <i className="hn hn-image text-4xl opacity-20"></i>
        </div>
      )}
    </div>
  );
};

export function IllustratorDetailsModal({ illustrator, onClose }: IllustratorDetailsModalProps) {
  const { t } = useTranslation();
  const collabs = useMemo(() => {
    return illustrator?.meta?.collaborations || [];
  }, [illustrator]);

  const [activeTab, setActiveTab] = useState<'collab' | 'mv'>(collabs.length > 0 ? 'collab' : 'mv');

  useEffect(() => {
    if (illustrator) {
      const c = illustrator?.meta?.collaborations || [];
      setActiveTab(c.length > 0 ? 'collab' : 'mv');
    }
  }, [illustrator]);

  // Extract all images from the illustrator's MVs as mock FanArt/Artworks
  const artworks = useMemo(() => {
    if (!illustrator) return [];
    const imgs: { item: any, mvTitle: string }[] = [];
    illustrator.mvs.forEach(mv => {
      mv.images?.forEach(img => {
        imgs.push({ item: img, mvTitle: mv.title });
      });
    });
    return imgs.length > 0 ? imgs : [];
  }, [illustrator]);

  const currentDisplayImages = activeTab === 'mv' ? artworks : collabs;

  const [visibleCount, setVisibleCount] = useState(20);
  
  // 處理切換標籤時重置載入數量
  useEffect(() => {
    setVisibleCount(20);
  }, [activeTab, illustrator]);

  // 滾動加載更多
  useEffect(() => {
    const scrollViewport = document.querySelector('#illustrator-scroll-area [data-radix-scroll-area-viewport]');
    if (!scrollViewport) return;

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      const { scrollTop, scrollHeight, clientHeight } = target;
      if (scrollHeight - scrollTop - clientHeight < 400) {
        setVisibleCount(prev => {
          const next = prev + 20;
          return next > currentDisplayImages.length ? currentDisplayImages.length : next;
        });
      }
    };

    scrollViewport.addEventListener('scroll', handleScroll);
    return () => scrollViewport.removeEventListener('scroll', handleScroll);
  }, [currentDisplayImages.length]);

  if (!illustrator) return null;

  return (
    <Dialog open={!!illustrator} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        overlayClassName={MODAL_THEME.overlay.dialog}
        className={`w-screen h-[100dvh] max-w-none md:max-w-[80vw] lg:max-w-[1200px] md:w-full md:h-[90vh] md:max-h-[90vh] overflow-hidden flex flex-col p-0 border-0 md:border-4 border-black ${MODAL_THEME.content.dialog} sm:rounded-none rounded-none shadow-none md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] fixed top-0 left-0 md:top-[50%] md:left-[50%] !translate-x-0 !translate-y-0 md:!translate-x-[-50%] md:!translate-y-[-50%] z-[100] [&>button]:hidden`}
        onPointerDownOutside={(e) => {
          if (document.body.classList.contains('fancybox__body') || document.querySelector('.fancybox__container')) {
            e.preventDefault();
            return;
          }
        }}
        onInteractOutside={(e) => {
          if (document.body.classList.contains('fancybox__body') || document.querySelector('.fancybox__container')) {
            e.preventDefault();
            return;
          }
        }}
        onEscapeKeyDown={(e) => {
          if (document.body.classList.contains('fancybox__body') || document.querySelector('.fancybox__container')) {
            e.preventDefault();
            return;
          }
        }}
      >
        <div className={MODAL_THEME.crt}></div>

        {/* Sticky Header */}
        <div className="p-4 md:p-8 md:pb-6 relative z-10 bg-card border-b-4 border-black shrink-0">
          <DialogHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 w-full">
            <div className="flex flex-col gap-2 max-w-[80%]">
              <DialogTitle className="text-3xl md:text-5xl font-black tracking-tighter uppercase break-words leading-none" lang="ja">
                <span className="bg-black text-main px-2 py-1 inline-block rotate-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  {illustrator.name}
                </span>
              </DialogTitle>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {illustrator.snsId && (
                  <a 
                    href={`https://x.com/${illustrator.snsId.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-black text-white px-3 py-1.5 text-xs font-bold hover:bg-main hover:text-black transition-colors"
                  >
                    <i className="hn hn-x text-sm"></i>
                    <span>{illustrator.snsId}</span>
                  </a>
                )}
                <div className="text-xs font-mono font-bold opacity-60">
                  {artworks.length} {t('illustrators.artworks_count', 'ARTWORKS FOUND')}
                </div>
              </div>
            </div>
            <button 
                onClick={onClose}
                className="absolute right-4 top-4 sm:relative sm:top-0 sm:right-0 bg-background text-foreground border-3 border-foreground shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all w-10 h-10 rounded-none flex items-center justify-center shrink-0 z-50"
              >
              <i className="hn hn-times text-xl leading-none"></i>
            </button>
          </DialogHeader>

          {/* 視圖切換 */}
          <div className="flex items-center gap-2 mt-4 md:mt-6 border-2 border-black p-1 bg-black/5 w-fit">
            <button 
              onClick={() => setActiveTab('mv')} 
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'mv' ? 'bg-black text-white shadow-neo-sm' : 'hover:bg-black/10 opacity-70'}`}
            >
              {t('illustrators.mv_artworks', '單曲插畫')} ({artworks.length})
            </button>
            {collabs.length > 0 && (
              <button 
                onClick={() => setActiveTab('collab')} 
                className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'collab' ? 'bg-black text-white shadow-neo-sm' : 'hover:bg-black/10 opacity-70'}`}
              >
                {t('illustrators.collab_artworks', '綜合插畫')} ({collabs.length})
              </button>
            )}
          </div>

          {/* MVs Tags */}
          <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t-2 border-dashed border-border/50 max-h-[100px] overflow-y-auto custom-scrollbar">
            <span className="text-[10px] font-mono opacity-50 flex items-center shrink-0">PARTICIPATED MVS:</span>
            {illustrator.mvs.map(mv => (
              <span key={mv.id} className="text-[10px] sm:text-xs font-bold border-2 border-black px-2 py-0.5 bg-black/5" lang="ja">
                {mv.title}
              </span>
            ))}
          </div>
        </div>

        {/* Masonry Content */}
        <ScrollArea className="flex-1 relative z-10 w-full p-4 md:p-8 bg-black/5" id="illustrator-scroll-area">
          {currentDisplayImages.length > 0 ? (
            <FancyboxViewer 
              images={[]}
              options={{
                Carousel: { infinite: true },
                Toolbar: { display: { left: ["infobar"], middle: ["zoomIn", "zoomOut", "toggle1to1", "rotateCCW", "rotateCW", "flipX", "flipY"], right: ["slideshow", "fullscreen", "download", "close"] } },
                Thumbs: { autoStart: true },
              }}
            >
              <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 md:gap-6">
                {activeTab === 'mv' ? currentDisplayImages.slice(0, visibleCount).map((art, idx) => {
                  const isVideo = art.item.url?.match(/\.(mp4|webm)$/i) || art.item.url?.includes('video.twimg.com') || (art.item.thumbnail && art.item.thumbnail !== art.item.url && !art.item.url.match(/\.gif$/i));
                  return (
                  <div key={`${art.item.url}-${idx}`} className="block break-inside-avoid mb-4 md:mb-6 h-max relative group cursor-pointer">
                    <a 
                      href={art.item.url} 
                      data-fancybox="illustrator-gallery"
                      data-src={art.item.url}
                      data-caption={art.item.caption || art.mvTitle}
                      data-type={isVideo ? "html5video" : "image"}
                      {...(isVideo ? {
                        "data-video-autoplay": "true",
                        "data-video-loop": "true",
                        "data-video-muted": "true",
                        "data-video-playsinline": "true"
                      } : {})}
                      className="absolute inset-0 z-40 w-full h-full block"
                    >
                      <span className="sr-only">View full size</span>
                    </a>
                    <div className="pointer-events-none relative z-10">
                      <MasonryImage item={art.item} mvTitle={art.mvTitle} index={idx} />
                    </div>
                  </div>
                )}) : currentDisplayImages.slice(0, visibleCount).map((img: any, idx) => {
                  const isVideo = img.url?.match(/\.(mp4|webm)$/i) || img.url?.includes('video.twimg.com') || (img.thumbnail && img.thumbnail !== img.url && !img.url.match(/\.gif$/i));
                  return (
                  <div key={`${img.url}-${idx}`} className="block break-inside-avoid mb-4 md:mb-6 h-max relative group cursor-pointer">
                    <a 
                      href={img.url} 
                      data-fancybox="illustrator-gallery"
                      data-src={img.url}
                      data-caption={img.caption || "COMPILATION ILLUST"}
                      data-type={isVideo ? "html5video" : "image"}
                      {...(isVideo ? {
                        "data-video-autoplay": "true",
                        "data-video-loop": "true",
                        "data-video-muted": "true",
                        "data-video-playsinline": "true"
                      } : {})}
                      className="absolute inset-0 z-40 w-full h-full block"
                    >
                      <span className="sr-only">View full size</span>
                    </a>
                    <div className="pointer-events-none relative z-10">
                      <MasonryImage item={img} mvTitle="COMPILATION ILLUST" index={idx} />
                    </div>
                  </div>
                )})}
              </div>
              
              {visibleCount < currentDisplayImages.length && (
                <div className="w-full py-8 flex justify-center">
                  <Button 
                    onClick={() => setVisibleCount(prev => Math.min(prev + 20, currentDisplayImages.length))}
                    variant="neutral"
                    className="font-black tracking-widest uppercase border-2 border-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                  >
                    <i className="hn hn-arrow-down mr-2"></i>
                    {t('common.load_more', '載入更多 (LOAD MORE)')}
                  </Button>
                </div>
              )}
            </FancyboxViewer>
          ) : (
            <div className="w-full py-20 flex flex-col items-center justify-center opacity-30 text-center">
              <i className="hn hn-image text-5xl mb-4"></i>
              <p className="text-sm font-bold font-mono">NO_ARTWORKS_FOUND</p>
              <p className="text-xs mt-2">{t('illustrators.no_artworks', '暫無該畫師的相關作品圖片。')}</p>
            </div>
          )}
          <div className="h-10"></div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
