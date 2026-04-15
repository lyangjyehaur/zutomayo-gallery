import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { MVItem } from '@/lib/types';
import { Utils } from '@/assets/js/modules/utils.js';
import { MVCard } from '@/components/MVCard';
import { MVDetailsModal } from '@/components/MVDetailsModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminPage } from '@/pages/AdminPage';
import DebugLightGallery from '@/debug/DebugLightGallery';
import { STORAGE_KEYS, storage } from '@/config/storage';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// 像素風格心形圖標
const PixelHeart = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M4 8h2v2H4V8zm2-2h2v2H6V6zm2-2h2v2H8V4zm2 0h4v2h-4V4zm4 0h2v2h-2V4zm2 2h2v2h-2V6zm2 2h2v2h-2V8zm0 2h-2v2h2v-2zm-2 2h-2v2h2v-2zm-2 2h-2v2h2v-2zm-2 2h-2v2h2v-2zm-2-2H8v-2h2v2zm-2-2H6v-2h2v2z" />
  </svg>
);

function App({ mvData, isLoading, error }: { mvData: MVItem[], isLoading: boolean, error: string | null }) {
  // 初始化工具類 (傳入一個模擬的 app 對象)
  const utils = useMemo(() => new (Utils as any)({ CONFIG: {}, state: {} }), []);
  const navigate = useNavigate();
  const { id: routeMvId } = useParams();
  const location = useLocation();

  // 狀態管理
  const [search, setSearch] = useState<string>("");
  const [yearFilter, setYearFilter] = useState<string>("");
  const [albumFilter, setAlbumFilter] = useState<string>("all");
  const [artistFilter, setArtistFilter] = useState<string>("all");
  const [favorites, setFavorites] = useState<string[]>(() => {
    return storage.get<string[]>(STORAGE_KEYS.FAVORITES, []) || [];
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 從路由派生狀態
  const showFavOnly = location.pathname === '/favorites';
  const selectedMvId = routeMvId || null;

  // 初始化全局邏輯
  useEffect(() => {
    utils.initAnalytics();
    utils.printEgg();
    document.documentElement.classList.add('dark');
  }, [utils]);

  // 動態獲取唯一的年份、專輯與藝術家清單
  const { uniqueYears, uniqueAlbums, uniqueArtists } = useMemo(() => {
    const years = new Set<string>();
    const albums = new Set<string>();
    const artists = new Set<string>();
    mvData.forEach(mv => {
      if (mv.year) years.add(mv.year);
      mv.album?.forEach(a => albums.add(a));
      if (mv.artist) artists.add(mv.artist);
    });
    return {
      uniqueYears: Array.from(years).sort((a, b) => b.localeCompare(a)), // 年份降序
      uniqueAlbums: Array.from(albums).sort(),
      uniqueArtists: Array.from(artists).sort()
    };
  }, [mvData]);

  // 自動過濾與排序邏輯 (取代原本的 FilterManager)
  const filteredData = useMemo(() => {
    let data = mvData.filter(mv => {
      const matchesSearch = !search || 
        mv.title.toLowerCase().includes(search.toLowerCase()) ||
        (mv.keywords && mv.keywords.some(k => k.toLowerCase().includes(search.toLowerCase())));
      
      const matchesYear = !yearFilter || 
        yearFilter === "all" ||
        mv.year === yearFilter || 
        (mv.date && mv.date.startsWith(yearFilter));

      const matchesAlbum = albumFilter === "all" || (mv.album && mv.album.includes(albumFilter));

      const matchesArtist = artistFilter === "all" || mv.artist === artistFilter;

      const matchesFav = !showFavOnly || favorites.includes(mv.id);

      return matchesSearch && matchesYear && matchesAlbum && matchesArtist && matchesFav;
    });

    return [...data].sort((a, b) => {
      const dateA = `${a.year}-${a.date || ''}`;
      const dateB = `${b.year}-${b.date || ''}`;
      return sortOrder === 'desc' 
        ? dateB.localeCompare(dateA) 
        : dateA.localeCompare(dateB);
    });
  }, [mvData, search, yearFilter, albumFilter, artistFilter, favorites, showFavOnly, sortOrder]);

  // 收藏切換
  const toggleFav = useCallback((id: string) => {
    const newFavs = favorites.includes(id) 
      ? favorites.filter(favId => favId !== id)
      : [...favorites, id];
    setFavorites(newFavs);
    storage.set(STORAGE_KEYS.FAVORITES, newFavs);
    
    // 同步到其他標籤頁
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('favorites_sync');
      channel.postMessage(newFavs);
      channel.close();
    }
  }, [favorites]);
  
  // 監聽其他標籤頁的收藏變化
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    
    const channel = new BroadcastChannel('favorites_sync');
    channel.onmessage = (e) => {
      setFavorites(e.data);
    };
    
    return () => channel.close();
  }, []);

  // 獲取當前選中的 MV 對象
  const selectedMv = useMemo(() => 
    mvData.find(m => m.id === selectedMvId) || null
  , [selectedMvId, mvData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-base text-foreground crt-lines">
        <div className="text-4xl font-black animate-glitch mb-4 uppercase tracking-tighter">Connecting_Database...</div>
        <div className="w-64 h-4 border-2 border-border p-0.5 bg-card shadow-shadow">
          <div className="h-full bg-main animate-pulse w-1/3"></div>
        </div>
        <p className="mt-6 text-xs opacity-50 font-mono">SIGNAL_STRENGTH: WEAK... PLEASE_WAIT</p>
      </div>
    );
  }

  if (error && mvData.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-base text-foreground crt-lines">
        <div className="text-2xl font-black mb-4 text-red-500 uppercase tracking-tighter">Database_Sync_Failed</div>
        <p className="text-sm opacity-70 mb-8">{error}</p>
        <Button onClick={() => window.location.reload()} variant="reverse">重試連線</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-base font-normal selection:bg-main selection:text-main-foreground dark">
      {/* 頁首 */}
      <header className="py-12 text-center border-b-4 border-border bg-card shadow-shadow mb-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none crt-lines"></div>
        <h1 className="text-5xl font-black flex items-center justify-center gap-4 tracking-tighter">
          ZUTOMAYO MV Gallery
          <span className="text-xs bg-main/20 text-main border-3 border-main px-2 py-1 animate-pulse">V3.0 (TSX)</span>
        </h1>
        <p className="mt-2 text-sm opacity-70">日々研磨爆裂中！</p>
      </header>

      <main className="container mx-auto px-4 max-w-7xl">
        {/* 過濾控制列 */}
        <div className="flex flex-wrap gap-4 mb-12">
          <Input 
            type="text" 
            placeholder="關鍵字檢索..."
            className="flex-1 min-w-[200px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="年份（所有）" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>發布年份</SelectLabel>
                <SelectItem value="all">所有年份</SelectItem>
                {uniqueYears.map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select value={albumFilter} onValueChange={setAlbumFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="專輯（所有）" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>專輯篩選</SelectLabel>
                <SelectItem value="all">所有專輯</SelectItem>
                {uniqueAlbums.map(album => (
                  <SelectItem key={album} value={album}>{album}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select value={artistFilter} onValueChange={setArtistFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="MV製作（所有）" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>製作單位</SelectLabel>
                <SelectItem value="all">所有製作</SelectItem>
                {uniqueArtists.map(artist => (
                  <SelectItem key={artist} value={artist}>{artist}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Button 
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            variant="neutral"
          >
            <i className={`fa-solid ${sortOrder === 'desc' ? 'fa-arrow-down-wide-short' : 'fa-arrow-up-wide-short'}`}></i>
            排序
          </Button>

          <Button 
            onClick={() => navigate(showFavOnly ? '/' : '/favorites')}
            variant={showFavOnly ? "noShadow" : "default"}
          >
            <i className={`fa-solid fa-star ${showFavOnly ? 'text-white' : ''}`}></i>
            {showFavOnly ? '顯示全部' : '只看收藏'}
          </Button>
        </div>

        {/* 畫廊網格：恢復為整齊的 Grid 佈局 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredData.map(mv => (
            <MVCard 
              key={mv.id} 
              mv={mv} 
              isFav={favorites.includes(mv.id)} 
              onToggleFav={() => toggleFav(mv.id)} 
              onClick={() => navigate(`/mv/${mv.id}`)}
            />
          ))}
        </div>
      </main>

      {/* 頁尾 Footer */}
      <footer className="mt-24 border-t-4 border-border bg-card relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none crt-lines"></div>
        <div className="container mx-auto px-4 py-16 max-w-7xl relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
            {/* 品牌資訊 */}
            {/* <div className="space-y-4">
              <div className="text-2xl font-black uppercase tracking-tighter inline-block border-b-4 border-main pb-1">
                ZTMY_GALLERY
              </div>
              <p className="text-[10px] font-mono opacity-50 uppercase leading-loose">
                STATUS: ONLINE<br/>
                CONNECTION: SECURED<br/>
                ENCRYPTION: AES-256-ZTMY<br/>
                LOCATION: UNKNOWN_SECTOR
              </p>
            </div> */}

            {/* 快速導航 */}
            {/* <div className="flex flex-col gap-2">
              <span className="text-xs font-black uppercase tracking-widest mb-2 opacity-30">Internal_Links</span>
              <button onClick={() => navigate('/')} className="text-xs font-bold hover:text-main transition-colors uppercase text-left w-fit">//_Home_Base</button>
              <button onClick={() => navigate('/favorites')} className="text-xs font-bold hover:text-main transition-colors uppercase text-left w-fit">//_Favorites_List</button>
              <button onClick={() => navigate('/admin')} className="text-xs font-bold hover:text-main transition-colors uppercase text-left w-fit">//_Maintenance_Terminal</button>
            </div> */}

            {/* 操作與聲明 */}
            <div className="flex flex-col items-start md:items-end gap-6">
              <Button 
                variant="neutral" 
                className="border-3 border-black shadow-neo-sm bg-main text-black font-black italic text-xs"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              >
                SCROLL_TO_TOP_SIGNAL
              </Button>
              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest bg-black text-white px-3 py-1 border-2 border-main">
                MADE_WITH <PixelHeart className="size-4 text-red-500 animate-pulse" /> BY_ACA-NE_FANS
              </div>
            </div>
          </div>

                    {/* 三語版權聲明區塊 */}
                    <div className="mt-16 p-8 border-4 border-black bg-black/5 relative group">
                      <div className="absolute -top-4 left-6 bg-black text-main px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] border-2 border-main">
                        Legal_Signal_Broadcast
                      </div>
                      
                      <div className="grid grid-cols-1  gap-10">
                        {/* 中文 */}
                        <div className="space-y-3">
                          <p className="text-[10px] leading-relaxed opacity-60">
                            本站為「<span lang="ja">ずっと真夜中でいいのに。</span>」（ZUTOMAYO）粉絲建立之非官方資料庫，僅供同好交流與內容整理之用，無任何商業營利行為。<br />本站伺服器不存儲任何原始檔案，所收錄之影片、圖片、設定圖、插圖及相關視覺素材版權均屬原作者及其所屬機構所有。<br />若版權方有任何疑慮或下架要求，請與我們聯繫。</p>
                          <p lang="ja" className="text-[10px] leading-relaxed opacity-60">
                            本サイトは「ずっと真夜中でいいのに。」（ZUTOMAYO）のファンによって運営されている非公式アーカイブであり、ファン同士の交流およびコンテンツの整理を目的としています。営利目的の運営は一切行っておりません。<br />本サイトのサーバーにはオリジナルのファイルは保存されておらず、掲載されている動画、画像、設定画、イラスト、その他の視覚素材の著作権は、すべて原作者および権利所有者に帰属します。<br />権利者様の方で掲載に問題がある場合や削除をご希望の際は、お手数ですがご連絡いただけますようお願い申し上げます。</p>
                          <p lang="en" className="text-[10px] leading-relaxed opacity-60">
                            This is an unofficial fan-made archive site for "ZUTOMAYO" (Zutto Mayonaka de ii Noni.), created for community exchange and content organization with no commercial intent. <br />No original image files are stored on our servers. All copyrights to the videos, images, concept art, illustrations, and related visual materials belong to their respective creators and organizations. <br />If you are a copyright holder and have concerns or requests for content removal, please contact us.</p>
                        </div>
                      </div>
                    </div>
          
          <div className="mt-16 pt-8 border-t-2 border-black/5 flex flex-col md:flex-row justify-between items-center gap-4 opacity-30 text-[8px] font-mono uppercase tracking-[0.2em]">
            <span>© 2024 ZTMY_MV_ARCHIVE_SYSTEM_v3</span>
            <span className="text-center md:text-right">THIS_IS_A_FAN_MADE_PROJECT_FOR_EDUCATIONAL_PURPOSES</span>
          </div>
        </div>
      </footer>

      {/* 詳情彈窗 */}
      <MVDetailsModal 
        mv={selectedMv} 
        onClose={() => navigate(showFavOnly ? '/favorites' : '/')} 
      />
    </div>
  );
}

// 為了支援 useParams，我們需要導出一個包裹了路由環境的組件
export default function RootApp() {
  const [mvData, setMvData] = useState<MVItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      try {
        setIsLoading(true);
        // 使用環境變數，若無則回退到預設路徑
        const apiUrl = import.meta.env.VITE_API_URL || '/api/mvs';
        const response = await fetch(apiUrl, { signal: controller.signal });

        if (!response.ok) throw new Error('API 伺服器無回應 (404/500)');
        const result = await response.json();
        // 適配新的 API 響應格式 {success, data, count}
        setMvData(result.data || result);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error("API Fetch Error:", err.message);
        setError(err.message);
      } finally {
        // 給予一個微小的延遲，讓加載動畫顯示出來
        setTimeout(() => setIsLoading(false), 800);
      }
    };

    fetchData();

    return () => controller.abort();
  }, [location.pathname]); // 監聽路徑變化，方便在管理頁面保存後手動觸發刷新

  const commonProps = { mvData, isLoading, error };

  return (
    <Routes>
      <Route path="/" element={<App {...commonProps} />} />
      <Route path="/favorites" element={<App {...commonProps} />} />
      <Route path="/mv/:id" element={<App {...commonProps} />} />
      <Route path="/admin" element={<AdminPage mvData={mvData} onRefresh={() => window.location.href = window.location.href} />} />
      <Route path="/debug/lg/:mvid?" element={<DebugLightGallery />} />
      {/* <Route path="/debug/:mvid?" element={<DebugFancyBox mvData={mvData} />} /> */}
      {/* <Route path="/debug" element={<Hello {...commonProps} />} /> */}
    </Routes>
  );
}