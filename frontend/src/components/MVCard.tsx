import React from 'react';
import ImageCard from '@/components/ui/image-card';
import { MVItem } from '@/lib/types';
import { getProxyImgUrl } from '@/lib/image';

interface MVCardProps {
  mv: MVItem;
  isFav: boolean;
  onToggleFav: () => void;
  onClick: () => void;
}

export function MVCard({ mv, isFav, onToggleFav, onClick }: MVCardProps) {
  const thumbUrl = getProxyImgUrl(mv.coverImages?.[0] || 'default.jpg', 'thumb');

  return (
    <div className="relative group isolate" onClick={onClick}>
      <button 
        onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
        className={`absolute top-3 right-3 z-20 w-9 h-9 rounded-full border-2 border-border flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${isFav ? 'bg-main text-main-foreground' : 'bg-secondary-background/80 text-foreground backdrop-blur-sm'}`}
      >
        <i className={`fa-solid fa-star ${isFav ? 'animate-beat' : 'opacity-40'}`}></i>
      </button>
      
      <ImageCard
        imageUrl={thumbUrl}
        caption={mv.title}
        className="transition-all bg-card text-foreground hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] cursor-pointer border-3"
      >
        <div className="text-center py-1">
          <h3 className="font-heading truncate mb-1 text-sm md:text-base tracking-tight" title={mv.title}>
            {mv.title}
          </h3>
          <p className="text-[10px] md:text-xs dotgothic16-regular opacity-60">
            {mv.date}
          </p>
        </div>
      </ImageCard>
    </div>
  );
}
