import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MVItem } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { WalineComments } from '@/components/WalineComments';
import FancyboxViewer from '@/components/FancyboxViewer';

interface FanArtPageProps {
  mvData: MVItem[];
}

export function FanArtPage({ mvData }: FanArtPageProps) {
  const { t } = useTranslation();

  const normalizeTag = (tag: any) => {
    if (!tag) return '';
    const str = String(tag);
    if (str.startsWith('tag:')) return str;
    return `tag:${str}`;
  };

  const baseApiUrl = useMemo(() => (import.meta.env.VITE_API_URL || '/api').replace(/\/mvs$/, ''), []);
  const galleryCacheBust = useMemo(() => `${Date.now()}`, []);
  const [galleryFanarts, setGalleryFanarts] = useState<any[] | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const fetchOnce = async (url: string) => {
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) throw new Error(`HTTP_${res.status}`);
          const data = await res.json();
          if (data?.success && Array.isArray(data.data)) return data.data as any[];
          throw new Error('BAD_PAYLOAD');
        };

        const urls = [
          `${baseApiUrl}/fanarts/gallery?t=${galleryCacheBust}`,
          `/api/fanarts/gallery?t=${galleryCacheBust}`
        ];

        for (const url of urls) {
          try {
            const rows = await fetchOnce(url);
            setGalleryFanarts(rows);
            return;
          } catch {
          }
        }

        setGalleryFanarts(null);
      } catch {
        setGalleryFanarts(null);
      }
    };
    void run();
  }, [baseApiUrl, galleryCacheBust]);
  
  // 提取所有有圖片的 MV 作為篩選選項
  const availableMVs = useMemo(() => {
    return mvData
      .filter(mv => Array.isArray(mv.images) && mv.images.some(img => img.type === 'fanart'))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [mvData]);

  // 提取所有年份
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    availableMVs.forEach(mv => {
      if (mv.date) years.add(mv.date.substring(0, 4));
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [availableMVs]);

  const yearCounts = useMemo(() => {
    const map = new Map<string, number>();
    availableMVs.forEach(mv => {
      const year = mv.date?.substring(0, 4);
      if (!year) return;
      map.set(year, (map.get(year) || 0) + 1);
    });
    return map;
  }, [availableMVs]);

  // 提取所有專輯
  const availableAlbums = useMemo(() => {
    const albums = new Set<string>();
    availableMVs.forEach(mv => {
      if (mv.albums && Array.isArray(mv.albums)) {
        mv.albums.forEach(a => {
          const name = typeof a === 'object' ? (a as any).name : a;
          if (name) albums.add(name.trim());
        });
      } else if (mv.albums && typeof mv.albums === 'string') {
        (mv.albums as string).split(',').map(a => a.trim()).filter(Boolean).forEach(a => albums.add(a));
      }
    });
    return Array.from(albums).sort();
  }, [availableMVs]);

  const albumCounts = useMemo(() => {
    const map = new Map<string, number>();
    availableMVs.forEach(mv => {
      const albumNames: string[] = [];
      if (mv.albums && Array.isArray(mv.albums)) {
        mv.albums.forEach(a => {
          const name = typeof a === 'object' ? (a as any).name : a;
          if (name) albumNames.push(String(name).trim());
        });
      } else if (mv.albums && typeof mv.albums === 'string') {
        (mv.albums as string)
          .split(',')
          .map(a => a.trim())
          .filter(Boolean)
          .forEach(a => albumNames.push(a));
      }

      Array.from(new Set(albumNames)).forEach(name => {
        if (!name) return;
        map.set(name, (map.get(name) || 0) + 1);
      });
    });
    return map;
  }, [availableMVs]);

  // 狀態：選中的 MV IDs
  const [selectedMvs, setSelectedMvs] = useState<string[]>([]);
  const [onlyCollab, setOnlyCollab] = useState<boolean>(false);
  const [onlyAcaNe, setOnlyAcaNe] = useState<boolean>(false);
  const [onlyReal, setOnlyReal] = useState<boolean>(false);
  const [onlyUniguri, setOnlyUniguri] = useState<boolean>(false);
  const [onlyOther, setOnlyOther] = useState<boolean>(false);
  
  // 狀態：初篩用的年份和專輯
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterAlbum, setFilterAlbum] = useState<string>('all');

  // 提取所有 FanArt 圖片並去重
  const allFanArts = useMemo(() => {
    if (Array.isArray(galleryFanarts)) {
      const list = galleryFanarts.map((img: any) => {
        const group = img.group || null;
        const rawTags = Array.isArray(img.tags) ? img.tags : [];
        const tags = rawTags.map(normalizeTag).filter(Boolean);
        const mvs = Array.isArray(img.mvs) ? img.mvs : [];
        const mvIds = mvs.map((m: any) => m.id).filter(Boolean);
        const mvTitles = mvs.map((m: any) => m.title).filter(Boolean);
        const like_count = group?.like_count ?? 0;
        return {
          ...img,
          tags,
          mvIds,
          mvTitles,
          tweetUrl: group?.source_url,
          tweetAuthor: group?.author_name,
          tweetHandle: group?.author_handle,
          tweetDate: group?.post_date,
          tweetText: group?.source_text,
          like_count
        };
      });

      return list.sort((a: any, b: any) => {
        const dateA = a.tweetDate || '';
        const dateB = b.tweetDate || '';
        return String(dateB).localeCompare(String(dateA));
      });
    }

    const fanArtMap = new Map<string, any>();
    
    mvData.forEach(mv => {
      if (mv.images && Array.isArray(mv.images)) {
        mv.images.forEach(img => {
          // 只抓取明確標記為 fanart 的圖片
          if (img.type === 'fanart') {
            // 使用 url + tweetUrl 組合或只用 url 作為 key
            const key = img.url;
            const like_count = (img as any).like_count ?? (img as any).group?.like_count ?? 0;
            const rawTags = Array.isArray((img as any).tags) ? (img as any).tags : [];
            const normalizedTags = rawTags.map(normalizeTag).filter(Boolean);
            
            if (fanArtMap.has(key)) {
              const existing = fanArtMap.get(key)!;
              if (!existing.mvIds.includes(mv.id)) {
                existing.mvIds.push(mv.id);
                existing.mvTitles.push(mv.title);
              }
              const nextTags = Array.from(new Set([...(existing.tags || []), ...normalizedTags]));
              existing.tags = nextTags;
              existing.like_count = Math.max(existing.like_count || 0, like_count || 0);
            } else {
              fanArtMap.set(key, {
                ...img,
                tags: normalizedTags,
                mvIds: [mv.id],
                mvTitles: [mv.title],
                like_count
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
        if (!mv.albums) {
          matchAlbum = false;
        } else if (Array.isArray(mv.albums)) {
          matchAlbum = mv.albums.map(a => typeof a === 'object' ? (a as any).name.trim() : a.trim()).includes(filterAlbum);
        } else if (typeof mv.albums === 'string') {
          const albumList = (mv.albums as string).split(',').map(a => a.trim());
          matchAlbum = albumList.includes(filterAlbum);
        }
      }
      
      return matchYear && matchAlbum;
    });
  }, [availableMVs, filterYear, filterAlbum]);

  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);

  const selectedSpecialTags = useMemo(() => {
    const tags: string[] = [];
    if (onlyAcaNe) tags.push('tag:acane');
    if (onlyReal) tags.push('tag:real');
    if (onlyUniguri) tags.push('tag:uniguri');
    if (onlyOther) tags.push('tag:other');
    return tags;
  }, [onlyAcaNe, onlyReal, onlyUniguri, onlyOther]);

  const matchSpecialTags = (tags: string[]) => {
    if (selectedSpecialTags.length === 0) return true;
    return selectedSpecialTags.some(t => tags.includes(t));
  };

  const baseFilteredFanArts = useMemo(() => {
    return allFanArts.filter(art => {
      const tags = Array.isArray(art.tags) ? art.tags : [];
      const isCollab = tags.includes('tag:collab');
      if (onlyCollab && !isCollab) return false;
      if (!matchSpecialTags(tags)) return false;
      return true;
    });
  }, [allFanArts, onlyCollab, selectedSpecialTags]);

  const mvFanArtCounts = useMemo(() => {
    const map = new Map<string, number>();
    baseFilteredFanArts.forEach(art => {
      art.mvIds.forEach((id: string) => {
        map.set(id, (map.get(id) || 0) + 1);
      });
    });
    return map;
  }, [baseFilteredFanArts]);

  const specialTagCounts = useMemo(() => {
    const map = new Map<string, number>();
    allFanArts.forEach(art => {
      const tags = Array.isArray(art.tags) ? art.tags : [];
      (['tag:acane', 'tag:real', 'tag:uniguri', 'tag:other'] as const).forEach(tag => {
        if (tags.includes(tag)) map.set(tag, (map.get(tag) || 0) + 1);
      });
    });
    return map;
  }, [allFanArts]);

  const collabCount = useMemo(() => {
    return allFanArts.filter(art => {
      const tags = Array.isArray(art.tags) ? art.tags : [];
      const isCollab = tags.includes('tag:collab');
      if (!isCollab) return false;
      if (!matchSpecialTags(tags)) return false;
      return true;
    }).length;
  }, [allFanArts, selectedSpecialTags]);

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
  const filteredFanArts = useMemo(() => {
    return allFanArts.filter(art => {
      const tags = Array.isArray(art.tags) ? art.tags : [];
      const isCollab = tags.includes('tag:collab');
      
      if (onlyCollab && !isCollab) return false;

      if (!matchSpecialTags(tags)) return false;
      
      // 如果沒有選擇任何 MV，則顯示全部符合上述條件的
      if (selectedMvs.length === 0) return true;
      
      // 如果有選擇 MV，該圖片必須關聯到至少一個選中的 MV
      return art.mvIds.some(id => selectedMvs.includes(id));
    });
  }, [allFanArts, onlyCollab, selectedSpecialTags, selectedMvs]);

  const { shuffledFanArts, shuffleKey } = useMemo(() => {
    const next = [...filteredFanArts];
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    const nextKey =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? (crypto as Crypto).randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    return { shuffledFanArts: next, shuffleKey: nextKey };
  }, [filteredFanArts]);

  const fancyboxImages = useMemo(() => {
    return shuffledFanArts.map(art => {
      const authorText = art.tweetAuthor ? `@${art.tweetHandle || art.tweetAuthor}` : '';
      const baseCaption = art.caption || (authorText ? `FanArt by ${authorText}` : 'FanArt');
      
      let richText = art.richText || '';
      if (!richText) {
        const postContent = art.caption ? art.caption.replace(/\n/g, '<br/>') : '';
        const linkHtml = art.tweetUrl ? `<br/><br/><a href="${art.tweetUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">View Original Tweet <i class="hn hn-external-link"></i></a>` : '';
        richText = `<div class="author">${authorText || 'FanArt'}</div><div class="post">${postContent}${linkHtml}</div>`;
      }

      return {
        ...art,
        caption: baseCaption,
        richText
      };
    });
  }, [shuffledFanArts]);

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
                  {onlyCollab ? ' (只看大合繪)' : ''}
                  {onlyAcaNe ? ' (ACAね)' : ''}
                  {onlyReal ? ' (實物)' : ''}
                  {onlyUniguri ? ' (海膽栗子/生薑)' : ''}
                  {onlyOther ? ' (其他)' : ''}
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
            <div className="flex items-center gap-3 p-3 border-2 border-black bg-black/5 cursor-pointer hover:bg-black/10 transition-colors" onClick={() => setOnlyCollab(!onlyCollab)}>
              <div className={`w-5 h-5 border-2 border-black flex items-center justify-center ${onlyCollab ? 'bg-main' : 'bg-card'}`}>
                {onlyCollab && <i className="hn hn-check text-xs font-black"></i>}
              </div>
              <Label className="font-bold cursor-pointer">{t('fanart.only_collab', '只看 綜合插畫 (多角色 / 大合繪)')} ({collabCount})</Label>
            </div>

            <div className="flex items-center gap-3 p-3 border-2 border-black bg-black/5 cursor-pointer hover:bg-black/10 transition-colors" onClick={() => setOnlyAcaNe(!onlyAcaNe)}>
              <div className={`w-5 h-5 border-2 border-black flex items-center justify-center ${onlyAcaNe ? 'bg-main' : 'bg-card'}`}>
                {onlyAcaNe && <i className="hn hn-check text-xs font-black"></i>}
              </div>
              <Label className="font-bold cursor-pointer">{t('fanart.only_aca_ne', '只看 ACAね')} ({specialTagCounts.get('tag:acane') || 0})</Label>
            </div>

            <div className="flex items-center gap-3 p-3 border-2 border-black bg-black/5 cursor-pointer hover:bg-black/10 transition-colors" onClick={() => setOnlyReal(!onlyReal)}>
              <div className={`w-5 h-5 border-2 border-black flex items-center justify-center ${onlyReal ? 'bg-main' : 'bg-card'}`}>
                {onlyReal && <i className="hn hn-check text-xs font-black"></i>}
              </div>
              <Label className="font-bold cursor-pointer">只看 實物 ({specialTagCounts.get('tag:real') || 0})</Label>
            </div>

            <div className="flex items-center gap-3 p-3 border-2 border-black bg-black/5 cursor-pointer hover:bg-black/10 transition-colors" onClick={() => setOnlyUniguri(!onlyUniguri)}>
              <div className={`w-5 h-5 border-2 border-black flex items-center justify-center ${onlyUniguri ? 'bg-main' : 'bg-card'}`}>
                {onlyUniguri && <i className="hn hn-check text-xs font-black"></i>}
              </div>
              <Label className="font-bold cursor-pointer">只看 海膽栗子/生薑 ({specialTagCounts.get('tag:uniguri') || 0})</Label>
            </div>

            <div className="flex items-center gap-3 p-3 border-2 border-black bg-black/5 cursor-pointer hover:bg-black/10 transition-colors" onClick={() => setOnlyOther(!onlyOther)}>
              <div className={`w-5 h-5 border-2 border-black flex items-center justify-center ${onlyOther ? 'bg-main' : 'bg-card'}`}>
                {onlyOther && <i className="hn hn-check text-xs font-black"></i>}
              </div>
              <Label className="font-bold cursor-pointer">只看 其他 ({specialTagCounts.get('tag:other') || 0})</Label>
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
                  <option value="all">所有年份 (ALL YEARS) ({availableMVs.length})</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year} ({yearCounts.get(year) || 0})</option>
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
                  <option value="all">所有專輯 (ALL ALBUMS) ({availableMVs.length})</option>
                  {availableAlbums.map(album => (
                    <option key={album} value={album}>{album} ({albumCounts.get(album) || 0})</option>
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
                      <span className="text-xs font-bold truncate flex-1" title={mv.title} lang="ja">{mv.title}</span>
                      <span className="text-[10px] font-black opacity-70 shrink-0">{mvFanArtCounts.get(mv.id) || 0}</span>
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
              {t('fanart.apply_filters', '套用並收起 ({{count}} 張作品)', { count: filteredFanArts.length })}
            </button>
          </div>
        </div>
      </div>

      {/* FanArt 畫廊區塊 */}
      {fancyboxImages.length > 0 ? (
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 pb-12">
          <FancyboxViewer
            key={shuffleKey}
            images={fancyboxImages}
            itemsPerPage={20}
            autoLoadMore={false}
            enablePagination={true}
            showHeader={false}
            breakpointColumns={{ default: 1, 640: 2, 1024: 3, 1280: 4 }}
            className="!p-0 !min-h-0"
          />
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
