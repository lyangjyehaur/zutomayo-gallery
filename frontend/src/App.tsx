import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
  memo
} from "react";
import {
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import { MVItem } from "@/lib/types";
import { initAnalytics } from "@/lib/analytics";
import { printEgg } from "@/lib/egg";
import { initGeo } from "@/lib/geo";
import { MVCard } from "@/components/MVCard";
import { MVDetailsModal } from "@/components/MVDetailsModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminPage } from "@/pages/AdminPage";
import { AdminDBPage } from "@/pages/AdminDBPage";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import DebugLightGallery from "@/debug/DebugLightGallery";
import DebugFancyboxMasonry from "@/debug/DebugFancyboxMasonry";
import DebugMVModalLightbox from "@/debug/DebugMVModalLightbox";
import { STORAGE_KEYS, storage } from "@/config/storage";
import { VERSION_CONFIG } from "@/config/version";
import { ALBUM_CATEGORIES } from "@/config/albums";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useLazyImage } from "@/hooks/useLazyImage";
import Marquee from "@/components/ui/marquee";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { WalineComments } from "@/components/WalineComments";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import useSWR from "swr";

import { MaintenancePage } from "@/pages/MaintenancePage";

const AnimatedMVCardItem = memo(function AnimatedMVCardItem({
  mv,
  isFav,
  onToggleFav,
  onClick,
  delayMs,
  isPaused,
}: {
  mv: MVItem;
  isFav: boolean;
  onToggleFav: () => void;
  onClick: () => void;
  delayMs: number;
  isPaused: boolean;
}) {
  const { elementRef, shouldLoad } = useLazyImage({
    rootMargin: "800px",
    threshold: 0,
    triggerOnce: true,
  });

  // 偵測是否離開可視範圍來暫停動畫
  const [isInView, setIsInView] = useState(true);
  useEffect(() => {
    if (!elementRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, []);

  const isEffectivelyPaused = isPaused || !isInView;

  const className = shouldLoad
    ? "animate-in fade-in slide-in-from-bottom-4 duration-500 motion-reduce:animate-none"
    : "opacity-0 translate-y-4 motion-reduce:opacity-100 motion-reduce:translate-y-0";

  return (
    <div
      ref={elementRef}
      className={className}
      style={{
        ...(shouldLoad
          ? { animationDelay: `${delayMs}ms`, animationFillMode: "both" }
          : {}),
      }}
    >
      <div style={{ animationPlayState: isEffectivelyPaused ? "paused" : "running", height: "100%" }}>
        <MVCard
          mv={mv}
          isFav={isFav}
          onToggleFav={onToggleFav}
          onClick={onClick}
          isPaused={isEffectivelyPaused}
        />
      </div>
    </div>
  );
});

function App({
  mvData,
  isLoading,
  error,
  metadata,
}: {
  mvData: MVItem[];
  isLoading: boolean;
  error: string | null;
  metadata: {
    albumMeta: Record<string, { date?: string; hideDate?: boolean }>;
    artistMeta: Record<string, { id?: string; hideId?: boolean }>;
    settings: { showAutoAlbumDate: boolean; announcements?: string[] };
  };
}) {
  const navigate = useNavigate();
  const { id: routeMvId } = useParams();
  const location = useLocation();

  // 狀態管理
  const [search, setSearch] = useState<string>("");
  const [yearFilter, setYearFilter] = useState<string[]>([]);
  const [albumFilter, setAlbumFilter] = useState<string[]>([]);
  const [artistFilter, setArtistFilter] = useState<string[]>([]);
  const [openYear, setOpenYear] = useState(false);
  const [openAlbum, setOpenAlbum] = useState(false);
  const [openArtist, setOpenArtist] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    return storage.get<string[]>(STORAGE_KEYS.FAVORITES, []) || [];
  });
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [shouldRenderFeedback, setShouldRenderFeedback] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1024 : false,
  );
  const [geoLabelCn, setGeoLabelCn] = useState<string>("判斷中...");
  const [geoLabelEn, setGeoLabelEn] = useState<string>("DETECTING...");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    
    // 取得地理位置標籤
    initGeo().then(info => {
      if (info.isVPN) {
        // 彩蛋：VPN/翻牆用戶 (時區在大陸但 IP 在海外)
        setGeoLabelCn("躍遷版");
        setGeoLabelEn("WARP");
      } else {
        setGeoLabelCn(info.isChinaIP ? "內地版" : "海外版");
        setGeoLabelEn(info.isChinaIP ? "MAINLAND" : "OVERSEAS");
      }
    });
    
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 處理反饋抽屜的延遲卸載，以保留滑出動畫
  useEffect(() => {
    if (isFeedbackOpen) {
      setShouldRenderFeedback(true);
    } else {
      const timer = setTimeout(() => {
        setShouldRenderFeedback(false);
      }, 500); // 對齊 CSS 動畫的 500ms
      return () => clearTimeout(timer);
    }
  }, [isFeedbackOpen]);

  // 從路由派生狀態
  const showFavOnly = location.pathname === "/favorites";
  const selectedMvId = routeMvId || null;

  // 動態獲取唯一的年份、專輯與藝術家清單，並處理分組
  const {
    uniqueYears,
    uniqueAlbums,
    groupedAlbums,
    uniqueArtists,
    albumDateMap,
  } = useMemo(() => {
    const years = new Set<string>();
    const albums = new Set<string>();
    const artists = new Set<string>();
    const computedDateMap: Record<string, string> = {};

    mvData.forEach((mv) => {
      if (mv.year) years.add(mv.year);
      mv.album?.forEach((a) => {
        albums.add(a);
        if (mv.date && (!computedDateMap[a] || mv.date < computedDateMap[a])) {
          computedDateMap[a] = mv.date.replace(/\//g, "/"); // 保持原始日期格式
        }
      });
      mv.artist?.forEach((a) => artists.add(a));
    });

    const albumList = Array.from(albums).sort();
    const dateMap: Record<string, string> = {};
    const showAutoAlbumDate = metadata?.settings?.showAutoAlbumDate === true;
    const albumMeta = metadata?.albumMeta || {};

    albumList.forEach((album) => {
      const meta = albumMeta[album];
      if (meta) {
        if (meta.hideDate) return;
        if (meta.date && meta.date.trim()) dateMap[album] = meta.date;
        return;
      }
      if (showAutoAlbumDate && computedDateMap[album]) {
        dateMap[album] = computedDateMap[album];
      }
    });

    // 將取得的專輯動態分組，並嚴格依照 ALBUM_CATEGORIES 中的 items 順序排列
    const groups: Record<string, string[]> = {
      full: ALBUM_CATEGORIES.full.items.filter((album) => albums.has(album)),
      mini: ALBUM_CATEGORIES.mini.items.filter((album) => albums.has(album)),
      single: [],
    };

    // 不在配置名單內的專輯，會被放入 single 分類，並依照字母順序排序
    albumList.forEach((album) => {
      if (
        !ALBUM_CATEGORIES.full.items.includes(album) &&
        !ALBUM_CATEGORIES.mini.items.includes(album)
      ) {
        groups.single.push(album);
      }
    });

    return {
      uniqueYears: Array.from(years).sort((a, b) => b.localeCompare(a)), // 年份降序
      uniqueAlbums: albumList,
      groupedAlbums: groups,
      uniqueArtists: Array.from(artists)
        .filter((a) => a && a.trim() !== "")
        .sort((a, b) => a.localeCompare(b)), // 過濾空字串並排序
      albumDateMap: dateMap,
    };
  }, [mvData, metadata]);

  // 自動過濾與排序邏輯 (取代原本的 FilterManager)
  const filteredData = useMemo(() => {
    let data = mvData.filter((mv) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        mv.title.toLowerCase().includes(searchLower) ||
        (mv.keywords &&
          mv.keywords.some((k) => k.text.toLowerCase().includes(searchLower))) ||
        (mv.description && mv.description.toLowerCase().includes(searchLower));

      const matchesYear =
        yearFilter.length === 0 ||
        yearFilter.some(
          (y) => mv.year === y || (mv.date && mv.date.startsWith(y)),
        );

      const matchesAlbum =
        albumFilter.length === 0 ||
        (mv.album && mv.album.some((a) => albumFilter.includes(a)));

      const matchesArtist =
        artistFilter.length === 0 ||
        (mv.artist && mv.artist.some((a) => artistFilter.includes(a)));

      const matchesFav = !showFavOnly || favorites.includes(mv.id);

      return (
        matchesSearch &&
        matchesYear &&
        matchesAlbum &&
        matchesArtist &&
        matchesFav
      );
    });

    return [...data].sort((a, b) => {
      const dateA = `${a.year}-${a.date || ""}`;
      const dateB = `${b.year}-${b.date || ""}`;
      return sortOrder === "desc"
        ? dateB.localeCompare(dateA)
        : dateA.localeCompare(dateB);
    });
  }, [
    mvData,
    search,
    yearFilter,
    albumFilter,
    artistFilter,
    favorites,
    showFavOnly,
    sortOrder,
  ]);

  // 收藏切換
  const toggleFav = useCallback(
    (id: string) => {
      const newFavs = favorites.includes(id)
        ? favorites.filter((favId) => favId !== id)
        : [...favorites, id];
      setFavorites(newFavs);
      storage.set(STORAGE_KEYS.FAVORITES, newFavs);

      // 同步到其他標籤頁
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const channel = new BroadcastChannel("favorites_sync");
        channel.postMessage(newFavs);
        channel.close();
      }
    },
    [favorites],
  );

  // 監聽其他標籤頁的收藏變化
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window))
      return;

    const channel = new BroadcastChannel("favorites_sync");
    channel.onmessage = (e) => {
      setFavorites(e.data);
    };

    return () => channel.close();
  }, []);

  // 無限滾動分頁狀態
  const PAGE_SIZE = 24;
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [sentinelEl, setSentinelEl] = useState<HTMLDivElement | null>(null);
  const totalCountRef = useRef<number>(filteredData.length);
  const lastBatchStartRef = useRef<number>(0);
  useEffect(() => {
    totalCountRef.current = filteredData.length;
  }, [filteredData.length]);

  // 當過濾條件改變時，重置可見數量
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    lastBatchStartRef.current = 0;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [
    search,
    yearFilter,
    albumFilter,
    artistFilter,
    showFavOnly,
    sortOrder,
  ]);

  // 返回頂部顯示狀態
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (!entry?.isIntersecting) return;
      setVisibleCount((prev) => {
        if (prev >= totalCountRef.current) return prev;
        lastBatchStartRef.current = prev;
        return Math.min(prev + PAGE_SIZE, totalCountRef.current);
      });
    },
    [],
  );

  useEffect(() => {
    if (!sentinelEl) return;

    const observer = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin: "1200px",
      threshold: 0,
    });

    observer.observe(sentinelEl);
    return () => observer.disconnect();
  }, [handleIntersect, sentinelEl]);

  // 獲取當前選中的 MV 對象
  const selectedMv = useMemo(
    () => mvData.find((m) => m.id === selectedMvId) || null,
    [selectedMvId, mvData],
  );

  const isGlobalPaused = !!selectedMvId || (isFeedbackOpen && isMobile);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const titleEl = document.querySelector(
          ".ztmy-cyber-title",
        ) as HTMLElement;
        const textEl = document.querySelector(
          ".ztmy-cyber-text",
        ) as HTMLElement;
        const pulseEl = document.querySelector(
          "header .animate-pulse",
        ) as HTMLElement;

        // 只有當 header 在畫面內，而且 modal 或 drawer(手機版) 沒打開時，才播放動畫
        const isPaused = isGlobalPaused || !entry.isIntersecting;

        if (titleEl)
          titleEl.style.animationPlayState = isPaused ? "paused" : "running";
        if (textEl)
          textEl.style.animationPlayState = isPaused ? "paused" : "running";
        if (pulseEl)
          pulseEl.style.animationPlayState = isPaused ? "paused" : "running";
      },
      { threshold: 0 },
    );

    const headerEl = document.querySelector("header");
    if (headerEl) {
      observer.observe(headerEl);
    } else {
      // 確保即使 IntersectionObserver 沒觸發，只要 modal 開啟就強制暫停
      const titleEl = document.querySelector(
        ".ztmy-cyber-title",
      ) as HTMLElement;
      const textEl = document.querySelector(".ztmy-cyber-text") as HTMLElement;
      const pulseEl = document.querySelector(
        "header .animate-pulse",
      ) as HTMLElement;

      const isPaused = isGlobalPaused;

      if (titleEl)
        titleEl.style.animationPlayState = isPaused ? "paused" : "running";
      if (textEl)
        textEl.style.animationPlayState = isPaused ? "paused" : "running";
      if (pulseEl)
        pulseEl.style.animationPlayState = isPaused ? "paused" : "running";
    }

    return () => observer.disconnect();
  }, [isGlobalPaused]);

  // 全域狀態：使用者識別與錯誤追蹤
  useEffect(() => {
    if (window.umami && typeof window.umami.identify === 'function') {
      window.umami.identify({
        favorites_count: favorites.length,
        is_mobile: isMobile ? 'true' : 'false',
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light'
      });
    }
  }, [favorites.length, isMobile]);

  useEffect(() => {
    if (error && window.umami && typeof window.umami.track === 'function') {
      window.umami.track('Z_System_Error', {
        error_type: 'Database_Sync_Failed',
        message: error.message || String(error).substring(0, 100),
        current_url: window.location.pathname
      });
    }
  }, [error]);

  // 虛擬頁面瀏覽：意見回饋抽屜
  useEffect(() => {
    if (isFeedbackOpen && window.umami && typeof window.umami.track === 'function') {
      window.umami.track((props: any) => ({
        ...props,
        url: '/virtual/feedback-drawer',
        title: '意見回饋'
      }));
    }
  }, [isFeedbackOpen]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-base text-foreground crt-lines">
        <div className="text-4xl font-black animate-glitch mb-4 uppercase tracking-tighter flex flex-col items-center leading-tight">
          <span className="tracking-normal">連線資料庫中...</span>
          <span className="text-[14px] sm:text-[16px] font-mono opacity-60 normal-case mt-2">
            Connecting_Database...
          </span>
        </div>
        <div className="w-64 h-4 border-2 border-border p-0.5 bg-card shadow-shadow">
          <div className="h-full bg-main animate-pulse w-1/3"></div>
        </div>
        <div className="mt-6 text-xs opacity-50 font-mono flex flex-col items-center leading-tight">
          <span className="tracking-normal mb-1">訊號微弱... 請稍候</span>
          <span className="text-[10px] font-mono opacity-60 normal-case">
            SIGNAL_STRENGTH: WEAK... PLEASE_WAIT
          </span>
        </div>
      </div>
    );
  }

  if (error && mvData.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-base text-foreground crt-lines">
        <div className="text-2xl font-black mb-4 text-red-500 uppercase tracking-tighter flex flex-col items-center leading-tight">
          <span className="tracking-normal">資料庫同步失敗</span>
          <span className="text-[10px] sm:text-xs font-mono opacity-60 normal-case mt-1">
            Database_Sync_Failed
          </span>
        </div>
        <p className="text-sm opacity-70 mb-8">{error}</p>
        <Button onClick={() => window.location.reload()} variant="reverse" data-umami-event="Z_Retry_Connection">
          重試連線
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-base font-normal selection:bg-main selection:text-main-foreground relative isolate flex flex-col">
      {/* 整個首頁的全局背景 CRT 濾鏡層 */}
      <div className="pointer-events-none fixed inset-0 z-[-1] crt-lines-global opacity-100" />

      <div className="flex-1 relative flex flex-col">
        {/* 頁首 */}
        <header className="py-12 md:py-16 text-center bg-card relative overflow-hidden border-b-2 border-border z-30">
        <div className="absolute inset-0 opacity-5 pointer-events-none crt-lines"></div>

        <h1 className="text-3xl sm:text-4xl md:text-6xl font-black flex flex-col md:flex-row items-center justify-center gap-2 sm:gap-4 px-2">
          <span
            className="ztmy-cyber-title whitespace-nowrap"
            data-text="ZUTOMAYO MV Gallery"
            style={{ animationPlayState: selectedMvId ? "paused" : "running" }}
          >
            <span
              className="ztmy-cyber-text"
              data-text="ZUTOMAYO MV Gallery"
              style={{
                animationPlayState: selectedMvId ? "paused" : "running",
              }}
            >
              ZUTOMAYO MV Gallery
            </span>
          </span>
          <span
            className="text-[10px] sm:text-xs md:text-sm bg-main/20 text-main border-2 md:border-3 border-main px-1.5 md:px-2 py-0.5 md:py-1 animate-pulse relative z-10"
            style={{ animationPlayState: selectedMvId ? "paused" : "running" }}
          >
            V{VERSION_CONFIG.app}
          </span>
        </h1>
        <p className="mt-2 text-sm opacity-70">日々研磨爆裂中！</p>
      </header>

      {/* 跑馬燈 */}
      {metadata?.settings?.announcements &&
        metadata.settings.announcements.length > 0 && (
          <div className="w-full relative z-20 bg-main border-y-2 border-transparent">
            <Marquee items={metadata.settings.announcements} />
          </div>
        )}

      <main className="container mx-auto px-4 max-w-7xl pt-8 pb-8 border-t-2 border-border relative flex-1">
        {/* 過濾控制列 */}
        <div className="flex flex-col md:flex-row gap-4 mb-12">
          <div className="relative w-full md:flex-1">
            <i className="hn hn-search text-xl absolute left-3 top-1/2 -translate-y-1/2 opacity-50"></i>
            <Input
              type="text"
              placeholder="關鍵字檢索..."
              className="w-full pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={(e) => {
                if (e.target.value.trim() !== '' && window.umami && typeof window.umami.track === 'function') {
                  window.umami.track('Z_Input_Change', {
                    type: 'input[type="text"]',
                    label: '關鍵字檢索',
                    value: e.target.value.substring(0, 100)
                  });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.trim() !== '' && window.umami && typeof window.umami.track === 'function') {
                  window.umami.track('Z_Input_Change', {
                    type: 'input[type="text"]',
                    label: '關鍵字檢索',
                    value: search.substring(0, 100)
                  });
                }
              }}
            />
          </div>

          <div className="flex flex-wrap md:flex-nowrap gap-2 md:gap-4 w-full md:w-auto">
            <Popover open={openYear} onOpenChange={setOpenYear}>
              <PopoverTrigger asChild>
                <Button
                  variant="default"
                  role="combobox"
                  aria-expanded={openYear}
                  data-active={openYear}
                  className="flex-1 md:w-[160px] justify-between text-xs md:text-sm px-2 md:px-4 min-w-0"
                  data-umami-event="Z_Filter_Toggle"
                  data-umami-event-type="year"
                >
                  <div className="flex-1 min-w-0 flex justify-start text-left">
                    {yearFilter.length > 0 ? (
                      <span className="truncate w-full block">
                        {yearFilter.join(", ")}
                      </span>
                    ) : (
                      <span className="truncate w-full block">所有年份</span>
                    )}
                  </div>
                  <i className="hn hn-chevron-down ml-1 md:ml-2 size-4 shrink-0 opacity-50 hidden sm:block" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto min-w-[160px] p-0 shadow-none"
                align="start"
              >
                <Command className="border-0">
                  <CommandList>
                    <CommandEmpty>找不到年份</CommandEmpty>
                    <CommandGroup className="p-2 [&_[cmdk-group-items]]:flex [&_[cmdk-group-items]]:flex-col [&_[cmdk-group-items]]:gap-1">
                      {uniqueYears.map((year) => (
                        <CommandItem
                          key={year}
                          value={year}
                          onSelect={() => {
                            setYearFilter(
                              yearFilter.includes(year)
                                ? yearFilter.filter((y) => y !== year)
                                : [...yearFilter, year],
                            );
                          }}
                          data-umami-event="Z_Select_Filter"
                          data-umami-event-type="year"
                          data-umami-event-value={year}
                          data-umami-event-action={yearFilter.includes(year) ? 'remove' : 'add'}
                        >
                          <div
                            className="border-border flex items-center justify-center pointer-events-none size-5 shrink-0 rounded-base border-2 transition-all select-none [&>i]:opacity-0 data-[selected=true]:[&>i]:opacity-100"
                            data-selected={yearFilter.includes(year)}
                          >
                            <i className="hn hn-check text-[14px] leading-none text-current" />
                          </div>
                          {year}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Popover open={openAlbum} onOpenChange={setOpenAlbum}>
              <PopoverTrigger asChild>
                <Button
                  variant="default"
                  role="combobox"
                  aria-expanded={openAlbum}
                  data-active={openAlbum}
                  className="flex-1 md:w-[180px] justify-between text-xs md:text-sm px-2 md:px-4 min-w-0"
                  data-umami-event="Z_Filter_Toggle"
                  data-umami-event-type="album"
                >
                  <div className="flex-1 min-w-0 flex justify-start text-left">
                    {albumFilter.length > 0 ? (
                      <span className="truncate w-full block">
                        {albumFilter.join(", ")}
                      </span>
                    ) : (
                      <span className="truncate w-full block">所有專輯</span>
                    )}
                  </div>
                  <i className="hn hn-chevron-down ml-1 md:ml-2 size-4 shrink-0 opacity-50 hidden sm:block" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto min-w-[240px] max-w-[90vw] p-0 shadow-none"
                align="start"
              >
                <Command className="border-0">
                  <CommandList>
                    <CommandEmpty>找不到專輯</CommandEmpty>

                    {[
                      {
                        heading: ALBUM_CATEGORIES.full.label,
                        items: groupedAlbums.full,
                      },
                      {
                        heading: ALBUM_CATEGORIES.mini.label,
                        items: groupedAlbums.mini,
                      },
                      {
                        heading: ALBUM_CATEGORIES.single.label,
                        items: groupedAlbums.single,
                      },
                    ].map(
                      (group, groupIdx) =>
                        group.items.length > 0 && (
                          <CommandGroup
                            key={groupIdx}
                            heading={
                              <div className="flex flex-col leading-tight">
                                <span className="tracking-normal">
                                  {group.heading.zh}
                                </span>
                                <span className="text-[10px] font-mono opacity-50 normal-case">
                                  {group.heading.en}
                                </span>
                              </div>
                            }
                            className="p-2 [&_[cmdk-group-items]]:flex [&_[cmdk-group-items]]:flex-col [&_[cmdk-group-items]]:gap-1"
                          >
                            {group.items.map((album) => (
                              <CommandItem
                                key={album}
                                value={album}
                                onSelect={() => {
                                  setAlbumFilter(
                                    albumFilter.includes(album)
                                      ? albumFilter.filter((a) => a !== album)
                                      : [...albumFilter, album],
                                  );
                                }}
                                data-umami-event="Z_Select_Filter"
                                data-umami-event-type="album"
                                data-umami-event-value={album}
                                data-umami-event-action={albumFilter.includes(album) ? 'remove' : 'add'}
                              >
                                <div
                                  className="border-border flex items-center justify-center pointer-events-none size-5 shrink-0 rounded-base border-2 transition-all select-none [&>i]:opacity-0 data-[selected=true]:[&>i]:opacity-100"
                                  data-selected={albumFilter.includes(album)}
                                >
                                  <i className="hn hn-check text-[14px] leading-none text-current" />
                                </div>
                                <span className="whitespace-normal break-words">
                                  {album}
                                </span>
                                {albumDateMap[album] && (
                                  <span className="ml-auto text-xs opacity-50 shrink-0">
                                    {albumDateMap[album]}
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        ),
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Popover open={openArtist} onOpenChange={setOpenArtist}>
              <PopoverTrigger asChild>
                <Button
                  variant="default"
                  role="combobox"
                  aria-expanded={openArtist}
                  data-active={openArtist}
                  className="flex-1 md:w-[240px] justify-between text-xs md:text-sm px-2 md:px-4 min-w-0"
                  data-umami-event="Z_Filter_Toggle"
                  data-umami-event-type="artist"
                >
                  <div className="flex-1 min-w-0 flex justify-start text-left">
                    {artistFilter.length > 0 ? (
                      <span className="truncate w-full block">
                        {artistFilter.join(", ")}
                      </span>
                    ) : (
                      <span className="truncate w-full block">所有製作</span>
                    )}
                  </div>
                  <i className="hn hn-chevron-down ml-1 md:ml-2 size-4 shrink-0 opacity-50 hidden sm:block" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto min-w-[240px] max-w-[90vw] p-0 shadow-none"
                align="start"
              >
                <Command className="border-0">
                  <CommandList>
                    <CommandEmpty>找不到畫師</CommandEmpty>
                    <CommandGroup className="p-2 [&_[cmdk-group-items]]:flex [&_[cmdk-group-items]]:flex-col [&_[cmdk-group-items]]:gap-1">
                      {uniqueArtists.map((artist) => {
                        const snsId = metadata?.artistMeta?.[artist]?.hideId
                          ? undefined
                          : metadata?.artistMeta?.[artist]?.id;
                        return (
                          <CommandItem
                            key={artist}
                            value={artist}
                            onSelect={() => {
                              setArtistFilter(
                                artistFilter.includes(artist)
                                  ? artistFilter.filter((a) => a !== artist)
                                  : [...artistFilter, artist],
                              );
                            }}
                            data-umami-event="Z_Select_Filter"
                            data-umami-event-type="artist"
                            data-umami-event-value={artist}
                            data-umami-event-action={artistFilter.includes(artist) ? 'remove' : 'add'}
                          >
                            <div
                              className="border-border flex items-center justify-center pointer-events-none size-5 shrink-0 rounded-base border-2 transition-all select-none [&>i]:opacity-0 data-[selected=true]:[&>i]:opacity-100"
                              data-selected={artistFilter.includes(artist)}
                            >
                              <i className="hn hn-check text-[14px] leading-none text-current" />
                            </div>
                            <span className="whitespace-normal break-words">
                              {artist}
                            </span>
                            {snsId && (
                              <span className="ml-auto text-xs opacity-50 shrink-0">
                                {snsId}
                              </span>
                            )}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* 畫廊網格與空狀態 */}
        {filteredData.length > 0 ? (
          <div className="grid grid-cols-1 min-[460px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredData.slice(0, visibleCount).map((mv, idx) => {
              const batchIdx = Math.max(0, idx - lastBatchStartRef.current);
              return (
                <AnimatedMVCardItem
                  key={mv.id}
                  mv={mv}
                  isFav={favorites.includes(mv.id)}
                  onToggleFav={() => toggleFav(mv.id)}
                  onClick={() => navigate(`/mv/${mv.id}`)}
                  delayMs={Math.min(batchIdx, 24) * 20}
                  isPaused={isGlobalPaused}
                />
              );
            })}
          </div>
        ) : (
          <div className="w-full py-24 flex flex-col items-center justify-center border-4 border-dashed border-border bg-card/30 mt-8">
            <div className="text-5xl mb-6 opacity-20">
              <i className="hn hn-robot text-5xl"></i>
            </div>
            <div className="flex flex-col items-center leading-tight mb-2">
              <h3 className="text-xl font-black tracking-widest uppercase">
                找不到訊號
              </h3>
              <span className="text-[10px] font-mono opacity-40 normal-case">
                NO_SIGNAL_FOUND
              </span>
            </div>
            <p className="text-sm opacity-60 mb-8 font-mono">
              找不到符合檢索條件的 MV
            </p>
            <Button
              onClick={() => {
                setSearch("");
                setYearFilter([]);
                setAlbumFilter([]);
                setArtistFilter([]);
                if (showFavOnly) navigate("/");
              }}
              variant="neutral"
              data-umami-event="Z_Reset_Filters"
            >
              <i className="hn hn-refresh text-sm mr-2"></i> 重置所有檢索條件
            </Button>
          </div>
        )}

        {/* 加載更多觸發器 */}
        {filteredData.length > 0 && visibleCount < filteredData.length && (
          <div
            ref={setSentinelEl}
            className="w-full h-20 flex items-center justify-center mt-8"
          >
            <div className="animate-pulse flex items-center gap-2 text-main text-xs font-black tracking-widest uppercase">
              <i className="hn hn-spinner text-sm animate-spin"></i>
              <span className="flex flex-col leading-tight">
                <span className="opacity-70">載入中...</span>
                <span className="text-[10px] font-mono opacity-40 normal-case">
                  Loading Signal...
                </span>
              </span>
            </div>
          </div>
        )}

        {/* 完全加載完畢提示 */}
        {filteredData.length > 0 && visibleCount >= filteredData.length && (
          <div className="w-full py-18 mt-10 flex flex-col items-center justify-center opacity-30 select-none">
            <div className="flex items-center gap-4 text-xs font-mono font-black tracking-[0.3em] uppercase">
              <span className="w-12 h-0.5 bg-current"></span>
              <span className="flex flex-col items-center leading-tight">
                <span className="opacity-70">歸檔邊界</span>
                <span className="text-[10px] font-mono opacity-40 normal-case tracking-normal">
                  END_OF_ARCHIVE
                </span>
              </span>
              <span className="w-12 h-0.5 bg-current"></span>
            </div>
            <div className="mt-3 text-[10px] font-mono tracking-[0.2em] flex flex-col items-center leading-tight">
              <span className="opacity-70 tracking-normal">所有訊號已接收</span>
              <span className="opacity-40 normal-case">
                ALL_SIGNALS_RECEIVED
              </span>
            </div>
          </div>
        )}
      </main>

      {/* 右下角懸浮控制面板 (Control Hub) */}
      <div className="absolute right-0 bottom-0 top-0 pointer-events-none z-50 w-20 md:w-24">
        <div className="sticky top-0 h-[100dvh] max-h-full flex flex-col justify-end items-end pb-[calc(1.5rem+env(safe-area-inset-bottom))] pr-[calc(1rem+env(safe-area-inset-right))] md:pr-6 pointer-events-none">
          <div className="flex flex-col items-end -space-y-[2px] pointer-events-auto">
            {/* 返回頂部按鈕 - 僅在向下滾動後顯示 */}
            <div
              className={`transition-all duration-300 ${scrolled ? "h-10 md:h-12 opacity-100 mb-[8px]" : "h-0 opacity-0 mb-0 pointer-events-none"}`}
            >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                variant="neutral"
                size="icon"
                className="z-[50] w-10 h-10 md:w-12 md:h-12 rounded-none transition-colors hover:bg-main hover:text-black"
                data-umami-event="Z_Scroll_To_Top"
              >
                <i className="hn hn-arrow-up text-xl md:text-2xl"></i>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center" sideOffset={10}>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-black tracking-widest">返回頂部</p>
                <p className="text-[10px] font-mono opacity-60 normal-case">
                  TOP
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() =>
                setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
              }
              variant="neutral"
              size="icon"
              data-active={sortOrder === "asc"}
              className={`z-10 w-10 h-10 md:w-12 md:h-12 rounded-none transition-colors ${sortOrder === "asc" ? "bg-main text-black hover:bg-main/80" : "hover:bg-main hover:text-black"}`}
              data-umami-event="Z_Toggle_Sort_Order"
              data-umami-event-order={sortOrder === "desc" ? "asc" : "desc"}
            >
              <i className={`hn hn-sort text-xl md:text-2xl`}></i>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" align="center" sideOffset={10}>
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-black tracking-widest">排序</p>
              <p className="text-[10px] font-mono opacity-60 normal-case">
                SORT
              </p>
              <p className="text-xs font-bold">
                {sortOrder === "desc" ? "最新 → 最舊" : "最舊 → 最新"}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => navigate(showFavOnly ? "/" : "/favorites")}
              variant="neutral"
              size="icon"
              data-active={showFavOnly}
              className={`z-20 w-10 h-10 md:w-12 md:h-12 rounded-none transition-colors ${showFavOnly ? "bg-main text-black hover:bg-main/80" : "hover:bg-main hover:text-black"}`}
              data-umami-event="Z_Toggle_Favorites_View"
              data-umami-event-view={showFavOnly ? "all" : "favorites"}
            >
              <i
                className={`hn hn-star-solid text-xl md:text-2xl leading-none ${showFavOnly ? "animate-pulse" : ""}`}
              ></i>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" align="center" sideOffset={10}>
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-black tracking-widest">收藏</p>
              <p className="text-[10px] font-mono opacity-60 normal-case">
                FAVORITES
              </p>
              <p className="text-xs font-bold">
                {showFavOnly ? "返回所有作品" : "只看收藏"}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setIsFeedbackOpen(!isFeedbackOpen)}
              variant="neutral"
              size="icon"
              data-active={isFeedbackOpen}
              className={`z-30 w-10 h-10 md:w-12 md:h-12 rounded-none transition-colors ${isFeedbackOpen ? "bg-main text-black hover:bg-main/80" : "hover:bg-main hover:text-black"}`}
              data-umami-event="Z_Toggle_Feedback_Drawer"
              data-umami-event-state={isFeedbackOpen ? "close" : "open"}
            >
              <i className="hn hn-message text-xl md:text-2xl"></i>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" align="center" sideOffset={10}>
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-black tracking-widest">意見回饋</p>
              <p className="text-[10px] font-mono opacity-60 normal-case">
                FEEDBACK
              </p>
            </div>
          </TooltipContent>
        </Tooltip>

        <div className="z-40 relative">
          <ThemeToggle isIconOnly={true} />
        </div>
        </div>
      </div>
      </div>
      </div>

      {/* 頁尾 Footer */}
      <footer className="bg-card relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none crt-lines"></div>
        <div className="container mx-auto px-4 pb-16 pt-8 max-w-7xl relative">
          {/* 三語版權聲明區塊 & 導航 */}
          <div className="p-8 border-4 border-black bg-black/5 relative group">
            <div className="absolute -top-4 left-6 bg-black text-main px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] border-2 border-main">
              <div className="flex flex-col leading-tight">
                <span className="opacity-90 tracking-normal">
                  版權/法律聲明
                </span>
                <span className="font-mono opacity-60 normal-case">
                  Legal_Signal_Broadcast
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-10 items-center">
              {/* 中文 & 多語言 */}
              <div className="space-y-6 md:col-span-3">
                <div className="space-y-3">
                  <p className="text-[10px] leading-relaxed opacity-60">
                    本站為「<span lang="ja">ずっと真夜中でいいのに。</span>
                    」（ZUTOMAYO）粉絲建立之非官方資料庫，僅供同好交流與內容整理之用，無任何商業營利行為。
                    <br />
                    本站伺服器不存儲任何原始檔案，所收錄之影片、圖片、設定圖、插圖及相關視覺素材版權均屬原作者及其所屬機構所有。
                    <br />
                    若版權方有任何疑慮或下架要求，請與我們聯繫。
                  </p>
                  <p
                    lang="ja"
                    className="text-[10px] leading-relaxed opacity-60"
                  >
                    本サイトは「ずっと真夜中でいいのに。」（ZUTOMAYO）のファンによって運営されている非公式アーカイブであり、ファン同士の交流およびコンテンツの整理を目的としています。営利目的の運営は一切行っておりません。
                    <br />
                    本サイトのサーバーにはオリジナルのファイルは保存されておらず、掲載されている動画、画像、設定画、イラスト、その他の視覚素材の著作権は、すべて原作者および権利所有者に帰属します。
                    <br />
                    権利者様の方で掲載に問題がある場合や削除をご希望の際は、お手数ですがご連絡いただけますようお願い申し上げます。
                  </p>
                  <p
                    lang="en"
                    className="text-[10px] leading-relaxed opacity-60"
                  >
                    This is an unofficial fan-made archive site for "ZUTOMAYO"
                    (Zutto Mayonaka de ii Noni.), created for community exchange
                    and content organization with no commercial intent. <br />
                    No original image files are stored on our servers. All
                    copyrights to the videos, images, concept art,
                    illustrations, and related visual materials belong to their
                    respective creators and organizations. <br />
                    If you are a copyright holder and have concerns or requests
                    for content removal, please contact us.
                  </p>
                </div>
              </div>

              {/* 導航與資源 */}
              <div className="border-t-2 md:border-t-0 md:border-l-2 border-black/10 pt-6 md:pt-0 md:pl-8 md:col-span-1 flex flex-col justify-center">
                {/* 外部依賴與資源聲明 */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-black uppercase tracking-widest mb-2 opacity-30 flex flex-col leading-tight">
                    <span className="tracking-normal">外部資源</span>
                    <span className="text-[10px] font-mono opacity-60 normal-case">
                      External_Resources
                    </span>
                  </span>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1 text-[10px] font-bold text-left">
                      <a
                        href="https://pixeliconlibrary.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-main transition-colors flex items-center gap-2 group"
                        title="像素圖示庫 (HackerNoon Pixel Icons)"
                      >
                        <i className="hn hn-external-link text-sm opacity-50 shrink-0" />
                        <span className="flex items-center flex-wrap gap-x-1.5 leading-tight">
                          <span className="tracking-normal whitespace-nowrap">像素圖示庫</span>
                          <span className="text-[10px] font-mono opacity-60 normal-case break-words">
                            HackerNoon Pixel Icons
                          </span>
                        </span>
                      </a>
                      <a
                        href="https://creativecommons.org/licenses/by/4.0/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="opacity-50 hover:opacity-100 hover:text-main transition-all ml-7 flex items-baseline gap-1.5"
                        title="授權：CC BY 4.0 (CC BY 4.0 License)"
                      >
                        <span className="tracking-normal">授權：CC BY 4.0</span>
                        <span className="text-[8px] font-mono opacity-60 normal-case tracking-normal">
                          License
                        </span>
                      </a>
                    </div>

                    <div className="flex flex-col gap-1 text-[10px] font-bold text-left">
                      <a
                        href="https://github.com/TakWolf/fusion-pixel-font"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-main transition-colors flex items-center gap-2 group"
                        title="像素字型 (Fusion Pixel Font)"
                      >
                        <i className="hn hn-external-link text-sm opacity-50 shrink-0" />
                        <span className="flex items-center flex-wrap gap-x-1.5 leading-tight">
                          <span className="tracking-normal whitespace-nowrap">像素字型</span>
                          <span className="text-[10px] font-mono opacity-60 normal-case break-words">
                            Fusion Pixel Font
                          </span>
                        </span>
                      </a>
                      <a
                        href="https://openfontlicense.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="opacity-50 hover:opacity-100 hover:text-main transition-all ml-7 flex items-baseline gap-1.5"
                        title="授權：OFL 1.1 (SIL OFL 1.1)"
                      >
                        <span className="tracking-normal">授權：OFL 1.1</span>
                        <span className="text-[8px] font-mono opacity-60 normal-case tracking-normal">
                          License
                        </span>
                      </a>
                    </div>

                    <div className="flex flex-col gap-1 text-[10px] font-bold text-left">
                      <a
                        href="https://www.neobrutalism.dev/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-main transition-colors flex items-center gap-2 group"
                        title="UI 設計系統 (Neobrutalism UI)"
                      >
                        <i className="hn hn-external-link text-sm opacity-50 shrink-0" />
                        <span className="flex items-center flex-wrap gap-x-1.5 leading-tight">
                          <span className="tracking-normal whitespace-nowrap">UI 設計系統</span>
                          <span className="text-[10px] font-mono opacity-60 normal-case break-words">
                            Neobrutalism UI
                          </span>
                        </span>
                      </a>
                      <span
                        className="opacity-50 ml-7 flex items-baseline gap-1.5"
                        title="授權：MIT (MIT License)"
                      >
                        <span className="tracking-normal">授權：MIT</span>
                        <span className="text-[8px] font-mono opacity-60 normal-case tracking-normal">
                          License
                        </span>
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 text-[10px] font-bold text-left">
                      <a
                        href="https://fancyapps.com/fancybox/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-main transition-colors flex items-center gap-2 group"
                        title="燈箱元件 (Fancybox UI)"
                      >
                        <i className="hn hn-external-link text-sm opacity-50 shrink-0" />
                        <span className="flex items-center flex-wrap gap-x-1.5 leading-tight">
                          <span className="tracking-normal whitespace-nowrap">燈箱元件</span>
                          <span className="text-[10px] font-mono opacity-60 normal-case break-words">
                            Fancybox UI
                          </span>
                        </span>
                      </a>
                      <span
                        className="opacity-50 ml-7 flex items-baseline gap-1.5"
                        title="授權：GPLv3 (GPLv3 License)"
                      >
                        <span className="tracking-normal">授權：GPLv3</span>
                        <span className="text-[8px] font-mono opacity-60 normal-case tracking-normal">
                          License
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-8 md:gap-4 text-[10px] uppercase tracking-[0.2em]">
            <div className="opacity-30 text-center md:text-left flex flex-col leading-tight items-center md:items-start md:flex-1 md:basis-0">
              <span className="tracking-normal">© {new Date().getFullYear()} ZTMY MV 資料庫 V{VERSION_CONFIG.app} | {geoLabelCn}</span>
              <span className="opacity-60 normal-case text-[8px] mt-1 flex flex-col gap-0.5">
                <span>ZUTOMAYO_MV_GALLERY</span>
                <span>BUILD_{import.meta.env.VITE_BUILD_DATE?.replace(/-/g, '')}_{import.meta.env.VITE_BUILD_HASH || 'dev'} | {geoLabelEn}</span>
              </span>
            </div>

              <div className="flex flex-col items-center gap-4 order-first md:order-none md:flex-none">
                <a
                  href="https://dan.tw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 font-black border-2 border-black px-4 py-2 bg-main text-black shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all group"
                  title="前往開發者個人網站"
                >
                  <div className="flex flex-col items-center leading-tight">
                    <div className="flex items-center gap-2">
                      <span className="tracking-normal">由 飯糰 製作</span>
                      <i className="hn hn-heart-solid text-red-500 group-hover:animate-pulse text-[12px] leading-none"></i>
                    </div>
                    <span className="text-[8px] opacity-60 normal-case tracking-normal">
                      MADE_WITH{" "}
                      <i className="hn hn-heart-solid text-red-500 group-hover:animate-pulse text-[10px] leading-none"></i>{" "}
                      BY_DANERSAKA
                    </span>
                  </div>
                </a>
              <a
                        href="https://github.com/lyangjyehaur/zutomayo-gallery"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-main transition-colors flex items-center gap-2 group opacity-50 hover:opacity-100"
                        title="GitHub 儲存庫 (GitHub Repository)"
                      >
                <i className="hn hn-github text-sm" />
                <span className="flex flex-col leading-tight">
                  <span className="tracking-normal">開源專案</span>
                  <span className="text-[8px] opacity-60 normal-case">
                    Open Source Repository
                  </span>
                </span>
              </a>
            </div>

            <div className="opacity-30 text-center md:text-right flex flex-col leading-tight items-center md:items-end md:flex-1 md:basis-0">
              <span className="tracking-normal">
                本專案為粉絲自製 所有媒體資源版權歸屬 <a href="https://zutomayo.net" target="_blank" rel="noopener noreferrer" className="hover:text-main underline decoration-dashed underline-offset-2 transition-colors">ZUTOMAYO</a>
              </span>
              <span className="text-[8px] mt-1 opacity-60 normal-case">
                FAN_MADE_PROJECT MEDIA_COPYRIGHT_BELONGS_TO_ZUTOMAYO
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* 反饋側邊欄 遮罩 (Overlay) */}
      <div
        className={`fixed inset-0 z-[90] bg-black/60 backdrop-blur-[2px] transition-all duration-300 lg:duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isFeedbackOpen
            ? "opacity-100 pointer-events-auto visible"
            : "opacity-0 pointer-events-none invisible"
        }`}
        onClick={() => setIsFeedbackOpen(false)}
      />

      {/* 反饋側邊欄 (Drawer) */}
      <div
        className={`fixed left-0 top-0 bottom-0 h-screen w-full lg:w-[768px] xl:w-[800px] border-r-0 lg:border-r-4 border-black bg-background/95 backdrop-blur-md shadow-none lg:shadow-neo z-[100] flex flex-col transition-all duration-300 lg:duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] origin-center ${
          isFeedbackOpen
            ? "opacity-100 scale-100 translate-x-0 pointer-events-auto visible"
            : "opacity-0 scale-95 lg:scale-100 lg:opacity-100 lg:-translate-x-full pointer-events-none invisible"
        }`}
      >
        {/* CRT 背景層 */}
        <div className="absolute inset-0 pointer-events-none crt-lines z-0 opacity-100"></div>
        <div className="pt-10 px-8 pb-6 border-b-4 border-border text-foreground flex flex-col justify-center shrink-0 pr-24 relative z-10">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
              <i className="hn hn-message text-2xl"></i> 意見回饋
            </h2>
            <span className="text-[10px] font-bold opacity-50 font-mono normal-case">
              Feedback
            </span>
          </div>
          <p className="text-xs font-bold text-foreground/70 mt-1">
            有任何建議或發現 Bug，歡迎在這裡留言告訴我！
          </p>

          <Button
            variant="noShadow"
            size="icon"
            onClick={() => setIsFeedbackOpen(false)}
            className="absolute top-6 right-8 z-50 bg-background text-foreground border-3 border-foreground shadow-neo-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all w-10 h-10 rounded-none flex items-center justify-center"
            data-umami-event="Z_Close_Feedback_Drawer"
          >
            <i className="hn hn-times text-xl leading-none"></i>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 relative z-10">
          {shouldRenderFeedback && (
            <WalineComments path="/site-feedback" className="waline-wrapper" />
          )}
        </div>
      </div>

      {/* 詳情彈窗 */}
      <MVDetailsModal
        mv={selectedMv}
        onClose={() => navigate(showFavOnly ? "/favorites" : "/")}
      />
    </div>
  );
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("API 伺服器無回應 (404/500)");
    return res.json().then((result) => result.data || result);
  });

// 為了支援 useParams，我們需要導出一個包裹了路由環境的組件
export default function RootApp() {
  const apiUrl = import.meta.env.VITE_API_URL || "https://api.ztmr.club/api/mvs";
  const defaultMetadata = {
    albumMeta: {},
    artistMeta: {},
    settings: { showAutoAlbumYear: false },
  };

  const {
    data: mvData,
    error: swrError,
    isLoading: isSwrLoading,
    mutate,
  } = useSWR<MVItem[]>(apiUrl, fetcher, {
    revalidateOnFocus: false, // 避免頻繁重新驗證
  });

  const { data: metadataData, mutate: mutateMetadata } = useSWR<{
    albumMeta: Record<string, { date?: string; hideDate?: boolean }>;
    artistMeta: Record<string, { id?: string; hideId?: boolean }>;
    settings: { showAutoAlbumDate: boolean; announcements?: string[] };
  }>(`${apiUrl}/metadata`, fetcher, {
    revalidateOnFocus: false,
  });

  const { data: systemStatus, mutate: mutateSystemStatus } = useSWR<{ maintenance: boolean; type?: 'data' | 'ui'; eta?: string | null }>(
    `${apiUrl.replace('/mvs', '/system')}/status`,
    fetcher,
    { revalidateOnFocus: true }
  );

  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  // 為了保留原本的延遲加載動畫效果
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    if (!isSwrLoading) {
      setTimeout(() => setIsLoading(false), 800);
    } else {
      setIsLoading(true);
    }
  }, [isSwrLoading]);

  // 全域初始化 Google Analytics 與 Umami 及 地理位置探測
  useEffect(() => {
    initAnalytics();
    printEgg();
    initGeo(); // 非同步執行，快取到 sessionStorage
  }, []);

  // PWA 安裝提示
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // 防止 Chrome 67 以前的版本自動顯示提示
      e.preventDefault();
      // 將事件儲存起來，以便稍後觸發
      const deferredPrompt = e;
      
      // 延遲一點時間再顯示 toast，避免跟載入動畫衝突
      setTimeout(() => {
        toast("安裝 ZTMY Gallery", {
          description: "將網站加入主畫面，享受全螢幕與離線瀏覽體驗！",
          duration: 10000,
          action: {
            label: "安裝",
            onClick: async () => {
              // 顯示安裝提示
              deferredPrompt.prompt();
              // 等待使用者回應
              const { outcome } = await deferredPrompt.userChoice;
              if (outcome === 'accepted') {
                if (window.umami) window.umami.track('Z_PWA_Install_Accepted');
              } else {
                if (window.umami) window.umami.track('Z_PWA_Install_Dismissed');
              }
            },
          },
          cancel: {
            label: "稍後再說",
            onClick: () => console.log('User dismissed PWA install'),
          },
        });
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const error = swrError ? swrError.message : null;
  const commonProps = {
    mvData: mvData || [],
    isLoading,
    error,
    metadata: metadataData || defaultMetadata,
  };

  if (systemStatus?.maintenance && !isAdminRoute) {
    return <MaintenancePage type={systemStatus.type || 'ui'} eta={systemStatus.eta} />;
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<App {...commonProps} />} />
        <Route path="/favorites" element={<App {...commonProps} />} />
        <Route path="/mv/:id" element={<App {...commonProps} />} />
        <Route
          path="/admin"
          element={
            <AdminPage
              mvData={mvData || []}
              metadata={metadataData || defaultMetadata}
              systemStatus={systemStatus}
              onRefresh={() => {
                mutate();
                mutateMetadata();
                mutateSystemStatus();
              }}
            />
          }
        />
        <Route path="/admin/db" element={<AdminDBPage />} />
        <Route path="/debug/lg/:mvid?" element={<DebugLightGallery />} />
        <Route path="/debug/fb/:mvid?" element={<DebugFancyboxMasonry />} />
        <Route path="/debug/modal" element={<DebugMVModalLightbox />} />
      </Routes>
      <Toaster />
    </>
  );
}
