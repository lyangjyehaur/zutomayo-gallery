import React, { useState, useMemo, useEffect } from 'react';
import { MV_DATA } from '../assets/js/data.js';
import { Utils } from '../assets/js/modules/utils.js';
import { MVCard } from '@/components/MVCard';
import { MVDetailsModal } from '@/components/MVDetailsModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function App() {
  // 初始化工具類 (傳入一個模擬的 app 對象)
  const utils = useMemo(() => new Utils({ CONFIG: {}, state: {} }), []);

  // 狀態管理
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('ztmy_favs_v2');
    return saved ? JSON.parse(saved) : [];
  });
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedMvId, setSelectedMvId] = useState(null);

  // 初始化全局邏輯
  useEffect(() => {
    utils.initAnalytics();
    utils.printEgg();
    
    // 檢查初始 Hash (例如 #byoushinwo-kamu)
    const hash = window.location.hash.slice(1);
    if (hash && MV_DATA.some(m => m.id === hash)) {
      setSelectedMvId(hash);
    }
  }, [utils]);

  // 當選中 MV 變化時更新 Hash
  useEffect(() => {
    utils.updateUrlHash(selectedMvId);
  }, [selectedMvId, utils]);

  // 自動過濾與排序邏輯 (取代原本的 FilterManager)
  const filteredData = useMemo(() => {
    let data = MV_DATA.filter(mv => {
      const matchesSearch = !search || 
        mv.title.toLowerCase().includes(search.toLowerCase()) ||
        (mv.keywords && mv.keywords.some(k => k.toLowerCase().includes(search.toLowerCase())));
      
      const matchesYear = !yearFilter || 
        yearFilter === "all" ||
        mv.year === yearFilter || 
        (mv.date && mv.date.startsWith(yearFilter));

      const matchesFav = !showFavOnly || favorites.includes(mv.id);

      return matchesSearch && matchesYear && matchesFav;
    });

    return sortOrder === 'desc' ? [...data].reverse() : [...data];
  }, [search, yearFilter, favorites, showFavOnly, sortOrder]);

  // 收藏切換
  const toggleFav = (id) => {
    const newFavs = favorites.includes(id) 
      ? favorites.filter(favId => favId !== id)
      : [...favorites, id];
    setFavorites(newFavs);
    localStorage.setItem('ztmy_favs_v2', JSON.stringify(newFavs));
  };

  // 獲取當前選中的 MV 對象
  const selectedMv = useMemo(() => 
    MV_DATA.find(m => m.id === selectedMvId)
  , [selectedMvId]);

  return (
    <div className="min-h-screen bg-bg text-white font-sans selection:bg-ztmyYellow selection:text-black">
      {/* 頁首 */}
      <header className="py-8 text-center border-b-3 border-black bg-card shadow-neo mb-8">
        <h1 className="text-3xl font-bold dotgothic16-regular flex items-center justify-center gap-4">
          ZUTOMAYO MV Gallery
          <span className="text-xs bg-ztmy-green/20 text-ztmy-green border border-ztmy-green px-2 py-1 rounded-none">V3.0 (React)</span>
        </h1>
        <p className="mt-2 text-sm opacity-70">日々研磨爆裂中！</p>
      </header>

      <main className="container mx-auto px-4 max-w-7xl">
        {/* 過濾控制列 */}
        <div className="flex flex-wrap gap-4 mb-8">
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
                {[2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Button 
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            variant="dark"
            className="flex items-center gap-2"
          >
            <i className={`fa-solid ${sortOrder === 'desc' ? 'fa-sort-down' : 'fa-sort-up'}`}></i>
            排序
          </Button>

          <Button 
            onClick={() => setShowFavOnly(!showFavOnly)}
            variant={showFavOnly ? "yellow" : "dark"}
            className="flex items-center gap-2"
          >
            <i className="fa-solid fa-star"></i>
            {showFavOnly ? '顯示全部' : '只看收藏'}
          </Button>
        </div>

        {/* 畫廊網格 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredData.map(mv => (
            <MVCard 
              key={mv.id} 
              mv={mv} 
              isFav={favorites.includes(mv.id)} 
              onToggleFav={() => toggleFav(mv.id)} 
              onClick={() => setSelectedMvId(mv.id)}
            />
          ))}
        </div>
      </main>

      {/* 詳情彈窗 */}
      <MVDetailsModal 
        mv={selectedMv} 
        onClose={() => setSelectedMvId(null)} 
      />
    </div>
  );
}

export default App;