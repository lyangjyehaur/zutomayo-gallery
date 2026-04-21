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
  useLocation,
} from "react-router-dom";
import { MVItem } from "@/lib/types";
import { initAnalytics } from "@/lib/analytics";
import { printEgg } from "@/lib/egg";
import { initGeo } from "@/lib/geo";
import { useGeoLabel } from "@/hooks/useGeoLabel";
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
import LanguageToggle from "@/components/ui/LanguageToggle";
import CustomCursor from "@/components/ui/CustomCursor";
import { useLazyImage } from "@/hooks/useLazyImage";
import Marquee from "@/components/ui/marquee";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WalineComments } from "@/components/WalineComments";
import { SpeedRatingSurvey } from "@/components/SpeedRatingSurvey";

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
import { useTranslation } from 'react-i18next';

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
  const [isTabActive, setIsTabActive] = useState(true);

  // 監聽分頁可見性，避免分頁閒置時動畫計時器堆積
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    // 初始化狀態
    handleVisibilityChange();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!elementRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, []);

  // 如果父層要求暫停、不在可視範圍內，或者分頁被隱藏，就徹底暫停動畫
  const isEffectivelyPaused = isPaused || !isInView || !isTabActive;

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
  systemStatus,
}: {
  mvData: MVItem[];
  isLoading: boolean;
  error: string | null;
  metadata: {
    albumMeta: Record<string, { date?: string; hideDate?: boolean }>;
    artistMeta: Record<string, { id?: string; hideId?: boolean }>;
    settings: { showAutoAlbumDate: boolean; announcements?: string[] };
  };
  systemStatus?: { maintenance: boolean; type?: 'data' | 'ui'; eta?: string | null; buildTime?: string | null };
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // 過濾狀態
  const [search, setSearch] = useState(() => {
    try { return sessionStorage.getItem('mv_filter_search') || ''; } catch { return ''; }
  });
  const [yearFilter, setYearFilter] = useState<string[]>(() => {
    try { const saved = sessionStorage.getItem('mv_filter_year'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [albumFilter, setAlbumFilter] = useState<string[]>(() => {
    try { const saved = sessionStorage.getItem('mv_filter_album'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [artistFilter, setArtistFilter] = useState<string[]>(() => {
    try { const saved = sessionStorage.getItem('mv_filter_artist'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  
  // 儲存過濾狀態到 sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('mv_filter_search', search);
      sessionStorage.setItem('mv_filter_year', JSON.stringify(yearFilter));
      sessionStorage.setItem('mv_filter_album', JSON.stringify(albumFilter));
      sessionStorage.setItem('mv_filter_artist', JSON.stringify(artistFilter));
    } catch (e) {
      console.error('Failed to save filter state to sessionStorage:', e);
    }
  }, [search, yearFilter, albumFilter, artistFilter]);
  const [openYear, setOpenYear] = useState(false);
  const [openAlbum, setOpenAlbum] = useState(false);
  const [openArtist, setOpenArtist] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    return storage.get<string[]>(STORAGE_KEYS.FAVORITES, []) || [];
  });
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isGeoTooltipOpen, setIsGeoTooltipOpen] = useState(false);
  const [shouldRenderFeedback, setShouldRenderFeedback] = useState(false);
  const [isSurveyForceOpen, setIsSurveyForceOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1024 : false,
  );
  
  const geoInfo = useGeoLabel();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("ztmy_admin_pwd");
    if (!saved) return;

    const apiUrl = import.meta.env.VITE_API_URL || "/api/mvs";
    let cancelled = false;

    fetch(`${apiUrl}/verify-admin`, {
      method: "POST",
      headers: { "x-admin-password": saved },
    })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setIsAdminAuthenticated(true);
          return;
        }
        localStorage.removeItem("ztmy_admin_pwd");
        setIsAdminAuthenticated(false);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
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
  const showFavOnly = location.pathname === "/favorites" || location.state?.fromFav;
  // 從路由中解析 id，避免依賴 useParams() 以支援 layout 模式不卸載元件
  const mvIdMatch = location.pathname.match(/^\/mv\/([^/]+)/);
  const selectedMvId = mvIdMatch ? mvIdMatch[1] : null;

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
      const isRemoving = favorites.includes(id);
      const newFavs = isRemoving
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

      // 顯示 Toast 提示
      const mvTitle = mvData.find((m) => m.id === id)?.title || "作品";
      if (isRemoving) {
        toast("已取消收藏", {
          description: mvTitle,
          action: {
            label: "復原",
            onClick: () => {
              // 在復原時，因為我們還沒有更新到最新的 toggleFav 閉包，
              // 直接在這裡執行加入收藏的邏輯
              setFavorites((prev) => {
                if (prev.includes(id)) return prev;
                const restoredFavs = [...prev, id];
                storage.set(STORAGE_KEYS.FAVORITES, restoredFavs);
                if (typeof window !== "undefined" && "BroadcastChannel" in window) {
                  const channel = new BroadcastChannel("favorites_sync");
                  channel.postMessage(restoredFavs);
                  channel.close();
                }
                return restoredFavs;
              });
              toast("已加入收藏", { description: mvTitle });
            },
          },
        });
      } else {
        toast("已加入收藏", {
          description: mvTitle,
        });
      }
    },
    [favorites, mvData],
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

  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const isGlobalPaused = !!selectedMvId || (isFeedbackOpen && isMobile) || (isAboutOpen && isMobile);

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
          <span className="tracking-normal">{t("app.connecting_db", "連線資料庫中...")}</span>
          <span className="text-[14px] sm:text-[16px] font-mono opacity-60 normal-case mt-2">
            Connecting_Database...
          </span>
        </div>
        <div className="w-64 h-4 border-2 border-border p-0.5 bg-card shadow-shadow">
          <div className="h-full bg-main animate-pulse w-1/3"></div>
        </div>
        <div className="mt-6 text-xs opacity-50 font-mono flex flex-col items-center leading-tight">
          <span className="tracking-normal mb-1">{t("app.weak_signal", "訊號微弱... 請稍候")}</span>
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
          <span className="tracking-normal">{t("app.db_sync_failed", "資料庫同步失敗")}</span>
          <span className="text-[10px] sm:text-xs font-mono opacity-60 normal-case mt-1">
            Database_Sync_Failed
          </span>
        </div>
        <p className="text-sm opacity-70 mb-8">{error}</p>
        <Button onClick={() => window.location.reload()} variant="default" className="hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none" data-umami-event="Z_Retry_Connection">
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
        <p className="mt-2 text-sm opacity-70">{t("app.slogan", "日々研磨爆裂中！")}</p>
      </header>

      {/* 跑馬燈 */}
      {metadata?.settings?.announcements &&
        metadata.settings.announcements.length > 0 && (
          <div className="w-full relative z-20 bg-main border-y-2 border-transparent">
            <Marquee items={metadata.settings.announcements} />
          </div>
        )}

      <main className="mx-auto px-4 w-full max-w-7xl pt-8 pb-8 border-t-2 border-border relative flex-1 max-[1430px]:max-w-[calc(100%-12rem)] max-[1024px]:max-w-[calc(100%-10rem)] max-[768px]:max-w-[80%]">
        {/* 過濾控制列 */}
        <div className="flex flex-col gap-2 mt-8 mb-8 max-[768px]:w-[90vw] max-[768px]:relative max-[768px]:left-1/2 max-[768px]:-translate-x-1/2 max-[768px]:px-4">
          <div className="flex flex-col md:flex-row gap-4 w-full">
            <div className="relative w-full md:flex-[1] min-[1120px]:flex-[1]">
              <i className="hn hn-search text-xl absolute left-3 top-1/2 -translate-y-1/2 opacity-50"></i>
              <Input
                type="text"
                placeholder={t("app.search_placeholder", "關鍵字檢索...")}
                className="w-full pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onBlur={(e) => {
                  if (e.target.value.trim() !== '' && window.umami && typeof window.umami.track === 'function') {
                    window.umami.track('Z_Input_Change', {
                      type: 'input[type="text"]',
                      label: t("app.search_keyword", "關鍵字檢索"),
                      value: e.target.value.substring(0, 100)
                    });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && search.trim() !== '' && window.umami && typeof window.umami.track === 'function') {
                    window.umami.track('Z_Input_Change', {
                      type: 'input[type="text"]',
                      label: t("app.search_keyword", "關鍵字檢索"),
                      value: search.substring(0, 100)
                    });
                  }
                }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 md:gap-4 w-full md:flex-[2] min-[1120px]:flex-[1]">
            <Popover open={openYear} onOpenChange={setOpenYear}>
              <PopoverTrigger asChild>
                <Button
                  variant="default"
                  role="combobox"
                  aria-expanded={openYear}
                  data-active={openYear}
                  className="w-full justify-between text-xs md:text-sm px-2 md:px-4 min-w-0"
                  data-umami-event="Z_Filter_Toggle"
                  data-umami-event-type="year"
                >
                  <div className="flex-1 min-w-0 flex justify-start text-left">
                    {yearFilter.length > 0 ? (
                      <span className="truncate w-full block">
                        {yearFilter.join(", ")}
                      </span>
                    ) : (
                      <span className="truncate w-full block">{t("app.all_years", "所有年份")}</span>
                    )}
                  </div>
                  <i className="hn hn-chevron-down-solid ml-1 size-3 shrink-0 opacity-50 hidden sm:flex items-center justify-center text-[10px]" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto min-w-[160px] p-0 shadow-none"
                align="start"
              >
                <Command className="border-0">
                  <CommandList>
                    <CommandEmpty>{t("app.no_year_found", "找不到年份")}</CommandEmpty>
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
                  className="w-full justify-between text-xs md:text-sm px-2 md:px-4 min-w-0"
                  data-umami-event="Z_Filter_Toggle"
                  data-umami-event-type="album"
                >
                  <div className="flex-1 min-w-0 flex justify-start text-left">
                    {albumFilter.length > 0 ? (
                      <span className="truncate w-full block">
                        {albumFilter.join(", ")}
                      </span>
                    ) : (
                      <span className="truncate w-full block">{t("app.all_albums", "所有專輯")}</span>
                    )}
                  </div>
                  <i className="hn hn-chevron-down-solid ml-1 size-3 shrink-0 opacity-50 hidden sm:flex items-center justify-center text-[10px]" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto min-w-[240px] max-w-[90vw] p-0 shadow-none"
                align="start"
              >
                <Command className="border-0">
                  <CommandList>
                    <CommandEmpty>{t("app.no_album_found", "找不到專輯")}</CommandEmpty>

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
                  className="w-full justify-between text-xs md:text-sm px-2 md:px-4 min-w-0"
                  data-umami-event="Z_Filter_Toggle"
                  data-umami-event-type="artist"
                >
                  <div className="flex-1 min-w-0 flex justify-start text-left">
                    {artistFilter.length > 0 ? (
                      <span className="truncate w-full block">
                        {artistFilter.join(", ")}
                      </span>
                    ) : (
                      <span className="truncate w-full block">{t("app.all_creators", "所有製作")}</span>
                    )}
                  </div>
                  <i className="hn hn-chevron-down-solid ml-1 size-3 shrink-0 opacity-50 hidden sm:flex items-center justify-center text-[10px]" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto min-w-[240px] max-w-[90vw] p-0 shadow-none"
                align="start"
              >
                <Command className="border-0">
                  <CommandList>
                    <CommandEmpty>{t("app.no_creator_found", "找不到畫師")}</CommandEmpty>
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

        {/* 活躍篩選項標籤顯示區塊 */}
          {(yearFilter.length > 0 || albumFilter.length > 0 || artistFilter.length > 0) && (
            <div className="flex flex-wrap gap-2 items-center mt-3 mb-4 max-[768px]:w-[90vw] max-[768px]:relative max-[768px]:left-1/2 max-[768px]:-translate-x-1/2 max-[768px]:px-0">
              <span className="text-xs font-bold opacity-50 mr-1 hidden sm:inline-block">{t("app.current_filters", "目前篩選：")}</span>
              
              {yearFilter.map(year => (
                <div key={`year-${year}`} className="flex items-center bg-card border-2 border-border text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-neo-sm group">
                  <span className="opacity-50 mr-1 sm:mr-1.5 hidden min-[430px]:inline-block">{t("app.year", "年份")}</span>
                  <span className="font-bold mr-1">{year}</span>
                  <button 
                    onClick={() => setYearFilter(yearFilter.filter(y => y !== year))}
                    className="opacity-50 hover:opacity-100 transition-opacity ml-1 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-sm w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"
                  >
                    <i className="hn hn-times text-[8px] sm:text-[10px]"></i>
                  </button>
                </div>
              ))}

              {albumFilter.map(album => (
                <div key={`album-${album}`} className="flex items-center bg-card border-2 border-border text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-neo-sm group">
                  <span className="opacity-50 mr-1 sm:mr-1.5 hidden min-[430px]:inline-block">{t("app.album", "專輯")}</span>
                  <span className="font-bold mr-1 truncate max-w-[100px] sm:max-w-[200px]" title={album}>{album}</span>
                  <button 
                    onClick={() => setAlbumFilter(albumFilter.filter(a => a !== album))}
                    className="opacity-50 hover:opacity-100 transition-opacity ml-1 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-sm w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"
                  >
                    <i className="hn hn-times text-[8px] sm:text-[10px]"></i>
                  </button>
                </div>
              ))}

              {artistFilter.map(artist => (
                <div key={`artist-${artist}`} className="flex items-center bg-card border-2 border-border text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-neo-sm group">
                  <span className="opacity-50 mr-1 sm:mr-1.5 hidden min-[430px]:inline-block">{t("app.creator", "製作")}</span>
                  <span className="font-bold mr-1 truncate max-w-[80px] sm:max-w-[150px]" title={artist}>{artist}</span>
                  <button 
                    onClick={() => setArtistFilter(artistFilter.filter(a => a !== artist))}
                    className="opacity-50 hover:opacity-100 transition-opacity ml-1 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-sm w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"
                  >
                    <i className="hn hn-times text-[8px] sm:text-[10px]"></i>
                  </button>
                </div>
              ))}

              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setYearFilter([]);
                  setAlbumFilter([]);
                  setArtistFilter([]);
                }}
                className="text-[10px] sm:text-xs h-6 sm:h-7 px-1.5 sm:px-2 hover:bg-red-500/10 hover:text-red-500 opacity-60 hover:opacity-100 ml-1 border border-transparent hover:border-red-500/20"
              >
                清除全部
              </Button>
            </div>
          )}
        </div>

        {/* 收藏模式常駐提示 */}
        {showFavOnly && (
          <div className="mb-8 -mt-6 max-[768px]:w-[100vw] max-[768px]:relative max-[768px]:left-1/2 max-[768px]:-translate-x-1/2 max-[768px]:px-4">
            <div className="p-4 bg-yellow-400/10 border-2 border-yellow-500/50 flex items-start gap-3 md:gap-4 rounded-none">
              <i className="hn hn-exclamation-triangle text-yellow-500 text-xl md:text-2xl shrink-0 mt-1 md:mt-0"></i>
              <div className="flex flex-col gap-1 md:gap-1.5">
                <span className="text-xs md:text-sm font-black text-yellow-600 dark:text-yellow-400 flex flex-col md:flex-row md:items-center gap-1 md:gap-2 leading-tight">
                  <span>請注意：收藏功能基於瀏覽器本地存儲實現</span>
                  <span className="text-[10px] font-mono opacity-70 normal-case md:border-l-2 md:border-yellow-500/30 md:pl-2">LOCAL_STORAGE_WARNING</span>
                </span>
                <span className="text-[10px] md:text-xs opacity-80 text-yellow-600 dark:text-yellow-400/80 leading-relaxed">
                  若清除瀏覽器數據或更換設備，您的收藏項目將會丟失。
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 畫廊網格與空狀態 */}
        {filteredData.length > 0 ? (
          <div className="grid grid-cols-1 max-[520px]:grid-cols-1 max-[900px]:grid-cols-2 max-[1120px]:grid-cols-3 grid-cols-4 gap-4 md:gap-6">
            {filteredData.slice(0, visibleCount).map((mv, idx) => {
              const batchIdx = Math.max(0, idx - lastBatchStartRef.current);
              return (
                <AnimatedMVCardItem
                  key={mv.id}
                  mv={mv}
                  isFav={favorites.includes(mv.id)}
                  onToggleFav={() => toggleFav(mv.id)}
                  onClick={() => navigate(`/mv/${mv.id}`, { state: { fromFav: showFavOnly } })}
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
              <h3 className="text-xl font-black">
                找不到訊號
              </h3>
              <span className="text-[10px] font-mono opacity-40">
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
                <span className="opacity-70">{t("common.loading", "載入中...")}</span>
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
            <div className="flex items-center gap-4 text-xs font-mono font-black">
              <span className="w-12 h-0.5 bg-current"></span>
              <span className="flex flex-col items-center leading-tight">
                <span className="opacity-70">{t("app.archive_boundary", "歸檔邊界")}</span>
                <span className="text-[10px] font-mono opacity-40">
                  END_OF_ARCHIVE
                </span>
              </span>
              <span className="w-12 h-0.5 bg-current"></span>
            </div>
          </div>
        )}
      </main>

      {/* 右下角懸浮控制面板 (Control Hub) */}
      <div className="fixed inset-x-0 bottom-0 pointer-events-none z-[60] flex justify-center">
        <div className="w-full max-w-7xl max-[1430px]:max-w-[calc(100%-12rem)] max-[1024px]:max-w-[calc(100%-10rem)] max-[768px]:max-w-[80%] relative px-4">
          <div className="absolute bottom-0 right-4 translate-x-full pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-[768px]:pb-[calc(4.5rem+env(safe-area-inset-bottom))] pointer-events-none flex flex-col justify-end items-start pl-2 md:pl-4">
            <div className="flex flex-col items-center -space-y-[2px] pointer-events-auto">
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
                <p className="text-xs font-black tracking-widest">{t("app.back_to_top", "返回頂部")}</p>
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
              <p className="text-xs font-black tracking-widest">{t("app.sort", "排序")}</p>
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
              <p className="text-xs font-black tracking-widest">{t("app.favorite", "收藏")}</p>
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
            <Dialog open={isAboutOpen} onOpenChange={setIsAboutOpen}>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button
                    variant="neutral"
                    size="icon"
                    className="z-30 w-10 h-10 md:w-12 md:h-12 rounded-none transition-colors hover:bg-main hover:text-black"
                    data-umami-event="Z_Click_About"
                  >
                    <i className="hn hn-info-circle text-xl md:text-2xl"></i>
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent side="left" align="center" sideOffset={10}>
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs font-black tracking-widest">{t("app.about_author", "碎碎念")}</p>
                  <p className="text-[10px] font-mono opacity-60 normal-case">
                    ABOUT
                  </p>
                </div>
              </TooltipContent>

              <DialogContent className="w-screen h-[100dvh] max-w-none md:max-w-2xl md:w-full md:h-[85vh] md:max-h-[85vh] overflow-hidden flex flex-col p-0 border-0 md:border-4 border-black bg-background sm:rounded-none rounded-none shadow-none md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] fixed top-0 left-0 md:top-[50%] md:left-[50%] !translate-x-0 !translate-y-0 md:!translate-x-[-50%] md:!translate-y-[-50%] z-[100]">
                {/* 內容區塊 - 這裡設定 flex=1 並讓內部滾動 */}
                <div className="p-4 md:p-8 relative flex-1 flex flex-col overflow-hidden min-h-0">
                  <DialogHeader className="relative z-10 mb-6 md:mb-8 shrink-0">
                    <DialogTitle className="text-2xl md:text-4xl font-black uppercase tracking-tighter flex flex-wrap items-center gap-2 md:gap-3">
                      <span className="bg-black text-main px-2 md:px-3 py-1">ZUTOMAYO</span>
                      <span className="opacity-90">MV Gallery</span>
                    </DialogTitle>
                    <DialogDescription className="text-sm md:text-lg font-bold opacity-70 mt-2">
                      A fan-made gallery for ZUTOMAYO Music Videos.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="relative z-10 flex-1 flex flex-col overflow-hidden min-h-0">
                    {/* 自述內容區塊 - 佔滿剩餘空間並滾動 */}
                    <ScrollArea className="flex-1 min-h-0 w-full">
                      <div className="pl-3 md:pl-4 py-1 space-y-4 text-sm md:text-base font-medium opacity-90 leading-relaxed text-justify pr-4">
                      <p>{t("app.about_p1", "哈囉！這裡是飯糰，歡迎造訪這個資料庫。")}</p>
                      
                      <p>
                        其實很早就有做這個資料庫的打算了。身為社團成員之一，經常看到社團擺攤團建的時候有老師出 COS 需要找人設圖、或者畫師老師想找參考資料的情況，尤其是官宣 Intense II 之後，想著大家肯定有產糧和做無料的需求，到處翻找設定圖實在不方便，而且大多數老師還得克服網絡環境的難題。再加上官方的資料量大且散，找起來真的很累，當時就在想，如果自己能做一個資料庫，應該會比 QQ 群相冊好用很多吧？ 於是就有了這個資料庫。
                      </p>

                      <p>
                        從最開始整理推文，到後來手搓 HTML 的簡單框架上線之後，就一直收到老師們的高度評價，打心底真的超開心，畢竟初衷就是想幫到更多人。
                      </p>

                      <p>
                        後來慢慢發現純靜態網頁已經跟不上需求了，於是在各路 AI 的「物理外掛」下開始 React 工程化。雖然現在流行 vibe coding，但畢竟自帶一點代碼功底，而且本身對 UI/UX 還是有些執念的。於是自己兼任 PM，在保證基本瀏覽體驗的同時瘋狂打磨細節。畢竟我不是專業的網頁設計師，在風格挑選上真的糾結了很久，最終才確定使用與 ZUTOMAYO 視覺風格很搭的 Neobrutalism；大到整體的實現、畫廊佈局到 Lightbox 燈箱的細節，小到每個按鈕偏移的像素，光是為了適配調試電腦和手機的不同顯示寬度，佈局就反反複覆改了好幾版。
                      </p>

                      <p>
                        雖然聽起來可能有點囉嗦，但我一定要分享一下這裡面的小巧思。比如為了幫大家解決找圖最大的痛點，我在搜尋功能上真的下了不少苦功，除了可以篩選專輯和畫師，為了保證搜尋的命中率，我幾乎把所有能跟歌曲關聯上的關鍵字別名全都手動維護上去了，就是想隨便搜個關鍵詞都能精確對上。還有那種肉眼不容易發現的細節，像是做了完整的「泛中日韓語言特定字形」支持，這塊我鑽研了很久，選字體選到一度想放棄這個 feature，直到後來遇到「縫合像素字體 / Fusion Pixel Font」這個字體開源項目，真的很偉大；還有我也針對大陸用戶、海外用戶甚至爬牆用戶做了不同的訪問處理，甚至還加入了 PWA 支持，可以像應用一樣安裝到手機上，還提供了一定程度的離線瀏覽，連原推和翻譯的對照也都做進去了（雖然還在施工中）。
                      </p>

                      <p>
                        除了目前 MV 畫廊的完善，後續還打算做畫師專題頁，甚至更後期還想把官方轉推的優秀作品也展示出來。奈何量實在太大，還在研究能不能靠 AI 幫忙，畢竟好多神仙 FanArt 被埋沒了真的很可惜。（開始畫餅了）
                      </p>

                      <p>
                        廢話了這麼多，感謝你能看到這裡！如果你用起來覺得哪裡不爽，或者對資料庫有什麼想法建議，真的非常希望你能抽空給我個反饋。我們集思廣益，把這個資料庫做得更好，去幫助更多的老師。
                      </p>

                      <p className="font-bold text-base md:text-lg italic text-right mt-6 pr-4 pb-8">
                        —— 祝「永遠深夜」
                      </p>

                      {/* 感謝名單區塊 */}
                      <div className="mt-8 pt-8 pr-4">
                        <div className="flex flex-col mb-6 items-start">
                          <h3 className="text-xl md:text-2xl font-black tracking-widest bg-black text-main px-3 py-1 inline-block">
                            特別感謝
                          </h3>
                          <p className="text-[10px] md:text-xs font-mono opacity-50 uppercase tracking-widest mt-2 pl-1 whitespace-nowrap">Special Thanks</p>
                        </div>
                        <div className="space-y-4 text-sm md:text-base font-medium">
                          <p>
                            感謝以下老師與開源專案的支持與貢獻：
                          </p>
                          <ul className="list-none space-y-3 mt-4">
                            <li className="flex items-start gap-2 group">
                              <span className="text-main font-black">►</span>
                              <div>
                                <a href="https://space.bilibili.com/531797444" target="_blank" rel="noopener noreferrer" className="font-bold border-b-2 border-transparent hover:border-main hover:bg-main hover:text-black transition-all px-1">
                                深夜大活躍_WAKE_03
                                </a><br /><span className="opacity-70 ml-2 text-sm">感謝對 ZUTOMAYO 粉絲社群的巨大貢獻，以及提供評論區像素 Nira 醬表情的授權</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2 group">
                              <span className="text-main font-black">►</span>
                              <div>
                                <a href="https://github.com/TakWolf/fusion-pixel-font" target="_blank" rel="noopener noreferrer" className="font-bold border-b-2 border-transparent hover:border-main hover:bg-main hover:text-black transition-all px-1">
                                縫合像素字體 / Fusion Pixel Font
                                </a><br /><span className="opacity-70 ml-2 text-sm">{t("app.thanks_fusion_pixel", "提供完整「泛中日韓語言特定字形」開源字型支援")}</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2 group">
                              <span className="text-main font-black">►</span>
                              <div>
                                <a href="https://fancyapps.com/fancybox/" target="_blank" rel="noopener noreferrer" className="font-bold border-b-2 border-transparent hover:border-main hover:bg-main hover:text-black transition-all px-1">
                                  Fancybox
                                </a><br /><span className="opacity-70 ml-2 text-sm">{t("app.thanks_fancybox", "無可挑剔的圖片燈箱解決方案（雖然覆寫官方的樣式真的超累）")}</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2 group">
                              <span className="text-main font-black">►</span>
                              <div>
                                <a href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer" className="font-bold border-b-2 border-transparent hover:border-main hover:bg-main hover:text-black transition-all px-1">
                                  Google Gemini
                                </a><br /><span className="opacity-70 ml-2 text-sm">{t("app.thanks_react", "幫助實現專案從靜態網頁到 React 工程化的轉型")}</span>
                              </div>
                            </li>
                            <li className="flex items-start gap-2 group">
                              <span className="text-main font-black">►</span>
                              <div>
                                <span className="font-bold border-b-2 border-transparent hover:border-main hover:bg-main hover:text-black transition-all px-1 cursor-default">
                                  Trae AI
                                </span><br /><span className="opacity-70 ml-2 text-sm">{t("app.thanks_cursor", "與飯糰一起打磨這些瘋狂 UI 細節的物理外掛（好像是用的 GPT 5.4 的模型）")}</span>
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>
                      </div>
                    </ScrollArea>

                    {/* 連結區塊 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mt-4 md:mt-6 shrink-0 pb-2 px-1">
                      <a
                        href="https://zutomayo.net/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 md:p-4 border-2 border-black bg-background hover:bg-main hover:text-black active:bg-main active:text-black transition-all duration-150 group shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none"
                      >
                        <div className="flex flex-col">
                          <span className="font-black text-sm uppercase">Official Site</span>
                          <span className="font-mono text-[10px] opacity-60">zutomayo.net</span>
                        </div>
                        <i className="hn hn-arrow-right transform group-hover:translate-x-1 transition-transform"></i>
                      </a>
                      
                      <a
                        href="https://github.com/lyangjyehaur/zutomayo-gallery"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 md:p-4 border-2 border-black bg-background hover:bg-main hover:text-black active:bg-main active:text-black transition-all duration-150 group shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none active:translate-x-boxShadowX active:translate-y-boxShadowY active:shadow-none"
                      >
                        <div className="flex flex-col">
                          <span className="font-black text-sm uppercase">Source Code</span>
                          <span className="font-mono text-[10px] opacity-60">GitHub</span>
                        </div>
                        <i className="hn hn-github text-xl"></i>
                      </a>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
              <p className="text-xs font-black tracking-widest">{t("app.feedback", "意見回饋")}</p>
              <p className="text-[10px] font-mono opacity-60 normal-case">
                FEEDBACK
              </p>
            </div>
          </TooltipContent>
        </Tooltip>

        {isAdminAuthenticated && false && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setIsSurveyForceOpen(true)}
                onTouchStart={(e) => e.stopPropagation()}
                variant="neutral"
                size="icon"
                className="z-[35] w-10 h-10 md:w-12 md:h-12 rounded-none transition-colors hover:bg-main hover:text-black"
              >
                <i className="hn hn-clock text-xl md:text-2xl"></i>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center" sideOffset={10}>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-black tracking-widest">{t("app.speed_survey", "加載速度調查 (Demo)")}</p>
                <p className="text-[10px] font-mono opacity-60 normal-case">
                  SPEED_SURVEY
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        <div className="z-40 relative">
          <LanguageToggle isIconOnly={true} />
        </div>
        <div className="z-40 relative">
          <ThemeToggle isIconOnly={true} />
        </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 頁尾 Footer */}
      <footer className="bg-card relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none crt-lines"></div>
        <div className="mx-auto px-4 pb-16 pt-8 w-full max-w-7xl relative max-[1430px]:max-w-[calc(100%-12rem)] max-[1024px]:max-w-[calc(100%-10rem)] max-[768px]:max-w-full">
          {/* 三語版權聲明區塊 & 導航 */}
          <div className="p-6 md:p-8 border-4 border-black bg-black/5 relative group">
            <div className="absolute -top-4 left-4 md:left-6 bg-black text-main px-3 py-1 text-[10px] font-black border-2 border-main">
              <div className="flex flex-col leading-tight">
                <span className="opacity-90">
                  版權/法律聲明
                </span>
                <span className="font-mono opacity-60">
                  Legal_Signal_Broadcast
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 min-[520px]:grid-cols-2 min-[900px]:grid-cols-3 min-[1120px]:grid-cols-4 gap-8 md:gap-10 items-center">
              {/* 中文 & 多語言 */}
              <div className="space-y-6 min-[520px]:col-span-1 min-[900px]:col-span-2 min-[1120px]:col-span-3">
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
              <div className="border-t-2 min-[520px]:border-t-0 min-[520px]:border-l-2 border-black/10 pt-6 min-[520px]:pt-0 pl-0 min-[520px]:pl-6 md:pl-8 col-span-1 flex flex-col justify-center">
                {/* 外部依賴與資源聲明 */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-black mb-2 opacity-30 flex flex-col leading-tight">
                    <span>{t("app.external_resources", "外部資源")}</span>
                    <span className="text-[10px] font-mono opacity-60">
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
                        <i className="hn hn-external-link text-[10px] opacity-50 shrink-0" />
                        <span className="flex items-center flex-wrap gap-x-1.5 leading-tight">
                          <span className="whitespace-nowrap">{t("app.pixel_icons", "像素圖示庫")}</span>
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
                        <span>授權：CC BY 4.0</span>
                        <span className="text-[8px] font-mono opacity-60">
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
                        <i className="hn hn-external-link text-[10px] opacity-50 shrink-0" />
                        <span className="flex items-center flex-wrap gap-x-1.5 leading-tight">
                          <span className="whitespace-nowrap">{t("app.pixel_font", "像素字型")}</span>
                          <span className="text-[10px] font-mono opacity-60 break-words">
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
                        <span>授權：OFL 1.1</span>
                        <span className="text-[8px] font-mono opacity-60">
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
                        <i className="hn hn-external-link text-[10px] opacity-50 shrink-0" />
                        <span className="flex items-center flex-wrap gap-x-1.5 leading-tight">
                          <span className="whitespace-nowrap">{t("app.ui_design_system", "UI 設計系統")}</span>
                          <span className="text-[10px] font-mono opacity-60 break-words">
                            Neobrutalism UI
                          </span>
                        </span>
                      </a>
                      <span
                        className="opacity-50 ml-7 flex items-baseline gap-1.5"
                        title="授權：MIT (MIT License)"
                      >
                        <span>授權：MIT</span>
                        <span className="text-[8px] font-mono opacity-60">
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
                        <i className="hn hn-external-link text-[10px] opacity-50 shrink-0" />
                        <span className="flex items-center flex-wrap gap-x-1.5 leading-tight">
                          <span className="whitespace-nowrap">燈箱元件</span>
                          <span className="text-[10px] font-mono opacity-60 break-words">
                            Fancybox UI
                          </span>
                        </span>
                      </a>
                      <span
                        className="opacity-50 ml-7 flex items-baseline gap-1.5"
                        title="授權：GPLv3 (GPLv3 License)"
                      >
                        <span>授權：GPLv3</span>
                        <span className="text-[8px] font-mono opacity-60">
                          License
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-8 md:gap-4 text-[10px]">
            <div className="text-center md:text-left flex flex-col leading-tight items-center md:items-start md:flex-1 md:basis-0">

              <span className="flex items-center gap-1 flex-wrap justify-center md:justify-start">
                <span className="opacity-30">
                  © {new Date().getFullYear()} ZTMY MV 資料庫 
                  | FE: {VERSION_CONFIG.app} (🕒 {VERSION_CONFIG.buildDate.replace(/-/g, '')})
                  {systemStatus?.version && ` | BE: ${systemStatus.version}`}
                  {systemStatus?.buildTime && ` (🕒 ${new Date(systemStatus.buildTime).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\//g, '')})`}
                </span>
                <Tooltip delayDuration={0} open={isGeoTooltipOpen} onOpenChange={setIsGeoTooltipOpen}>
                  <TooltipTrigger asChild>
                    <span 
                      className="cursor-help border-b border-dashed border-current hover:text-main transition-colors select-none opacity-30 hover:opacity-100"
                      onClick={(e) => {
                        e.preventDefault();
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        // 移動端點擊時切換 tooltip 狀態
                        setIsGeoTooltipOpen(prev => !prev);
                      }}
                      onPointerDown={(e) => {
                        // 解決部分移動端瀏覽器 (如 iOS Safari) 不觸發 tooltip 的問題
                        e.stopPropagation();
                      }}
                    >
                      {geoInfo.labelCn}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top" 
                    align="start" 
                    sideOffset={10} 
                    className="max-w-[250px] text-left z-[100] bg-main text-main-foreground shadow-md opacity-100"
                    onPointerDownOutside={() => {
                      // 點擊外面時關閉 tooltip
                      setIsGeoTooltipOpen(false);
                    }}
                  >
                    <p className="text-xs leading-relaxed font-bold opacity-100">{geoInfo.desc}</p>
                  </TooltipContent>
                </Tooltip>
              </span>

              <span className="opacity-18 normal-case text-[8px] mt-1">
                <span>ZUTOMAYO_MV_GALLERY_BUILD_{import.meta.env.VITE_BUILD_DATE?.replace(/-/g, '')}_{import.meta.env.VITE_BUILD_HASH || 'dev'}_{geoInfo.labelEn}
                </span>
              </span>

            </div>

              <div className="flex flex-col items-center gap-4 order-first md:order-none md:flex-none">
                <a
                  href="https://dan.tw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 font-black border-2 border-main px-4 py-2 bg-black text-main group transition-all hover:bg-main hover:text-black ztmy-avatar-trigger"
                  title="前往開發者個人網站"
                  onMouseLeave={(e) => {
                    const img = e.currentTarget.querySelector('img');
                    if (img) {
                      img.style.animation = 'none';
                      void img.offsetWidth; // 觸發 reflow
                      img.style.animation = 'var(--animate-avatar-land)';
                    }
                  }}
                  onMouseEnter={(e) => {
                    const img = e.currentTarget.querySelector('img');
                    if (img) {
                      img.style.animation = 'var(--animate-avatar-jump)';
                    }
                  }}
                >
                  <img 
                    src={`https://${geoInfo.isChinaIP ? 'cravatar.cn' : 'gravatar.com'}/avatar/2ad947c5152cd8d6d2f9b5bd450d939b?s=80&d=retro`} 
                    alt="DANERSAKA" 
                    className="w-8 h-8 rounded-sm border-2 border-current group-hover:border-black transition-colors origin-bottom"
                  />
                  <div className="flex flex-col items-start leading-tight">
                    <div className="flex gap-2 items-center">
                      <span className="opacity-90">由 飯糰 製作</span>
                      <i className="hn hn-heart-solid text-red-500 group-hover:animate-pulse text-[12px] leading-none"></i>
                    </div>
                    <span className="text-[8px] font-mono">
                      <span className="opacity-60">MADE_WITH{" "}</span>
                      <i className="hn hn-heart-solid opacity-90 text-red-500 group-hover:animate-pulse text-[10px] leading-none"></i>{" "}
                      <span className="opacity-60">BY_DANERSAKA</span>
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
                  <span>{t("app.open_source", "開源專案")}</span>
                  <span className="text-[8px] opacity-60 normal-case">
                    Open Source Repository
                  </span>
                </span>
              </a>
            </div>

            <div className="opacity-30 text-center md:text-right flex flex-col leading-tight items-center md:items-end md:flex-1 md:basis-0">
              <span>
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
            <WalineComments 
              path="/site-feedback" 
              className="waline-wrapper" 
              reactionTitle={navigator.language.includes('zh-CN') || navigator.language.includes('zh-SG') ? '喜欢这个网站吗？' : 
                             navigator.language.includes('zh') ? '喜歡這個網站嗎？' : 
                             navigator.language.includes('ja') ? 'このサイトは気に入りましたか？' : 
                             'Do you like this site?'}
            />
          )}
        </div>
      </div>

      {/* 暫時隱藏加載速度評價彈窗
      <SpeedRatingSurvey forceOpen={isSurveyForceOpen} onCloseForce={() => setIsSurveyForceOpen(false)} />
      */}

      {/* 詳情彈窗 */}
      <MVDetailsModal
        mv={selectedMv}
        onClose={() => {
          if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
          } else {
            navigate(showFavOnly ? "/favorites" : "/", { replace: true });
          }
        }}
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
  const { t } = useTranslation();

  const apiUrl = import.meta.env.VITE_API_URL || "/api/mvs";
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

  const { data: systemStatus, mutate: mutateSystemStatus } = useSWR<{ maintenance: boolean; type?: 'data' | 'ui'; eta?: string | null; buildTime?: string | null }>(
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
    initGeo(true); // 強制清除快取並重新偵測，以應對用戶開關 VPN 的情況
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
          position: "bottom-center",
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
    systemStatus,
  };

  if (systemStatus?.maintenance && !isAdminRoute) {
    return <MaintenancePage type={systemStatus.type || 'ui'} eta={systemStatus.eta} />;
  }

  return (
    <>
      <CustomCursor />
      <Routes>
        <Route path="/" element={<App {...commonProps} />}>
          <Route index element={null} />
          <Route path="favorites" element={null} />
          <Route path="mv/:id" element={null} />
        </Route>
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
      <Toaster position="top-center" />
    </>
  );
}
