import React from 'react';

export function MVDetailsModal({ mv, onClose }) {
  if (!mv) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-card border-4 border-black shadow-neo-lg overflow-y-auto overflow-x-hidden rounded-none">
        
        {/* 關閉按鈕 */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 bg-white text-black border-2 border-black p-2 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none shadow-neo-sm transition-all"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div className="p-6 md:p-8">
          <h2 className="text-3xl font-bold dotgothic16-regular mb-2">{mv.title}</h2>
          <div className="flex flex-wrap gap-2 mb-6 opacity-70 italic text-sm">
            {mv.keywords?.map(k => <span key={k}>#{k}</span>)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 影片區 */}
            <div className="space-y-4">
              <div className="aspect-video border-3 border-black shadow-neo bg-black overflow-hidden">
                <iframe 
                  src={`https://www.youtube.com/embed/${mv.youtube}?autoplay=1`}
                  className="w-full h-full"
                  allowFullScreen
                  title={mv.title}
                ></iframe>
              </div>
              <div className="p-4 bg-white/5 border-2 border-black/20">
                <p className="text-sm leading-relaxed whitespace-pre-wrap opacity-80">{mv.description}</p>
              </div>
            </div>

            {/* 這裡之後放置 PhotoSwipe 畫廊 */}
            <div className="space-y-4">
               <h4 className="font-bold border-b-2 border-black pb-2">設定資料圖</h4>
               {mv.images?.length > 0 ? (
                 <div className="grid grid-cols-2 gap-4">
                    {/* 畫廊預留位 */}
                    <p className="col-span-2 text-center py-10 opacity-50 italic">PhotoSwipe 整合開發中...</p>
                 </div>
               ) : (
                 <p className="text-muted">暫無設定圖資料</p>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
