import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useParams,
  Outlet,
} from "react-router-dom";
import { MVItem } from "@/lib/types";
import { getAuthApiBase, getMvsApiBase, getSystemApiBase } from "@/lib/admin-api";
import { initAnalytics } from "@/lib/analytics";
import { printEgg } from "@/lib/egg";
import { initRuntimeBridge } from "@/lib/runtime-bridge";
import { initGeo, getGeoInfo } from "@/lib/geo";
import { useGeoLabel } from "@/hooks/useGeoLabel";
import { MVDetailsModal } from "@/components/MVDetailsModal";
import { IllustratorDetailsModal } from "@/components/IllustratorDetailsModal";
import { LoadingScreen } from "@/components/LoadingScreen";
import { NetworkWarningScreen } from "@/components/NetworkWarningScreen";
import { ErrorScreen } from "@/components/ErrorScreen";
import { AppHeader } from "@/components/AppHeader";
import { FilterBar } from "@/components/FilterBar";
import { GalleryGrid } from "@/components/GalleryGrid";
import { ControlHub } from "@/components/ControlHub";
import { FeedbackDrawer } from "@/components/FeedbackDrawer";
import { AppFooter } from "@/components/AppFooter";
import { PWAInstallDrawer } from "@/components/PWAInstallDrawer";
import { PWARecoverDrawer } from "@/components/PWARecoverDrawer";
import { SpeedRatingSurvey } from "@/components/SpeedRatingSurvey";
// 前台頁面懶加載
const AppleMusicGalleryPage = React.lazy(() => import("@/pages/AppleMusicGalleryPage").then((m) => ({ default: m.AppleMusicGalleryPage })));
const SubmitFanArtPage = React.lazy(() => import("@/pages/SubmitFanArtPage").then((m) => ({ default: m.SubmitFanArtPage })));
const PublicLoginPage = React.lazy(() => import("@/pages/PublicLoginPage").then((m) => ({ default: m.PublicLoginPage })));
const MySubmissionsPage = React.lazy(() => import("@/pages/MySubmissionsPage").then((m) => ({ default: m.MySubmissionsPage })));
const PublicRegisterPage = React.lazy(() => import("@/pages/PublicRegisterPage").then((m) => ({ default: m.PublicRegisterPage })));
const PublicForgotPasswordPage = React.lazy(() => import("@/pages/PublicForgotPasswordPage").then((m) => ({ default: m.PublicForgotPasswordPage })));
const VerifyEmailCallbackPage = React.lazy(() => import("@/pages/VerifyEmailCallbackPage").then((m) => ({ default: m.VerifyEmailCallbackPage })));
const ResetPasswordPage = React.lazy(() => import("@/pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })));
const NotFoundPage = React.lazy(() => import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));
const Demo3DCardPage = React.lazy(() => import("@/pages/Demo3DCardPage").then((m) => ({ default: m.Demo3DCardPage })));
const DemoCDCasePage = React.lazy(() => import("@/pages/DemoCDCasePage").then((m) => ({ default: m.DemoCDCasePage })));
const DemoTraeFooterHoverPage = React.lazy(() => import("@/pages/DemoTraeFooterHoverPage").then((m) => ({ default: m.DemoTraeFooterHoverPage })));
const IllustratorsPage = React.lazy(() => import("@/pages/IllustratorsPage").then((m) => ({ default: m.IllustratorsPage })));
const FanArtPage = React.lazy(() => import("@/pages/FanArtPage").then((m) => ({ default: m.FanArtPage })));
const MaintenancePage = React.lazy(() => import("@/pages/MaintenancePage").then((m) => ({ default: m.MaintenancePage })));
const DebugFancyboxMasonry = React.lazy(() => import("@/debug/DebugFancyboxMasonry"));
const DebugMVModalLightbox = React.lazy(() => import("@/debug/DebugMVModalLightbox"));

const pageFallback = <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-pulse font-mono text-sm">Loading...</div></div>;
import { PageNavigation } from "@/components/PageNavigation";

import { PWAPrompt } from "@/components/PWAPrompt";
import { Toaster } from "@/components/ui/sonner";

import Marquee from "@/components/ui/marquee";

import useSWR from "swr";

import AdminLayout from "@/components/admin/AdminLayout";
import { AdminHomeRedirect, AdminSystemRedirect } from "@/components/admin/AdminHomeRedirect";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import { useTranslation } from 'react-i18next';
import { RouteDataProvider, useRouteData } from "@/lib/routeData";
import { MVRouteBoundary } from "@/routes/MVRouteBoundary";
import { IllustratorRouteBoundary } from "@/routes/IllustratorRouteBoundary";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useMVFilters } from "@/hooks/useMVFilters";
import { useFavorites } from "@/hooks/useFavorites";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useStickyFilterBar } from "@/hooks/useStickyFilterBar";
import { usePWA } from "@/hooks/usePWA";
import { useLoadingTransition } from "@/hooks/useLoadingTransition";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { useAnimationPause } from "@/hooks/useAnimationPause";
import { useAmbientMode } from "@/hooks/useAmbientMode";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { isSupportedLang, normalizeLang } from "@/i18n";

