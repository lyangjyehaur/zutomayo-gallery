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
import FancyboxViewer from '@/components/FancyboxViewer';

interface IllustratorDetailsModalProps {
  illustrator: { name: string; twitter?: string; mvs: MVItem[]; meta?: ArtistMeta } | null;
  onClose: () => void;
}

export function IllustratorDetailsModal({ illustrator, onClose }: IllustratorDetailsModalProps) {
  const { t } = useTranslation();
  const collabs = useMemo(() => {
    return (illustrator?.meta?.collaborations || []).map(img => ({
      ...img,
      caption: img.caption || 'COMPILATION ILLUST'
    }));
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
    const imgs: any[] = [];
    illustrator.mvs.forEach(mv => {
      mv.images?.forEach(img => {
        if (img.usage === 'cover' || img.type === 'fanart') return;
        imgs.push({ 
          ...img, 
          caption: img.caption ? `[${mv.title}] ${img.caption}` : mv.title 
        });
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

  // 判斷是否為 macOS (排除 iOS 與觸控裝置，讓手機端統一顯示右上角叉叉)
  const isMac = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const isMacOs = /Mac/i.test(navigator.userAgent) || navigator.platform?.toUpperCase().indexOf('MAC') >= 0;
    const isMobileOrTouch = /(iPhone|iPod|iPad)/i.test(navigator.userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    return isMacOs && !isMobileOrTouch;
  }, []);

  if (!illustrator) return null;

  return (
    <Dialog open={!!illustrator} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        overlayClassName={MODAL_THEME.overlay.dialog}
        className={`w-screen h-[100dvh] max-w-none md:max-w-none md:w-full md:h-[100dvh] md:max-h-[100dvh] overflow-hidden flex flex-col p-0 border-0 ${MODAL_THEME.content.dialog} rounded-none shadow-none fixed top-0 left-0 md:top-0 md:left-0 !translate-x-0 !translate-y-0 md:!translate-x-0 md:!translate-y-0 z-[140] [&>button]:hidden`}
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

        <div className={`absolute top-4 z-[110] ${isMac ? 'left-4' : 'right-4'}`}>
          <button 
            onClick={onClose}
            className={`bg-background text-foreground border-3 border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all ${isMac ? 'w-auto px-3' : 'w-10'} h-10 rounded-none flex items-center justify-center shrink-0 hover:bg-main hover:text-black font-black uppercase tracking-widest text-xs gap-1.5`}
          >
            {isMac ? (
              <>
                <i className="hn hn-angle-left text-xs leading-none"></i>
                <span>返回</span>
              </>
            ) : (
              <i className="hn hn-times text-xl leading-none"></i>
            )}
          </button>
        </div>

        <div className="flex flex-col md:flex-row h-full w-full relative z-10 overflow-hidden">
          
          {/* 左側 Sidebar (畫師資訊) */}
          <div className="w-full md:w-[350px] lg:w-[450px] shrink-0 bg-card border-b-4 md:border-b-0 md:border-r-4 border-black flex flex-col relative h-auto md:h-full z-20 max-h-[50vh] md:max-h-full">
            
            {/* 可滾動的資訊區塊 */}
            <div className={`flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 flex flex-col gap-6 ${isMac ? 'pt-16 md:pt-20' : ''}`}>
              <DialogHeader className="flex flex-col items-start gap-4 text-left pr-12">
                <DialogTitle className="text-3xl md:text-5xl font-black tracking-tighter uppercase break-words leading-none w-full" lang="ja">
                  <span className="bg-black text-main px-2 py-1 inline-block rotate-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    {illustrator.meta?.displayName || illustrator.name}
                  </span>
                </DialogTitle>
                <div className="text-xs font-mono font-bold opacity-60 bg-black/5 px-2 py-1 border border-black/10">
                  {artworks.length} {t('illustrators.artworks_count', 'ARTWORKS FOUND')}
                </div>
              </DialogHeader>
              
              {/* 社群與網站連結 */}
              <div className="flex items-center gap-2 flex-wrap">
                {illustrator.twitter && (
                  <a 
                    href={`https://x.com/${illustrator.twitter.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-black text-white px-3 py-2 text-xs font-bold hover:bg-main hover:text-black transition-colors border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                  >
                    <i className="hn hn-x text-sm"></i>
                    <span>{illustrator.twitter}</span>
                  </a>
                )}
                {illustrator.meta?.instagram && (
                  <a 
                    href={illustrator.meta.instagram.startsWith('http') ? illustrator.meta.instagram : `https://instagram.com/${illustrator.meta.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center bg-black text-white p-2 text-sm hover:bg-main hover:text-black transition-colors border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                    title="Instagram"
                  >
                    <i className="hn hn-instagram"></i>
                  </a>
                )}
                {illustrator.meta?.youtube && (
                  <a 
                    href={illustrator.meta.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center bg-black text-white p-2 text-sm hover:bg-main hover:text-black transition-colors border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                    title="YouTube"
                  >
                    <i className="hn hn-youtube"></i>
                  </a>
                )}
                {illustrator.meta?.pixiv && (
                  <a 
                    href={illustrator.meta.pixiv}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center bg-black text-white px-2.5 py-2 text-xs font-bold font-mono hover:bg-main hover:text-black transition-colors border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                    title="Pixiv"
                  >
                    P
                  </a>
                )}
                {illustrator.meta?.tiktok && (
                  <a 
                    href={illustrator.meta.tiktok.startsWith('http') ? illustrator.meta.tiktok : `https://tiktok.com/${illustrator.meta.tiktok.startsWith('@') ? '' : '@'}${illustrator.meta.tiktok}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center bg-black text-white px-2.5 py-2 text-xs font-bold hover:bg-main hover:text-black transition-colors border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                    title="TikTok"
                  >
                    <span className="leading-none">TikTok</span>
                  </a>
                )}
                {(illustrator.meta?.website || illustrator.meta?.profileUrl) && (
                  <a 
                    href={illustrator.meta.website || illustrator.meta.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-black text-white px-3 py-2 text-xs font-bold hover:bg-main hover:text-black transition-colors border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                  >
                    <i className="hn hn-link text-sm"></i>
                    <span>Website</span>
                  </a>
                )}
              </div>
              
              {/* 畫師介紹 (Bio) */}
              {illustrator.meta?.bio && (
                <div className="text-sm font-bold opacity-80 bg-black/5 p-4 border-l-4 border-main w-full whitespace-pre-wrap leading-relaxed">
                  {illustrator.meta.bio}
                </div>
              )}

              {/* MVs Tags */}
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-mono opacity-50 flex items-center shrink-0 border-b-2 border-dashed border-black/20 pb-2">PARTICIPATED MVS:</span>
                <div className="flex flex-wrap gap-2">
                  {illustrator.mvs.map(mv => (
                    <span key={mv.id} className="text-[10px] sm:text-xs font-bold border-2 border-black px-2 py-1 bg-background hover:bg-main transition-colors cursor-default shadow-sm" lang="ja">
                      {mv.title}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 底部 Tab 切換 (固定在側邊欄底部) */}
            <div className="p-4 md:p-6 border-t-4 border-black bg-main/10 flex flex-col gap-3 shrink-0">
              <span className="text-[10px] font-mono opacity-50 font-bold uppercase tracking-widest">Select View</span>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setActiveTab('mv')} 
                  className={`flex-1 py-2 px-3 text-xs font-black uppercase tracking-widest transition-all border-2 border-black ${activeTab === 'mv' ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]' : 'bg-background hover:bg-black/5'}`}
                >
                  {t('illustrators.mv_artworks', '單曲插畫')} ({artworks.length})
                </button>
                {collabs.length > 0 && (
                  <button 
                    onClick={() => setActiveTab('collab')} 
                    className={`flex-1 py-2 px-3 text-xs font-black uppercase tracking-widest transition-all border-2 border-black ${activeTab === 'collab' ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]' : 'bg-background hover:bg-black/5'}`}
                  >
                    {t('illustrators.collab_artworks', '綜合插畫')} ({collabs.length})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 右側 Masonry Content (畫廊) */}
          <div className="flex-1 relative z-10 w-full bg-black/5 overflow-hidden">
            <ScrollArea className="h-full w-full" id="illustrator-scroll-area">
              {currentDisplayImages.length > 0 ? (
                <FancyboxViewer 
                  images={currentDisplayImages}
                  itemsPerPage={20}
                  autoLoadMore={false}
                  enablePagination={true}
                  showHeader={false}
                  breakpointColumns={{ default: 1, 640: 2, 1280: 3, 1536: 4 }}
                  className="!p-4 md:!p-8 !min-h-0"
                />
              ) : (
                <div className="w-full py-20 flex flex-col items-center justify-center opacity-30 text-center">
                  <i className="hn hn-image text-5xl mb-4"></i>
                  <p className="text-sm font-bold font-mono">NO_ARTWORKS_FOUND</p>
                  <p className="text-xs mt-2">{t('illustrators.no_artworks', '暫無該畫師的相關作品圖片。')}</p>
                </div>
              )}
              <div className="h-10"></div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
