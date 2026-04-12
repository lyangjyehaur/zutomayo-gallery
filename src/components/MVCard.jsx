import React from 'react';

export function MVCard({ mv, isFav, onToggleFav, onClick }) {
  // 這裡之後可以接入原本的 getProxyImgUrl 邏輯
  const thumbUrl = `https://img.ztmr.club/rs:fill:400/f:webp/${btoa(mv.coverImages?.[0] || 'default.jpg').replace(/=/g, '')}`;

  return (
    <div onClick={onClick} className="group relative border-3 border-black shadow-neo rounded-none bg-card hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer overflow-hidden">
      <button 
        onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
        className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full border-2 border-black flex items-center justify-center shadow-neo-sm transition-colors ${isFav ? 'bg-ztmyYellow text-black' : 'bg-black/50 text-white'}`}
      >
        <i className={`fa-solid fa-star ${isFav ? '' : 'opacity-50'}`}></i>
      </button>
      
      <img src={thumbUrl} alt={mv.title} className="aspect-video w-full object-cover border-b-3 border-black" loading="lazy" />
      
      <div className="p-4 text-center">
        <h3 className="font-bold dotgothic16-regular truncate mb-1 text-sm md:text-base" title={mv.title}>{mv.title}</h3>
        <p className="text-[10px] md:text-xs dotgothic16-regular opacity-60">{mv.date}</p>
      </div>
    </div>
  );
}