const AdminPage = React.lazy(() => import("@/pages/AdminPage").then((m) => ({ default: m.AdminPage })));
const AdminArtistsPage = React.lazy(() => import("@/pages/AdminArtistsPage").then((m) => ({ default: m.AdminArtistsPage })));
const AdminAlbumsPage = React.lazy(() => import("@/pages/AdminAlbumsPage").then((m) => ({ default: m.AdminAlbumsPage })));
const AdminAppleMusicAlbumsPage = React.lazy(() => import("@/pages/AdminAppleMusicAlbumsPage").then((m) => ({ default: m.AdminAppleMusicAlbumsPage })));
const AdminDictsPage = React.lazy(() => import("@/pages/AdminDictsPage").then((m) => ({ default: m.AdminDictsPage })));
const AdminFanArtPage = React.lazy(() => import("@/pages/AdminFanArtPage").then((m) => ({ default: m.AdminFanArtPage })));
const AdminStagingFanartPage = React.lazy(() => import("@/pages/AdminStagingFanartPage").then((m) => ({ default: m.AdminStagingFanartPage })));
const AdminSubmissionsPage = React.lazy(() => import("@/pages/AdminSubmissionsPage").then((m) => ({ default: m.AdminSubmissionsPage })));
const AdminSystemUsersPage = React.lazy(() => import("@/pages/AdminSystemUsersPage").then((m) => ({ default: m.AdminSystemUsersPage })));
const AdminSystemRolesPage = React.lazy(() => import("@/pages/AdminSystemRolesPage").then((m) => ({ default: m.AdminSystemRolesPage })));
const AdminSystemMenusPage = React.lazy(() => import("@/pages/AdminSystemMenusPage").then((m) => ({ default: m.AdminSystemMenusPage })));
const AdminAuthPage = React.lazy(() => import("@/pages/AdminAuthPage").then((m) => ({ default: m.AdminAuthPage })));
const AdminSystemAnnouncementsPage = React.lazy(() => import("@/pages/AdminSystemAnnouncementsPage").then((m) => ({ default: m.AdminSystemAnnouncementsPage })));
const AdminMVSettingsPage = React.lazy(() => import("@/pages/AdminMVSettingsPage").then((m) => ({ default: m.AdminMVSettingsPage })));
const AdminOrphanMediaPage = React.lazy(() => import("@/pages/AdminOrphanMediaPage").then((m) => ({ default: m.AdminOrphanMediaPage })));
const AdminErrorLogsPage = React.lazy(() => import("@/pages/AdminErrorLogsPage").then((m) => ({ default: m.AdminErrorLogsPage })));
const AdminMediaGroupsPage = React.lazy(() => import("@/pages/AdminMediaGroupsPage").then((m) => ({ default: m.AdminMediaGroupsPage })));
const AdminMediaGroupRepairPage = React.lazy(() => import("@/pages/AdminMediaGroupRepairPage").then((m) => ({ default: m.AdminMediaGroupRepairPage })));
const AdminAccountPage = React.lazy(() => import("@/pages/AdminAccountPage").then((m) => ({ default: m.AdminAccountPage })));
const AdminAnnotationsPage = React.lazy(() => import("@/pages/AdminAnnotationsPage").then((m) => ({ default: m.AdminAnnotationsPage })));

const adminFallback = <div className="p-6 font-mono text-sm">Loading...</div>;

