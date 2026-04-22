import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MVItem } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { WalineComments } from '@/components/WalineComments';

interface FanArtPageProps {
  mvData: MVItem[];
}

export function FanArtPage({ mvData }: FanArtPageProps) {
  const { t } = useTranslation();
  
  // 提取所有有圖片的 MV 作為篩選選項
  const availableMVs = useMemo(() => {
    return mvData.filter(mv => mv.images && mv.images.length > 0).sort((a, b) => b.date.localeCompare(a.date));
  }, [mvData]);

  // 提取所有年份
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    availableMVs.forEach(mv => {
      if (mv.date) years.add(mv.date.substring(0, 4));
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [availableMVs]);

  // 提取所有專輯
  const availableAlbums = useMemo(() => {
    const albums = new Set<string>();
    availableMVs.forEach(mv => {
      if (mv.album && Array.isArray(mv.album)) {
        mv.album.forEach(a => {
          if (a) albums.add(a.trim());
        });
      } else if (mv.album && typeof mv.album === 'string') {
        const albumList = (mv.album as string).split(',').map(a => a.trim()).filter(Boolean);
        albumList.forEach(a => albums.add(a));
      }
    });
    return Array.from(albums).sort();
  }, [availableMVs]);

  // 狀態：選中的 MV IDs
  const [selectedMvs, setSelectedMvs] = useState<string[]>([]);
  // 狀態：是否包含綜合插畫 (多角色)
  const [includeCollab, setIncludeCollab] = useState<boolean>(true);
  
  // 狀態：初篩用的年份和專輯
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterAlbum, setFilterAlbum] = useState<string>('all');

  // 提取所有 FanArt 圖片並去重
  const allFanArts = useMemo(() => {
    const fanArtMap = new Map<string, MVImage & { mvIds: string[], mvTitles: string[] }>();
    
    mvData.forEach(mv => {
      if (mv.images && Array.isArray(mv.images)) {
        mv.images.forEach(img => {
          // 只抓取明確標記為 fanart 的圖片
          if (img.type === 'fanart') {
            if (fanArtMap.has(img.url)) {
              const existing = fanArtMap.get(img.url)!;
              if (!existing.mvIds.includes(mv.id)) {
                existing.mvIds.push(mv.id);
                existing.mvTitles.push(mv.title);
              }
            } else {
              fanArtMap.set(img.url, {
                ...img,
                mvIds: [mv.id],
                mvTitles: [mv.title]
              });
            }
          }
        });
      }
    });
    
    // 按日期降序排序 (最新的在前)
    return Array.from(fanArtMap.values()).sort((a, b) => {
      const dateA = a.tweetDate || '';
      const dateB = b.tweetDate || '';
      return dateB.localeCompare(dateA);
    });
  }, [mvData]);

  // 根據初篩條件過濾顯示的 MV 選項
  const filteredMVs = useMemo(() => {
    return availableMVs.filter(mv => {
      const matchYear = filterYear === 'all' || mv.date?.substring(0, 4) === filterYear;
      
      // 處理多專輯匹配邏輯
      let matchAlbum = true;
      if (filterAlbum !== 'all') {
        if (!mv.album) {
          matchAlbum = false;
        } else if (Array.isArray(mv.album)) {
          matchAlbum = mv.album.map(a => a.trim()).includes(filterAlbum);
        } else if (typeof mv.album === 'string') {
          const albumList = (mv.album as string).split(',').map(a => a.trim());
          matchAlbum = albumList.includes(filterAlbum);
        }
      }
      
      return matchYear && matchAlbum;
    });
  }, [availableMVs, filterYear, filterAlbum]);

  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);

  // 切換 MV 選擇
  const toggleMvSelection = (id: string) => {
    setSelectedMvs(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // 全選 / 取消全選 (僅針對當前過濾後的 MV)
  const toggleAllMvs = () => {
    const currentFilteredIds = filteredMVs.map(mv => mv.id);
    const allSelected = currentFilteredIds.every(id => selectedMvs.includes(id));
    
    if (allSelected) {
      // 取消全選：從 selectedMvs 中移除當前過濾出來的 ID
      setSelectedMvs(prev => prev.filter(id => !currentFilteredIds.includes(id)));
    } else {
      // 全選：將當前過濾出來的 ID 加入 selectedMvs，並確保不重複
      setSelectedMvs(prev => {
        const next = new Set([...prev, ...currentFilteredIds]);
        return Array.from(next);
      });
    }
  };

  // 根據篩選條件過濾最終要顯示的 FanArt
  const displayedFanArts = useMemo(() => {
    return allFanArts.filter(art => {
      const isCollab = art.mvIds.length > 1;
      
      // 如果不包含綜合插畫，但它是綜合插畫，則過濾掉
      if (!includeCollab && isCollab) return false;
      
      // 如果沒有選擇任何 MV，則顯示全部符合上述條件的
      if (selectedMvs.length === 0) return true;
      
      // 如果有選擇 MV，該圖片必須關聯到至少一個選中的 MV
      return art.mvIds.some(id => selectedMvs.includes(id));
    });
  }, [allFanArts, includeCollab, selectedMvs]);

  return (
    <div className="w-full pb-16">
      {/* 標題區塊 */}
      <div className="flex flex-col items-center justify-center my-12 md:my-16 text-center">
        <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
          <span className="bg-black text-main px-4 py-2 inline-block shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rotate-1">
            FANART GALLERY
          </span>
        </h2>
        <p className="text-sm md:text-base opacity-70 font-bold max-w-2xl px-4">
          {t('fanart.desc', '來自社群的神仙二創作品大賞。')}
        </p>
        <div className="mt-4 border-2 border-dashed border-yellow-500 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 px-4 py-2 text-sm font-bold flex items-center gap-2">
          <i className="hn hn-exclamation-triangle text-lg"></i>
          <span>{t('fanart.under_construction', '頁面施工中，歡迎在最下方留言建言獻策！')}</span>
        </div>
      </div>

      {/* 篩選器面板 */}
      <div className="max-w-4xl mx-auto px-4 mb-12">
        <div className={`border-4 border-black bg-card shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative mt-4 transition-all duration-300 ${isFilterExpanded ? 'p-6' : 'px-4 py-0'}`}>
          <div className="absolute -top-4 -left-4 bg-main border-2 border-black px-4 py-1 text-sm font-black rotate-[-2deg] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-10 text-black">
            FILTERS
          </div>
          
          <div className="flex justify-between items-center cursor-pointer select-none h-14 px-4 py-0" onClick={() => setIsFilterExpanded(!isFilterExpanded)}>
            <h3 className="text-xl font-black uppercase m-0 flex items-center h-full pt-[2px] leading-none">
              {t('fanart.filter_title', '篩選作品')}
            </h3>
            <div className="flex items-center gap-4">
              {/* 篩選狀態摘要 (收起時顯示) */}
              {!isFilterExpanded && (
                <div className="text-xs font-bold opacity-60 hidden md:block">
                  {selectedMvs.length > 0 ? `已選 ${selectedMvs.length} 個 MV` : '所有作品'} 
                  {!includeCollab ? ' (不含大合繪)' : ''}
                  {filterYear !== 'all' || filterAlbum !== 'all' ? ' · 有啟用初篩' : ''}
                </div>
              )}
              <button 
                className="bg-black text-white w-8 h-8 flex items-center justify-center border-2 border-black hover:bg-main hover:text-black transition-colors"
                aria-label={isFilterExpanded ? t('fanart.collapse_filter', '收起篩選器') : t('fanart.expand_filter', '展開篩選器')}
              >
                <i className={`hn ${isFilterExpanded ? 'hn-minus' : 'hn-plus'} text-sm`}></i>
              </button>
            </div>
          </div>
          
          <div className={`space-y-6 overflow-hidden transition-all duration-500 origin-top ${isFilterExpanded ? 'max-h-[2000px] opacity-100 mt-6' : 'max-h-0 opacity-0 mt-0'}`}>
            {/* 特殊選項：綜合插畫 */}
            <div className="flex items-center gap-3 p-3 border-2 border-black bg-black/5 cursor-pointer hover:bg-black/10 transition-colors" onClick={() => setIncludeCollab(!includeCollab)}>
              <div className={`w-5 h-5 border-2 border-black flex items-center justify-center ${includeCollab ? 'bg-main' : 'bg-card'}`}>
                {includeCollab && <i className="hn hn-check text-xs font-black"></i>}
              </div>
              <Label className="font-bold cursor-pointer">{t('fanart.include_collab', '綜合插畫 (多角色 / 大合繪)')}</Label>
            </div>

            {/* MV 單曲初篩 (年份/專輯) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-2 border-black bg-card">
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase opacity-70">按年份初篩</Label>
                <select 
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full border-2 border-black bg-background px-3 py-2 font-bold font-mono outline-none focus:border-main shadow-neo-sm"
                >
                  <option value="all">所有年份 (ALL YEARS)</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase opacity-70">按專輯初篩</Label>
                <select 
                  value={filterAlbum}
                  onChange={(e) => setFilterAlbum(e.target.value)}
                  className="w-full border-2 border-black bg-background px-3 py-2 font-bold font-mono outline-none focus:border-main shadow-neo-sm"
                >
                  <option value="all">所有專輯 (ALL ALBUMS)</option>
                  {availableAlbums.map(album => (
                    <option key={album} value={album}>{album}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* MV 單曲選項 */}
            <div>
              <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-2">
                <Label className="font-bold uppercase tracking-widest">{t('fanart.filter_by_mv', '按 MV 篩選角色')}</Label>
                <button 
                  onClick={toggleAllMvs}
                  className="text-xs font-bold underline hover:text-main"
                >
                  {filteredMVs.every(mv => selectedMvs.includes(mv.id)) ? t('common.deselect_all', '取消全選') : t('common.select_all', '全選')}
                </button>
              </div>
              
              {filteredMVs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar p-2 border-2 border-dashed border-black/20 bg-black/5">
                  {filteredMVs.map(mv => (
                    <div 
                      key={mv.id}
                      onClick={() => toggleMvSelection(mv.id)}
                      className={`flex items-center gap-2 p-2 border-2 border-black transition-all cursor-pointer truncate ${selectedMvs.includes(mv.id) ? 'bg-black text-main shadow-[2px_2px_0_0_rgba(0,0,0,1)] -translate-y-[1px]' : 'bg-card hover:bg-black/5 hover:-translate-y-[1px] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]'}`}
                    >
                      <div className={`w-3 h-3 border-2 shrink-0 flex items-center justify-center ${selectedMvs.includes(mv.id) ? 'border-main bg-main' : 'border-black bg-card'}`}>
                      </div>
                      <span className="text-xs font-bold truncate" title={mv.title} lang="ja">{mv.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full py-8 text-center border-2 border-dashed border-black/20 bg-black/5">
                  <p className="text-xs font-bold opacity-50">沒有符合此年份或專輯的 MV</p>
                </div>
              )}
            </div>
          </div>

          <div className={`mt-8 flex justify-end transition-opacity duration-300 ${isFilterExpanded ? 'opacity-100' : 'opacity-0 h-0 mt-0 overflow-hidden'}`}>
            <button 
              onClick={() => setIsFilterExpanded(false)}
              className="bg-black text-white px-6 py-2 font-black uppercase tracking-widest border-2 border-black hover:bg-main hover:text-black transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-1 hover:translate-x-1"
            >
              {t('fanart.apply_filters', `套用並收起 (${displayedFanArts.length} 張作品)`)}
            </button>
          </div>
        </div>
      </div>

      {/* FanArt 畫廊區塊 */}
      {displayedFanArts.length > 0 ? (
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 pb-12">
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {displayedFanArts.map((art, idx) => (
              <div 
                key={idx} 
                className="break-inside-avoid border-4 border-black bg-card shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all group overflow-hidden"
              >
                <a href={art.tweetUrl || art.url} target="_blank" rel="noopener noreferrer" className="block relative overflow-hidden">
                  <img 
                    src={art.thumbnail || art.url} 
                    alt={art.caption || 'FanArt'} 
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500" 
                    loading="lazy"
                  />
                  {art.tweetAuthor && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white font-bold text-sm truncate">@{art.tweetHandle || art.tweetAuthor}</p>
                    </div>
                  )}
                </a>
                {(art.caption || art.mvTitles.length > 0) && (
                  <div className="p-3 border-t-4 border-black bg-background flex flex-col gap-2">
                    {art.caption && <p className="text-sm font-bold line-clamp-2">{art.caption}</p>}
                    {art.mvTitles.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {art.mvTitles.map(title => (
                          <span key={title} className="text-[10px] bg-black text-white px-1.5 py-0.5 uppercase font-bold tracking-wider">
                            {title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full py-10 flex flex-col items-center justify-center opacity-30 text-center px-4">
          <i className="hn hn-image text-5xl mb-4"></i>
          <p className="text-sm font-bold font-mono">NO_MATCHING_ARTWORKS</p>
          <p className="text-xs mt-2">{t('fanart.no_artworks_yet', '暫無符合篩選條件的作品。')}</p>
        </div>
      )}

      {/* 留言區塊 */}
      <div className="max-w-4xl mx-auto px-4 mt-16 md:mt-24">
        <div className="p-6 border-4 border-black bg-card shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative mt-4">
          <div className="absolute -top-4 -left-4 bg-main border-2 border-black px-4 py-1 text-sm font-black rotate-[-2deg] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-10 text-black">
            FEEDBACK
          </div>
          <h3 className="text-xl font-black uppercase mb-4 mt-2">
            {t('fanart.feedback_title', 'FanArt專欄・建言獻策')}
          </h3>
          <p className="text-sm opacity-70 mb-6">
            {t('fanart.feedback_desc', '您覺得 FanArt 二創畫廊還需要如何改進？歡迎在這裡留言討論！')}
          </p>
          <WalineComments 
            path="/fanart-feedback" 
            className="waline-wrapper" 
            reactionTitle={t("waline.reactionTitleFeature", "您期待這個功能嗎？")} 
          />
        </div>
      </div>
    </div>
  );
}
