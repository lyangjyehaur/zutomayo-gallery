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
  const artistName = mv.artist?.trim() || "Unknown";

  return (
    <div
      className="relative group isolate cursor-pointer transition-all hover:translate-x-1 hover:translate-y-1"
      onClick={onClick}
    >
      <button 
        onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
        aria-label={isFav ? 'Remove favorite' : 'Add favorite'}
        className={`absolute top-3 right-3 z-20 flex h-9 min-w-[58px] items-center justify-center gap-1 border-2 border-border px-2 font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${isFav ? 'bg-main text-main-foreground' : 'bg-secondary-background text-foreground'}`}
      >
        <i className={`fa-solid fa-star text-[11px] ${isFav ? 'animate-beat' : 'opacity-50'}`}></i>
        <span className="text-[9px] leading-none">{isFav ? 'On' : 'Fav'}</span>
      </button>
      
      <ImageCard
        imageUrl={thumbUrl}
        caption={mv.title}
        className="border-3 bg-card text-foreground transition-all group-hover:shadow-none"
      >
        <div className="flex items-end justify-between gap-3 bg-main px-4 py-3 text-[10px] text-main-foreground uppercase md:text-xs">
          <div className="min-w-0">
            <p className="mb-1 font-black tracking-[0.2em] opacity-70">Release</p>
            <p className="truncate border-2 border-border bg-main px-2 py-1 text-main-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              {mv.date}
            </p>
          </div>
          <div className="min-w-0 text-right">
            <p className="mb-1 font-black tracking-[0.2em] opacity-70">Artist</p>
            <p className="truncate border-2 border-border bg-main px-2 py-1 text-main-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              {artistName}
            </p>
          </div>
        </div>
      </ImageCard>
    </div>
  );
}