const adminRoute = (resource: string | undefined, element: React.ReactNode) => (
  <AdminRouteGuard resource={resource}>
    <React.Suspense fallback={adminFallback}>{element}</React.Suspense>
  </AdminRouteGuard>
);


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
    settings: { showAutoAlbumDate: boolean; announcements?: string[] | Record<string, string[]> };
  };
  systemStatus?: { maintenance: boolean; type?: 'data' | 'ui'; eta?: string | null; buildTime?: string | null };
}) {
  const glitchStyleVars = useMemo(() => ({
    '--glitch-random': Math.random() > 0.5 ? 1 : -1,
    '--jitter-dur': `${Math.random() * 2 + 2}s`,
    '--scan-fast-dur': `${Math.random() * 2 + 2.5}s`,
    '--scan-slow-dur': `${Math.random() * 3 + 4.5}s`,
    '--crt-scroll-dur': `${Math.random() * 5 + 8}s`,
    '--glow-dur': `${Math.random() * 2 + 2}s`,
    '--aberration-dur': `${Math.random() * 3 + 4}s`,
    '--slice-1-dur': `${Math.random() * 2 + 3.5}s`,
    '--slice-2-dur': `${Math.random() * 3 + 5.5}s`,
    '--pulse-dur': `${Math.random() * 1.5 + 1}s`
  }), []);

  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const backgroundLocation = (location.state as any)?.backgroundLocation as undefined | { pathname: string; search?: string; hash?: string; state?: any; key?: string };
  const { mvRoute } = useRouteData();

  const marqueeAnnouncements = useMemo(() => {
    // 檢查 API 結構，因為 announcements 從 settings 移動到根目錄了
    const raw = metadata?.announcements || metadata?.settings?.announcements;
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.filter((v) => typeof v === "string" && v.trim() !== "");
    }
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      const pick = (k: string) => (Array.isArray(obj[k]) ? (obj[k] as unknown[]) : []);
      const lang = i18n.language;
      const base = lang.split("-")[0] || lang;
      const candidates = [pick(lang), pick(base), pick("zh-TW"), pick("zh-HK"), pick("zh-CN")];
      const preferred = candidates.find((v) => v.length > 0) ?? [];
      const fallback =
        (Object.values(obj).find((v) => Array.isArray(v) && v.length > 0) as unknown[]) ?? [];
      const selected = (preferred.length > 0 ? preferred : fallback) as unknown[];
      return selected.filter((v) => typeof v === "string" && v.trim() !== "") as string[];
    }
    return [];
  }, [metadata?.settings?.announcements, metadata?.announcements, i18n.language]);

  const { activeLang, pathnameWithoutLang } = useMemo(() => {
    const pathname = backgroundLocation?.pathname || location.pathname;
    const parts = pathname.split("/");
    const maybeLng = parts[1];
    if (isSupportedLang(maybeLng)) {
      const rest = "/" + parts.slice(2).join("/");
      return {
        activeLang: maybeLng,
        pathnameWithoutLang: rest === "/" ? "/" : rest,
      };
    }
    return {
      activeLang: normalizeLang(i18n.language),
      pathnameWithoutLang: location.pathname || "/",
    };
  }, [backgroundLocation?.pathname, i18n.language, location.pathname]);

  const basePath = `/${activeLang}`;

  const showFavOnly = pathnameWithoutLang === "/favorites" || (location.state as any)?.fromFav;
  const mvIdMatch = pathnameWithoutLang.match(/^\/mv\/([^/]+)/);
  const modalPathnameWithoutLang = useMemo(() => {
    const parts = location.pathname.split("/");
    const maybeLng = parts[1];
    if (isSupportedLang(maybeLng)) {
      const rest = "/" + parts.slice(2).join("/");
      return rest === "/" ? "/" : rest;
    }
    return location.pathname || "/";
  }, [location.pathname]);
  const modalMvIdMatch = modalPathnameWithoutLang.match(/^\/mv\/([^/]+)/);
  const backgroundPathnameWithoutLang = useMemo(() => {
    const pathname = backgroundLocation?.pathname;
    if (!pathname) return null;
    const parts = pathname.split("/");
    const maybeLng = parts[1];
    if (isSupportedLang(maybeLng)) {
      const rest = "/" + parts.slice(2).join("/");
      return rest === "/" ? "/" : rest;
    }
    return pathname || "/";
  }, [backgroundLocation?.pathname]);
  const bgMvIdMatch = backgroundPathnameWithoutLang ? backgroundPathnameWithoutLang.match(/^\/mv\/([^/]+)/) : null;
  const selectedMvId = (modalMvIdMatch ? modalMvIdMatch[1] : null) || (bgMvIdMatch ? bgMvIdMatch[1] : null);
  const isFanartRoute = !!modalPathnameWithoutLang.match(/^\/mv\/[^/]+\/fanart/);
  const modalIllustratorIdMatch = modalPathnameWithoutLang.match(/^\/illustrators\/([^/]+)/);
  const selectedIllustratorId = modalIllustratorIdMatch ? modalIllustratorIdMatch[1] : null;

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1024 : false,
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMac = useMemo(() => {
    if (typeof window === "undefined") return false;
    const isMacOs = /Mac/i.test(navigator.userAgent) || navigator.platform?.toUpperCase().indexOf("MAC") >= 0;
    const isMobileOrTouch =
      /(iPhone|iPod|iPad)/i.test(navigator.userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    return isMacOs && !isMobileOrTouch;
  }, []);

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [mvViewMode, setMvViewMode] = useState<'detail' | 'fanart'>('detail');
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isGeoTooltipOpen, setIsGeoTooltipOpen] = useState(false);
  const [isSurveyForceOpen, setIsSurveyForceOpen] = useState(false);
  const [shouldRenderFeedback, setShouldRenderFeedback] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const { type: networkType, saveData: networkSaveData, isIosMobileSafari } = useNetworkStatus();

  const { favorites, favoritesRef, favVersion, toggleFav } = useFavorites({ mvData, showFavOnly });

  const {
    search, setSearch, debouncedSearch,
    yearFilter, setYearFilter, albumFilter, setAlbumFilter, artistFilter, setArtistFilter,
    openYear, setOpenYear, openAlbum, setOpenAlbum, openArtist, setOpenArtist,
    uniqueYears, uniqueAlbums, groupedAlbums, uniqueArtists, albumDateMap,
    filteredData, sortOrder, setSortOrder,
  } = useMVFilters({ mvData, metadata, showFavOnly, favoritesRef, favVersion });

  const { visibleCount, setSentinelEl, lastBatchStartRef } = useInfiniteScroll({
    filteredData,
    filterDeps: [debouncedSearch, yearFilter, albumFilter, artistFilter, showFavOnly, sortOrder],
  });

  const { filterBarRef, filterAnchorRef } = useStickyFilterBar({
    filterDeps: [debouncedSearch, yearFilter, albumFilter, artistFilter],
  });

  const {
    deferredPrompt, setDeferredPrompt, isInstallPromptOpen, setIsInstallPromptOpen,
    isRecoverPromptOpen, setIsRecoverPromptOpen, triggerPWARecovery, runPWARecovery,
  } = usePWA();

  const {
    showLoadingScreen, showWarningScreen, isContentReady, isContentFadingIn,
    isAnimationComplete, isTransitioningOut, networkAlertAcknowledged, handleWarningConfirm,
  } = useLoadingTransition({
    isLoading, error, mvDataLength: mvData.length,
    networkType, networkSaveData, isIosMobileSafari,
  });

  const scrolled = useScrollPosition();

  const headerRef = useRef<HTMLElement>(null);

  const isGlobalPaused = useAnimationPause({
    selectedMvId, selectedIllustratorId, isFeedbackOpen, isAboutOpen, isMobile, headerRef,
  });

  const { isAmbient } = useAmbientMode();

  const geoInfo = useGeoLabel();

  useEffect(() => {
    if (isFeedbackOpen) {
      setShouldRenderFeedback(true);
    } else {
      const timer = setTimeout(() => {
        setShouldRenderFeedback(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isFeedbackOpen]);

  const is404Route = pathnameWithoutLang === "/404";
  const isDemo3DCard = pathnameWithoutLang === "/demo/3d-card";
  const isIllustratorsRoute = pathnameWithoutLang === "/illustrators" || pathnameWithoutLang.startsWith("/illustrators/");
  const isFanArtRoute = pathnameWithoutLang === "/fanart" || pathnameWithoutLang === "/fanart/submit";
  const isFanArtSubmitRoute = pathnameWithoutLang === "/fanart/submit";
  const isAppleMusicGalleryRoute = pathnameWithoutLang === "/albums";
  const isSubmitRoute = pathnameWithoutLang === "/submit";
  const isLoginRoute = pathnameWithoutLang === "/login";
  const isRegisterRoute = pathnameWithoutLang === "/register";
  const isForgotRoute = pathnameWithoutLang === "/forgot";
  const isMeSubmissionsRoute = pathnameWithoutLang === "/me/submissions";
  const isNotFound = pathnameWithoutLang !== "/" && pathnameWithoutLang !== "/favorites" && !isIllustratorsRoute && !isFanArtRoute && !isAppleMusicGalleryRoute && !isSubmitRoute && !isLoginRoute && !isRegisterRoute && !isForgotRoute && !isMeSubmissionsRoute && !is404Route && !isDemo3DCard && !mvIdMatch;

  useEffect(() => {
    const isAdminRoute = pathnameWithoutLang.startsWith("/admin");
    let cancelled = false;

    if (!isAdminRoute) {
      setIsAdminAuthenticated(false);
      return;
    }

    const authApiUrl = getAuthApiBase();
    fetch(`${authApiUrl}/me`, { credentials: "include" })
      .then((res) => {
        if (cancelled) return;
        setIsAdminAuthenticated(res.ok);
      })
      .catch(() => {
        if (!cancelled) setIsAdminAuthenticated(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pathnameWithoutLang]);

  const handleMVClick = useCallback((id: string) => {
    const bg = (location.state as any)?.backgroundLocation || location;
    navigate(`${basePath}/mv/${id}`, { state: { fromFav: showFavOnly, backgroundLocation: bg } });
  }, [navigate, basePath, location, showFavOnly]);

  const selectedMv = useMemo(() => {
    const fromList = mvData.find((m) => m.id === selectedMvId) || null;
    if (fromList) return fromList;
    if (selectedMvId && mvRoute.status === 'success' && mvRoute.id === selectedMvId) return mvRoute.mv;
    return null;
  }, [mvData, mvRoute, selectedMvId]);

  const handleViewModeChange = useCallback((mode: 'detail' | 'fanart') => {
    setMvViewMode(mode);
    const newPath = mode === 'fanart'
      ? `${basePath}/mv/${selectedMvId}/fanart`
      : `${basePath}/mv/${selectedMvId}`;
    navigate(newPath, { state: { backgroundLocation: backgroundLocation || location }, replace: true });
  }, [basePath, selectedMvId, navigate, backgroundLocation, location]);

  const selectedIllustrator = useMemo(() => {
    if (!selectedIllustratorId) return null;
    const decodedId = decodeURIComponent(selectedIllustratorId);
    const artistsMap = new Map<string, { name: string; twitter?: string; mvs: MVItem[]; meta?: any }>();
    mvData.forEach((mv) => {
      mv.creators?.forEach((c: any) => {
        const a = typeof c === 'object' ? c.name : c;
        if (!a || typeof a !== 'string' || a.trim() === '') return;
        if (!artistsMap.has(a)) {
          const meta = (metadata as any)?.artistMeta?.[a];
          artistsMap.set(a, {
            name: a,
            twitter: meta?.hideId ? undefined : (meta?.twitter || meta?.id),
            meta,
            mvs: [],
          });
        }
        artistsMap.get(a)?.mvs.push(mv);
      });
    });
    const illustrators = Array.from(artistsMap.values());
    const found = illustrators.find(a =>
      a.meta?.dataId === decodedId ||
      a.meta?.id?.replace('@', '') === decodedId ||
      a.name === decodedId
    );
    return found || null;
  }, [metadata, mvData, selectedIllustratorId]);

  useBodyScrollLock(isFeedbackOpen || !!selectedMvId || !!selectedIllustratorId || isAboutOpen || isFanArtSubmitRoute);

  useEffect(() => {
    setMvViewMode(isFanartRoute ? 'fanart' : 'detail');
  }, [selectedMvId, isFanartRoute]);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('umami_identify_sent') === 'true') return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      if (window.umami && typeof window.umami.identify === 'function') {
        if (sessionStorage.getItem('umami_identify_sent') === 'true') return;

        const geoInfo = await getGeoInfo();
        if (cancelled) return;

        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const browserLanguage = navigator.language || navigator.languages?.[0] || 'unknown';
        const uiLanguage = i18n.language || browserLanguage;
        const isAdmin = isAdminAuthenticated;
        let isChinaNetwork = false;
        let enableIpGeo = true;
        try {
          isChinaNetwork = localStorage.getItem('is_china') === 'true';
          enableIpGeo = localStorage.getItem('enable_ip_geo') !== 'false';
        } catch {
        }

        window.umami.identify({
          favorites_count: favorites.length,
          has_favorites: favorites.length > 0 ? 'true' : 'false',
          is_mobile: isMobile ? 'true' : 'false',
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
          browser_language: browserLanguage,
          ui_language: uiLanguage,
          country: geoInfo?.country || 'unknown',
          city: geoInfo?.city || 'unknown',
          is_vpn: geoInfo?.is_vpn || 'unknown',
          timezone: timezone,
          is_china_network: isChinaNetwork ? 'true' : 'false',
          geo_tracking_enabled: enableIpGeo ? 'true' : 'false',
          is_admin: isAdmin ? 'true' : 'false'
        });

        sessionStorage.setItem('umami_identify_sent', 'true');
      }
    }, 1500);
    
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

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
        title: t("app.feedback", "意見回饋")
      }));
    }
  }, [isFeedbackOpen]);

  // 當過濾結果為空時，發送追蹤事件 (使用 useRef 避免重複發送)
  const hasLoggedEmptySearch = useRef(false);
  useEffect(() => {
    if (filteredData.length === 0 && !isLoading && !error) {
      if (!hasLoggedEmptySearch.current && window.umami && typeof window.umami.track === 'function') {
        window.umami.track('Z_Search_No_Results', {
          search_term: search || 'none',
          year_filter: yearFilter.join(',') || 'none',
          album_filter: albumFilter.join(',') || 'none',
          artist_filter: artistFilter.join(',') || 'none',
          is_favorites_view: showFavOnly ? 'true' : 'false'
        });
        hasLoggedEmptySearch.current = true;
      }
    } else {
      hasLoggedEmptySearch.current = false;
    }
  }, [filteredData.length, search, yearFilter, albumFilter, artistFilter, showFavOnly, isLoading, error]);


  if (showLoadingScreen) {
    return <LoadingScreen isTransitioningOut={isTransitioningOut} isAmbient={isAmbient} />;
  }

  // 網路流量警告攔截畫面
  if (showWarningScreen) {
    return <NetworkWarningScreen isTransitioningOut={isTransitioningOut} isIosMobileSafari={isIosMobileSafari} networkType={networkType} networkSaveData={networkSaveData} onConfirm={handleWarningConfirm} />;
  }

  // 防止畫面在動畫期間閃爍
  if (!isContentReady && !error) {
    return (
      <div className="min-h-screen bg-background relative isolate">
        <div className="pointer-events-none fixed inset-0 z-[-1] crt-lines-global opacity-100" />
      </div>
    );
  }

  if (error && mvData.length === 0) {
    return <ErrorScreen error={error} />;
  }

  const isPublicAuthStandalone = isLoginRoute || isRegisterRoute || isForgotRoute
  if (isPublicAuthStandalone) {
    if (isLoginRoute) return <React.Suspense fallback={pageFallback}><PublicLoginPage /></React.Suspense>
    if (isRegisterRoute) return <React.Suspense fallback={pageFallback}><PublicRegisterPage /></React.Suspense>
    return <React.Suspense fallback={pageFallback}><PublicForgotPasswordPage /></React.Suspense>
  }

  return (
    <div className={`min-h-screen bg-background text-foreground font-base font-normal selection:bg-main selection:text-main-foreground relative isolate flex flex-col`}>
      {/* 整個首頁的全局背景 CRT 濾鏡層 */}
      <div className="pointer-events-none fixed inset-0 z-[-1] crt-lines-global opacity-100" />
      {isAmbient && <div className="ambient-midnight-stars-a" />}
      {isAmbient && <div className="ambient-midnight-stars-b" />}

      <div className={`flex-1 relative flex flex-col transition-opacity duration-[1000ms] ease-out ${isContentFadingIn ? 'opacity-100' : 'opacity-0'}`}>
        {/* 跑馬燈 (置於最頂部) */}
        {!is404Route && !isDemo3DCard && marqueeAnnouncements.length > 0 && (
            <div className="w-full relative z-40 bg-main border-y-4 border-black">
              <Marquee items={marqueeAnnouncements} />
            </div>
          )}

        {/* 頁首 */}
        <AppHeader
          ref={headerRef}
          isGlobalPaused={isGlobalPaused}
          glitchStyleVars={glitchStyleVars}
          onVersionClick={(e) => { e.stopPropagation(); triggerPWARecovery(); }}
          onVersionTouchStart={(e) => { e.stopPropagation(); triggerPWARecovery(); }}
          isAmbient={isAmbient}
        />

      {/* 頁首 */}
      {/* 頁面導航 */}
      {!is404Route && !isDemo3DCard && (
        <PageNavigation currentRoute={pathnameWithoutLang} basePath={basePath} />
      )}

      <main className={`mx-auto px-4 w-full pt-4 relative flex-1 transition-all duration-[1000ms] ease-out ${isAnimationComplete ? '' : (isContentFadingIn ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0')} ${is404Route ? 'flex items-center justify-center' : 'max-w-7xl pb-8 max-[1430px]:max-w-[calc(100%-12rem)] max-[1024px]:max-w-[calc(100%-10rem)] max-[768px]:max-w-[80%] min-h-[calc(100vh-100px)]'} ${isAppleMusicGalleryRoute ? 'overflow-visible' : ''}`}>
        {isNotFound ? (
          <Navigate to={`${basePath}/404?from=${encodeURIComponent(location.pathname + location.search)}`} replace />
        ) : is404Route ? (
          <React.Suspense fallback={pageFallback}><NotFoundPage /></React.Suspense>
        ) : isDemo3DCard ? (
          <React.Suspense fallback={pageFallback}><Demo3DCardPage basePath={basePath} /></React.Suspense>
        ) : isIllustratorsRoute ? (
          <React.Suspense fallback={pageFallback}><IllustratorsPage mvData={mvData} metadata={metadata} /></React.Suspense>
        ) : isFanArtRoute ? (
          <React.Suspense fallback={pageFallback}><FanArtPage mvData={mvData} /></React.Suspense>
        ) : isAppleMusicGalleryRoute ? (
          <React.Suspense fallback={pageFallback}><AppleMusicGalleryPage /></React.Suspense>
        ) : isSubmitRoute ? (
          <React.Suspense fallback={pageFallback}><SubmitFanArtPage mvData={mvData} /></React.Suspense>
        ) : isLoginRoute ? (
          <React.Suspense fallback={pageFallback}><PublicLoginPage /></React.Suspense>
        ) : isRegisterRoute ? (
          <React.Suspense fallback={pageFallback}><PublicRegisterPage /></React.Suspense>
        ) : isForgotRoute ? (
          <React.Suspense fallback={pageFallback}><PublicForgotPasswordPage /></React.Suspense>
        ) : isMeSubmissionsRoute ? (
          <React.Suspense fallback={pageFallback}><MySubmissionsPage /></React.Suspense>
        ) : (
          <>
            <FilterBar
              search={search}
              setSearch={setSearch}
              yearFilter={yearFilter}
              setYearFilter={setYearFilter}
              albumFilter={albumFilter}
              setAlbumFilter={setAlbumFilter}
              artistFilter={artistFilter}
              setArtistFilter={setArtistFilter}
              openYear={openYear}
              setOpenYear={setOpenYear}
              openAlbum={openAlbum}
              setOpenAlbum={setOpenAlbum}
              openArtist={openArtist}
              setOpenArtist={setOpenArtist}
              uniqueYears={uniqueYears}
              uniqueAlbums={uniqueAlbums}
              groupedAlbums={groupedAlbums}
              uniqueArtists={uniqueArtists}
              albumDateMap={albumDateMap}
              filterBarRef={filterBarRef}
              filterAnchorRef={filterAnchorRef}
              metadata={metadata}
            />
      
            <GalleryGrid
              filteredData={filteredData}
              visibleCount={visibleCount}
              setSentinelEl={setSentinelEl}
              lastBatchStartRef={lastBatchStartRef}
              favorites={favorites}
              toggleFav={toggleFav}
              handleMVClick={handleMVClick}
              isGlobalPaused={isGlobalPaused}
              showFavOnly={showFavOnly}
              basePath={basePath}
              navigate={navigate}
              setSearch={setSearch}
              setYearFilter={setYearFilter}
              setAlbumFilter={setAlbumFilter}
              setArtistFilter={setArtistFilter}
            />
        </>
      )}
      </main>
      </div>

      <ControlHub
        scrolled={scrolled}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        showFavOnly={showFavOnly}
        basePath={basePath}
        navigate={navigate}
        deferredPrompt={deferredPrompt}
        setDeferredPrompt={setDeferredPrompt}
        isInstallPromptOpen={isInstallPromptOpen}
        setIsInstallPromptOpen={setIsInstallPromptOpen}
        isRecoverPromptOpen={isRecoverPromptOpen}
        setIsRecoverPromptOpen={setIsRecoverPromptOpen}
        isFeedbackOpen={isFeedbackOpen}
        setIsFeedbackOpen={setIsFeedbackOpen}
        isAboutOpen={isAboutOpen}
        setIsAboutOpen={setIsAboutOpen}
        isAnimationComplete={isAnimationComplete}
        isContentFadingIn={isContentFadingIn}
        pathnameWithoutLang={pathnameWithoutLang}
        mvIdMatch={mvIdMatch}
        isFanArtSubmitRoute={isFanArtSubmitRoute}
        isMac={isMac}
        triggerPWARecovery={triggerPWARecovery}
        runPWARecovery={runPWARecovery}
        mvData={mvData}
        pageFallback={pageFallback}
        onOpenSpeedSurvey={() => setIsSurveyForceOpen(true)}
      />

      <AppFooter
        is404Route={is404Route}
        isGeoTooltipOpen={isGeoTooltipOpen}
        setIsGeoTooltipOpen={setIsGeoTooltipOpen}
        geoInfo={geoInfo}
        systemStatus={systemStatus}
      />

      {!is404Route && (
        <FeedbackDrawer
          isFeedbackOpen={isFeedbackOpen}
          setIsFeedbackOpen={setIsFeedbackOpen}
          shouldRenderFeedback={shouldRenderFeedback}
        />
      )}

      <SpeedRatingSurvey forceOpen={isSurveyForceOpen} onCloseForce={() => setIsSurveyForceOpen(false)} />

      <MVDetailsModal
        mv={selectedMv}
        metadata={metadata}
        isFav={selectedMv ? favorites.includes(selectedMv.id) : false}
        onToggleFav={() => selectedMv && toggleFav(selectedMv.id)}
        viewMode={mvViewMode}
        onViewModeChange={handleViewModeChange}
        onClose={() => {
          if (document.body.classList.contains('fancybox__body') || document.querySelector('.fancybox__container')) {
            return;
          }
          if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
          } else {
            navigate(showFavOnly ? `${basePath}/favorites` : basePath, { replace: true });
          }
        }}
      />

      <IllustratorDetailsModal
        illustrator={selectedIllustrator}
        onClose={() => {
          if ((location.state as any)?.backgroundLocation) {
            navigate(-1);
            return;
          }
          navigate(`/${activeLang}/illustrators`, { replace: true });
        }}
      />

      <PWAInstallDrawer
        isInstallPromptOpen={isInstallPromptOpen}
        setIsInstallPromptOpen={setIsInstallPromptOpen}
        deferredPrompt={deferredPrompt}
        setDeferredPrompt={setDeferredPrompt}
      />

      <PWARecoverDrawer
        isRecoverPromptOpen={isRecoverPromptOpen}
        setIsRecoverPromptOpen={setIsRecoverPromptOpen}
        runPWARecovery={runPWARecovery}
      />
    </div>
  );
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("API 伺服器無回應 (404/500)");
    return res.json().then((result) => result.data || result);
  });

