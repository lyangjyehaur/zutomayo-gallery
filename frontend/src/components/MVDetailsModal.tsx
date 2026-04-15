import React, { useEffect, useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from '@/components/ui/scroll-area'
import { MVItem } from '@/lib/types';
import { getProxyImgUrl } from '@/lib/image';
import LightGalleryViewer, { GALLERY_BREAKPOINTS } from '@/components/LightGalleryViewer';
import { WalineComments } from '@/components/WalineComments';
import { VERSION_CONFIG } from '@/config/version';
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
  
  // 使用 ref 追踪燈箱狀態，避免觸發重渲染
  const isLightboxOpenRef = useRef(false);

  // 當切換影片時重置狀態
  useEffect(() => {
    setIsVideoActivated(false);
    isLightboxOpenRef.current = false;
    // 預設選擇有資料的平台
    if (mv?.bilibili) setVideoPlatform('bilibili');
    else if (mv?.youtube) setVideoPlatform('youtube');
  }, [mv?.id]);

  // 處理 Dialog 外部點擊
  const handlePointerDownOutside = (e: React.PointerEvent) => {
    // 檢查點擊目標是否在燈箱元素內
    const target = e.target as HTMLElement;
    if (target.closest('.lg-backdrop, .lg-outer, .lg-components, .lg-container, .lg-toolbar, .lg-actions, .lg-thumb-outer')) {
      e.preventDefault();
    }
  };

  const handleInteractOutside = (e: React.FocusEvent | React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    const target = (e as unknown as React.PointerEvent).target as HTMLElement;
    if (target?.closest('.lg-backdrop, .lg-outer, .lg-components, .lg-container, .lg-toolbar, .lg-actions, .lg-thumb-outer')) {
      e.preventDefault();
    }
  };

  return (
    <Dialog open={!!mv} onOpenChange={(open) => !open && !isLightboxOpenRef.current && onClose()}>
      <DialogContent
        className="max-w-none crt-lines crt-scanline border-none"
        onPointerDownOutside={handlePointerDownOutside}
        onInteractOutside={handleInteractOutside}
      >
        <DialogHeader className="relative z-30 pt-10 px-8 pb-6 border-b-4 border-border">
          <DialogClose 
            className="absolute top-6 right-8 z-50 bg-white text-black border-3 border-black p-2 shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
            onClick={onClose}
          >
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-screen-2xl mx-auto">
            {/* 左側/上方區域：影片 + 描述 + 畫廊 */}
            <div className="space-y-4 lg:sticky lg:top-0 lg:h-[calc(100vh-240px)] flex flex-col">
              {/* 影片播放區 */}
              <Tabs value={videoPlatform} onValueChange={(v) => { setVideoPlatform(v as 'youtube' | 'bilibili'); setIsVideoActivated(false); }} className="w-full">
                <TabsList className="grid w-full grid-cols-2 border-4 border-black shadow-neo-sm bg-black/20">
                  {mv?.bilibili && (
                    <TabsTrigger 
                      value="bilibili" 
                      className="gap-2 font-black text-xs data-[state=active]:bg-[#00aeec] data-[state=active]:text-white data-[state=active]:border-b-4 data-[state=active]:border-black"
                    >
                      <PixelTV className="size-5" /> BILIBILI
                    </TabsTrigger>
                  )}
                  {mv?.youtube && (
                    <TabsTrigger 
                      value="youtube" 
                      className="gap-2 font-black text-xs data-[state=active]:bg-main data-[state=active]:text-black data-[state=active]:border-b-4 data-[state=active]:border-black"
                    >
                      <PixelYoutube className="size-5" /> YOUTUBE
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="bilibili" className="mt-2">
                  <div className="aspect-video border-4 border-black shadow-shadow bg-black overflow-hidden relative group isolate">
                    {!isVideoActivated ? (
                      /* 播放遮罩 */
                      <div 
                        className="absolute inset-0 z-20 cursor-pointer flex items-center justify-center overflow-hidden"
                        onClick={() => setIsVideoActivated(true)}
                      >
                        {/* 封面背景圖 */}
                        <div 
                          className="glitch-base absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                          style={{ backgroundImage: `url(${getProxyImgUrl(mv?.coverImages?.[0] || '', 'small')})` }}
                        />
                        {/* Glitch 疊加層 */}
                        <div 
                          className="glitch-layer glitch-red absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${getProxyImgUrl(mv?.coverImages?.[0] || '', 'small')})` }}
                        />
                        <div 
                          className="glitch-layer glitch-blue absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${getProxyImgUrl(mv?.coverImages?.[0] || '', 'small')})` }}
                        />
                        {/* 黑色疊加層 */}
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors z-10" />
                        <div className="absolute inset-0 opacity-20 pointer-events-none crt-lines z-15"></div>
                        
                        {/* 播放按 */}
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
                      /* Bilibili iframe */
                      <iframe 
                        src={`//player.bilibili.com/player.html?bvid=${mv?.bilibili}&page=1&high_quality=1&autoplay=1`}
                        className="w-full h-full"
                        scrolling="no" frameBorder="0" allowFullScreen
                      />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="youtube" className="mt-2">
                  <div className="aspect-video border-4 border-black shadow-shadow bg-black overflow-hidden relative group isolate">
                    {!isVideoActivated ? (
                      /* 播放遮罩 */
                      <div 
                        className="absolute inset-0 z-20 cursor-pointer flex items-center justify-center overflow-hidden"
                        onClick={() => setIsVideoActivated(true)}
                      >
                        {/* 封面背景圖 */}
                        <div 
                          className="glitch-base absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                          style={{ backgroundImage: `url(${getProxyImgUrl(mv?.coverImages?.[0] || '', 'small')})` }}
                        />
                        {/* Glitch 疊加層 */}
                        <div 
                          className="glitch-layer glitch-red absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${getProxyImgUrl(mv?.coverImages?.[0] || '', 'small')})` }}
                        />
                        <div 
                          className="glitch-layer glitch-blue absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${getProxyImgUrl(mv?.coverImages?.[0] || '', 'small')})` }}
                        />
                        {/* 黑色疊加層 */}
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors z-10" />
                        <div className="absolute inset-0 opacity-20 pointer-events-none crt-lines z-15"></div>
                        
                        {/* 播放按 */}
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
                      /* YouTube iframe */
                      <iframe 
                        src={`https://www.youtube.com/embed/${mv?.youtube}?autoplay=1&rel=0`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={mv.title}
                      />
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {/* 設定圖畫廊區 - 使用 order 調整布局順序 */}
              <div className="space-y-4 order-2 lg:order-none">
                <h4 className="font-bold border-b-3 border-black pb-2 flex items-center gap-2 uppercase tracking-widest lg:hidden">
                  <PixelGallery className="size-5 text-ztmy-green" /> 設定資料圖
                </h4>
                <div className="lg:hidden">
                  {mv?.images && mv.images.length > 0 ? (
                    <LightGalleryViewer
                      images={mv.images}
                      mvTitle={mv.title}
                      mvId={mv.id}
                      itemsPerPage={12}
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
              </div>

              {/* 描述區域 - 使用 order 調整為最後（上下布局時） */}
              <ScrollArea className="p-8 bg-card border-4 border-border shadow-shadow flex-1 overflow-y-auto custom-scrollbar lg:flex-1 order-3 lg:order-none">
                <h4 className="text-xs font-black uppercase tracking-widest text-main mb-6 opacity-50 border-b-2 border-border pb-2 inline-block">File_Description_v{VERSION_CONFIG.app}</h4>
                <p className="text-sm leading-relaxed whitespace-pre-wrap opacity-90 font-base">{mv?.description}</p>
              </ScrollArea>
            </div>

            {/* 設定圖畫廊區 - 在左右布局時顯示在右側 */}
            <div className="space-y-4 hidden lg:block">
              <h4 className="font-bold border-b-3 border-black pb-2 flex items-center gap-2 uppercase tracking-widest">
                <PixelGallery className="size-5 text-ztmy-green" /> 設定資料圖
              </h4>
              {mv?.images && mv.images.length > 0 ? (
                <LightGalleryViewer
                  images={mv.images}
                  mvTitle={mv.title}
                  mvId={mv.id}
                  itemsPerPage={12}
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

              {/* Waline 評論區 */}
              {mv && (
                <div className="mt-8 pt-8 border-t-4 border-border">
                  <h4 className="font-bold border-b-3 border-black pb-2 flex items-center gap-2 uppercase tracking-widest mb-4">
                    <svg viewBox="0 0 24 24" className="size-5 text-ztmy-blue" fill="currentColor">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                    </svg>
                    評論
                  </h4>
                  <WalineComments
                    path={`/mv/${mv.id}`}
                    className="waline-wrapper"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
      
      {/* 全局樣式：確保燈箱層級和交互正確 */}
      <style>{`
        /* LightGallery 燈箱層級 - 必須高於 Radix Dialog */
        .lg-backdrop {
          z-index: 99999 !important;
        }
        .lg-outer {
          z-index: 100000 !important;
        }
        .lg-components {
          z-index: 100001 !important;
        }

        /* 確保燈箱元素可以接收所有事件 */
        .lg-backdrop,
        .lg-outer,
        .lg-components,
        .lg-toolbar,
        .lg-actions,
        .lg-sub-html,
        .lg-thumb-outer,
        .lg-img-wrap,
        .lg-item {
          pointer-events: auto !important;
        }

        /* 修復 Dialog 的 dismissableLayer 問題 */
        [data-radix-focus-guard] {
          display: none !important;
        }

        /* Waline 樣式覆寫 */
        .waline-wrapper {
          --waline-theme-color: #00ff9d !important;
          --waline-active-color: #00cc7d !important;
        }
        .waline-wrapper .wl-panel {
          background: rgba(0, 0, 0, 0.3) !important;
          border: 2px solid #333 !important;
        }
        .waline-wrapper .wl-input,
        .waline-wrapper .wl-editor {
          background: rgba(0, 0, 0, 0.5) !important;
          color: #fff !important;
        }
        .waline-wrapper .wl-btn.primary {
          background: var(--waline-theme-color) !important;
          color: #000 !important;
          border: 2px solid #000 !important;
        }
      `}</style>
    </Dialog>
  );
}
