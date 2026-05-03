import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { MVItem } from '@/lib/types';
import { WalineComments } from '@/components/WalineComments';
import { getProxyImgUrl } from '@/lib/image';

interface IllustratorsPageProps {
  mvData: MVItem[];
  metadata: any;
}

export function IllustratorsPage({ mvData, metadata }: IllustratorsPageProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const illustrators = useMemo(() => {
    const artistsMap = new Map<string, { name: string; twitter?: string; mvs: MVItem[]; meta?: any }>();
    
    mvData.forEach((mv) => {
      if (mv.creators) {
        mv.creators.forEach((c: any) => {
          const a = typeof c === 'object' ? c.name : c;
          if (!a || a.trim() === '') return;
          if (!artistsMap.has(a)) {
            const meta = metadata?.artistMeta?.[a];
            artistsMap.set(a, {
              name: a,
              twitter: meta?.hideId ? undefined : (meta?.twitter || meta?.id),
              meta: meta,
              mvs: [],
            });
          }
          artistsMap.get(a)?.mvs.push(mv);
        });
      }
    });

    return Array.from(artistsMap.values()).sort((a, b) => {
      // 1. 根據 MV 數量排序 (多到少)
      if (b.mvs.length !== a.mvs.length) {
        return b.mvs.length - a.mvs.length;
      }
      // 2. twitter 去掉 '@'
      const aId = a.twitter ? a.twitter.replace('@', '').toLowerCase() : '';
      const bId = b.twitter ? b.twitter.replace('@', '').toLowerCase() : '';
      
      // 3. 有 twitter 的排在前面
      if (aId && !bId) return -1;
      if (!aId && bId) return 1;
      
      // 4. 都有 twitter 則按字母排序
      if (aId && bId) {
        return aId.localeCompare(bId);
      }
      
      // 5. 都沒有 twitter 則按名字排序
      return a.name.localeCompare(b.name);
    });
  }, [mvData, metadata]);

  const handleOpenIllustrator = (artist: any) => {
    const idToUse = artist.meta?.dataId || artist.meta?.id?.replace('@', '') || artist.name;
    const activeLang = i18n.language ? (i18n.language === 'zh' ? 'zh-TW' : i18n.language) : 'zh-TW';
    const bg = (location.state as any)?.backgroundLocation || location;
    navigate(`/${activeLang}/illustrators/${encodeURIComponent(idToUse)}`, { state: { backgroundLocation: bg } });
  };

  return (
    <div className="w-full pb-16">
      {/* 標題區塊 */}
      <div className="flex flex-col items-center justify-center my-12 md:my-16 text-center">
        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
          <span className="bg-black text-main px-4 py-2 inline-block shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] -rotate-2">
            ILLUSTRATORS
          </span>
        </h2>
        <p className="text-sm md:text-base opacity-70 font-bold max-w-2xl px-4">
          {t('illustrators.desc', '參與 ZUTOMAYO MV 製作的畫師與動畫師陣容。')}
        </p>
        <div className="mt-4 border-2 border-dashed border-yellow-500 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 px-4 py-2 text-sm font-bold flex items-center gap-2">
          <i className="hn hn-exclamation-triangle text-lg"></i>
          <span>{t('illustrators.under_construction', '頁面施工中，目前僅開放 TV♡CHANY 預覽，歡迎在最下方留言建言獻策！')}</span>
        </div>
      </div>

      {/* 畫師網格佈局 (Bento Box / Masonry) */}
      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 md:gap-8 px-4 max-w-7xl mx-auto space-y-6 md:space-y-8">
        {illustrators.map((artist, idx) => {
          const isTVChany = artist.name.toLowerCase() === 'tv♡chany' || artist.name.toLowerCase() === 'tvchany';
          
          // 取得頭像網址並經過代理 (如果有 twitter 才顯示)
          const hasSnsId = !!artist.twitter;
          const username = hasSnsId ? artist.twitter!.replace('@', '') : '';
          const avatarUrl = hasSnsId ? `https://unavatar.io/x/${username}` : '';
          const safeAvatarUrl = hasSnsId ? getProxyImgUrl(avatarUrl, 'small') : '';
          
          // 從 metadata 中取得畫師額外資料
          const meta = artist.meta || {};
          
          return (
          <div 
            key={idx} 
            onClick={() => isTVChany && handleOpenIllustrator(artist)}
            className={`group flex flex-col bg-card border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all relative overflow-hidden break-inside-avoid ${
              isTVChany 
                ? 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none cursor-pointer' 
                : 'opacity-40 grayscale cursor-not-allowed'
            }`}
          >
            {/* 背景浮水印：畫師推特頭像 */}
            {hasSnsId && (
              <div className="absolute left-0 top-0 bottom-0 w-1/2 opacity-[0.20] dark:opacity-[0.15] pointer-events-none z-0 grayscale mix-blend-multiply dark:mix-blend-lighten origin-left">
                <img 
                  src={safeAvatarUrl} 
                  alt={`${artist.name} avatar`} 
                  className="w-full h-full object-cover mask-image-gradient" 
                  loading="lazy"
                  style={{
                    WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                    maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
                  }}
                  onError={(e) => {
                    // 若載入失敗則隱藏
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            
            <div className="flex flex-col gap-2 mb-4 relative z-10">
              <div className="flex justify-between items-start">
                <h3 className={`text-2xl font-black truncate pr-4 transition-colors ${isTVChany ? 'group-hover:text-main' : ''}`} title={artist.name} lang="ja">{meta.displayName || artist.name}</h3>
              </div>
              
              {/* 畫師介紹 (Bio) */}
              {meta.bio && (
                <div className="mt-1 text-xs md:text-sm font-bold opacity-80 line-clamp-3 whitespace-pre-wrap pr-2 p-2 border-l-4 border-main">
                  {meta.bio}
                </div>
              )}
            </div>

            {/* 作品列表小標籤 */}
            <div className="mt-auto pt-6 relative z-10">
              <div className="text-[10px] opacity-50 font-mono mb-2 uppercase tracking-widest flex items-center justify-between">
                <span>Participated MVs ({artist.mvs.length})</span>
                {isTVChany && (
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity font-bold text-main">VIEW WORKS &gt;</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {artist.mvs.slice(0, 4).map((mv) => (
                  <span key={mv.id} className="text-[10px] sm:text-xs font-bold border-2 border-black px-2 py-1 bg-black/5 truncate max-w-[150px]" title={mv.title} lang="ja">
                    {mv.title}
                  </span>
                ))}
                {artist.mvs.length > 4 && (
                  <span className="text-[10px] sm:text-xs font-bold border-2 border-black px-2 py-1 bg-black/5">
                    +{artist.mvs.length - 4}
                  </span>
                )}
              </div>
            </div>
          </div>
        )})}
      </div>

      {/* 留言區塊 */}
      <div className="max-w-4xl mx-auto px-4 mt-16 md:mt-24">
        <div className="p-6 border-4 border-black bg-card shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative mt-4">
          <div className="absolute -top-4 -left-4 bg-main border-2 border-black px-4 py-1 text-sm font-black rotate-[-2deg] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-10 text-black">
            FEEDBACK
          </div>
          <h3 className="text-xl font-black uppercase mb-4 mt-2">
            {t('illustrators.feedback_title', '畫師專欄・建言獻策')}
          </h3>
          <p className="text-sm opacity-70 mb-6">
            {t('illustrators.feedback_desc', '您覺得畫師專欄還需要如何改進？歡迎在這裡留言討論！')}
          </p>
          <WalineComments 
            path="/illustrators-feedback" 
            className="waline-wrapper" 
            reactionTitle={t("waline.reactionTitleFeature", "您期待這個功能嗎？")} 
          />
        </div>
      </div>

    </div>
  );
}