type AppCommonProps = Parameters<typeof App>[0];

function RootLocaleRedirect({ commonProps }: { commonProps: AppCommonProps }) {
  const { i18n } = useTranslation();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const queryLng = params.get("lang") ?? params.get("lng");
  const targetLng = normalizeLang(queryLng || i18n.resolvedLanguage || i18n.language);
  params.delete("lang");
  params.delete("lng");
  const search = params.toString();

  return (
    <>
      <Navigate replace to={`/${targetLng}${search ? `?${search}` : ""}${location.hash}`} />
      <App {...commonProps} />
    </>
  );
}

function FallbackRedirect({ commonProps }: { commonProps: AppCommonProps }) {
  const { i18n } = useTranslation();
  const location = useLocation();

  const rawParams = new URLSearchParams(location.search);
  const queryLng = rawParams.get("lang") ?? rawParams.get("lng");
  rawParams.delete("lang");
  rawParams.delete("lng");
  const search = rawParams.toString();
  const cleanSearch = search ? `?${search}` : "";

  const targetLng = normalizeLang(queryLng || i18n.resolvedLanguage || i18n.language);

  return (
    <>
      <Navigate replace to={`/${targetLng}${location.pathname}${cleanSearch}${location.hash}`} />
      <App {...commonProps} />
    </>
  );
}

function LocalizedAppLayout({ commonProps }: { commonProps: AppCommonProps }) {
  const { lng } = useParams();
  const { i18n } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    if (isSupportedLang(lng) && i18n.language !== lng) {
      i18n.changeLanguage(lng);
    }
  }, [i18n, lng]);

  const rawParams = new URLSearchParams(location.search);
  const queryLng = rawParams.get("lang") ?? rawParams.get("lng");
  const hasQueryLng = rawParams.has("lang") || rawParams.has("lng");
  rawParams.delete("lang");
  rawParams.delete("lng");
  const search = rawParams.toString();
  const cleanSearch = search ? `?${search}` : "";

  if (isSupportedLang(queryLng)) {
    const targetPath = isSupportedLang(lng)
      ? `/${queryLng}${location.pathname.slice(`/${lng}`.length)}${cleanSearch}`
      : `/${queryLng}${location.pathname}${cleanSearch}`;

    if (queryLng !== lng) {
      return (
        <>
          <Navigate replace to={`${targetPath}${location.hash}`} />
          <App {...commonProps} />
        </>
      );
    }
    if (hasQueryLng) {
      return (
        <>
          <Navigate replace to={`${location.pathname}${cleanSearch}${location.hash}`} />
          <App {...commonProps} />
        </>
      );
    }
  }

  if (hasQueryLng && isSupportedLang(lng)) {
    return (
      <>
        <Navigate replace to={`${location.pathname}${cleanSearch}${location.hash}`} />
        <App {...commonProps} />
      </>
    );
  }

  if (!isSupportedLang(lng)) {
    const targetLng = normalizeLang(queryLng || i18n.resolvedLanguage || i18n.language);
    return (
      <>
        <Navigate replace to={`/${targetLng}${location.pathname}${cleanSearch}${location.hash}`} />
        <App {...commonProps} />
      </>
    );
  }

  return (
    <>
      <App {...commonProps} />
      <Outlet context={commonProps} />
    </>
  );
}

// 全域儲存 PWA 事件，讓子組件可以存取
export let globalDeferredPrompt: any = null;
export function clearGlobalDeferredPrompt() { globalDeferredPrompt = null; }
export const pwaEventTarget = new EventTarget();

// 為了支援 useParams，我們需要導出一個包裹了路由環境的組件
export default function RootApp() {
  const { t, i18n } = useTranslation();

  const apiUrl = getMvsApiBase();
  const defaultMetadata = {
    albumMeta: {},
    artistMeta: {},
    settings: { showAutoAlbumDate: false, announcements: [] as string[] },
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
    settings: { showAutoAlbumDate: boolean; announcements?: string[] | Record<string, string[]> };
  }>(`${apiUrl}/metadata`, fetcher, {
    revalidateOnFocus: false,
  });

  const normalizedMetadata = useMemo(() => {
    const raw = metadataData as any;
    if (!raw) return defaultMetadata;
    const albumMeta = raw.albumMeta || {};
    const artistMeta = raw.artistMeta || {};
    const announcements =
      raw.settings?.announcements !== undefined ? raw.settings.announcements : raw.announcements;
    const showAutoAlbumDate =
      raw.settings?.showAutoAlbumDate !== undefined
        ? raw.settings.showAutoAlbumDate
        : raw.showAutoAlbumDate;

    return {
      albumMeta,
      artistMeta,
      settings: {
        showAutoAlbumDate: typeof showAutoAlbumDate === "boolean" ? showAutoAlbumDate : false,
        announcements: announcements ?? [],
      },
    };
  }, [metadataData]);

  const { data: systemStatus, mutate: mutateSystemStatus } = useSWR<{ maintenance: boolean; type?: 'data' | 'ui'; eta?: string | null; buildTime?: string | null }>(
    `${getSystemApiBase()}/status`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  // 為了保留原本的延遲加載動畫效果
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    let timer: number;
    if (!isSwrLoading) {
      timer = window.setTimeout(() => setIsLoading(false), 800);
    } else {
      setIsLoading(true);
    }
    return () => clearTimeout(timer);
  }, [isSwrLoading]);

  // 全域初始化 Google Analytics 與 Umami 及 地理位置探測
  useEffect(() => {
    initAnalytics();
    printEgg();
    initRuntimeBridge();
    initGeo(true); // 強制清除快取並重新偵測
  }, []);

  // PWA 安裝提示
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // 防止 Chrome 67 以前的版本自動顯示提示
      e.preventDefault();
      // 將事件儲存到全域變數，並觸發自訂事件通知子組件
      globalDeferredPrompt = e;
      pwaEventTarget.dispatchEvent(new Event('pwa-ready'));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const error = swrError ? swrError.message : null;
  const commonProps = useMemo<AppCommonProps>(() => ({
    mvData: mvData || [],
    isLoading,
    error,
    metadata: normalizedMetadata,
    systemStatus,
  }), [mvData, isLoading, error, normalizedMetadata, systemStatus]);

  if (systemStatus?.maintenance && !isAdminRoute) {
    return <React.Suspense fallback={pageFallback}><MaintenancePage type={systemStatus.type || 'ui'} eta={systemStatus.eta} /></React.Suspense>;
  }

  return (
    <RouteDataProvider>
      <>
        <Routes>
            <Route path="/" element={<RootLocaleRedirect commonProps={commonProps} />} />
            <Route path="/auth/verify-email" element={<React.Suspense fallback={pageFallback}><VerifyEmailCallbackPage /></React.Suspense>} />
            <Route path="/auth/reset-password" element={<React.Suspense fallback={pageFallback}><ResetPasswordPage /></React.Suspense>} />
            <Route path="/:lng" element={<LocalizedAppLayout commonProps={commonProps} />}>
              <Route index element={null} />
              <Route path="favorites" element={null} />
              <Route path="illustrators" element={null} />
              <Route path="illustrators/:artistId" element={<IllustratorRouteBoundary />} />
              <Route path="fanart" element={null} />
              <Route path="fanart/submit" element={null} />
              <Route path="submit" element={null} />
              <Route path="login" element={null} />
              <Route path="register" element={null} />
              <Route path="forgot" element={null} />
              <Route path="me/submissions" element={null} />
              <Route path="albums" element={null} />
              <Route path="mv/:id" element={<MVRouteBoundary />} />
              <Route path="mv/:id/fanart" element={<MVRouteBoundary />} />
              <Route path="404" element={null} />
              <Route path="*" element={null} />
            </Route>
            <Route path="/demo/3d-card" element={<React.Suspense fallback={pageFallback}><Demo3DCardPage /></React.Suspense>} />
            <Route path="/demo/cd-case" element={<React.Suspense fallback={pageFallback}><DemoCDCasePage /></React.Suspense>} />
            <Route
              path="/demo/trae-footer-glitch"
              element={<React.Suspense fallback={pageFallback}><DemoTraeFooterHoverPage /></React.Suspense>}
            />
            <Route path="/admin/auth" element={<React.Suspense fallback={adminFallback}><AdminAuthPage /></React.Suspense>} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route
                index
                element={<AdminHomeRedirect />}
              />
              <Route
                path="mvs"
                element={adminRoute("mvs", <AdminPage />)}
              />
              <Route
                path="mvs/settings"
                element={adminRoute("mvsSettings",
                  <AdminMVSettingsPage
                    metadata={normalizedMetadata}
                    systemStatus={systemStatus}
                    onRefresh={() => {
                      mutate();
                      mutateMetadata();
                      mutateSystemStatus();
                    }}
                  />
                )}
              />
              <Route path="account" element={adminRoute(undefined, <AdminAccountPage />)} />
              <Route path="artists" element={adminRoute("artists", <AdminArtistsPage />)} />
              <Route path="albums" element={adminRoute("albums", <AdminAlbumsPage />)} />
              <Route path="apple-music-albums" element={adminRoute("appleMusicAlbums", <AdminAppleMusicAlbumsPage />)} />
              <Route path="dicts" element={adminRoute("dicts", <AdminDictsPage />)} />
              <Route path="fanart" element={adminRoute("fanart", <AdminFanArtPage />)} />
              <Route path="staging-fanarts" element={adminRoute("stagingFanarts", <AdminStagingFanartPage />)} />
              <Route path="submissions" element={adminRoute("submissions", <AdminSubmissionsPage />)} />
              <Route path="annotations" element={adminRoute("annotations", <AdminAnnotationsPage />)} />
              <Route path="system" element={<AdminSystemRedirect />} />
              <Route path="system/users" element={adminRoute("systemUsers", <AdminSystemUsersPage />)} />
              <Route path="system/roles" element={adminRoute("systemRoles", <AdminSystemRolesPage />)} />
              <Route path="system/menus" element={adminRoute("systemMenus", <AdminSystemMenusPage />)} />
              <Route path="system/announcements" element={adminRoute("systemAnnouncements", <AdminSystemAnnouncementsPage />)} />
              <Route path="system/media-groups" element={adminRoute("systemMediaGroups", <AdminMediaGroupsPage />)} />
              <Route path="system/group-repair" element={adminRoute("systemGroupRepair", <AdminMediaGroupRepairPage />)} />
              <Route path="system/orphans" element={adminRoute("systemOrphans", <AdminOrphanMediaPage />)} />
              <Route path="system/errors" element={adminRoute(undefined, <AdminErrorLogsPage />)} />
            </Route>
            <Route path="/debug/fb/:mvid?" element={<React.Suspense fallback={pageFallback}><DebugFancyboxMasonry /></React.Suspense>} />
            <Route path="/debug/modal" element={<React.Suspense fallback={pageFallback}><DebugMVModalLightbox /></React.Suspense>} />
            <Route path="*" element={<FallbackRedirect commonProps={commonProps} />} />
          </Routes>
        {(import.meta.env.PROD || import.meta.env.VITE_PWA_DEV === 'true') ? <PWAPrompt /> : null}
        <Toaster position="top-center" />
      </>
    </RouteDataProvider>
  );
}
