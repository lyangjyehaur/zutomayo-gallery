import React from "react";
import { useTranslation } from "react-i18next";
import { shouldShowSecondaryLang } from "@/i18n";
import { MVItem } from "@/lib/types";
import { AnimatedMVCardItem } from "@/components/AnimatedMVCardItem";
import { Button } from "@/components/ui/button";

interface GalleryGridProps {
  filteredData: MVItem[];
  visibleCount: number;
  setSentinelEl: (el: HTMLDivElement | null) => void;
  lastBatchStartRef: React.MutableRefObject<number>;
  favorites: string[];
  toggleFav: (id: string) => void;
  handleMVClick: (id: string) => void;
  isGlobalPaused: boolean;
  showFavOnly: boolean;
  basePath: string;
  navigate: (path: string, options?: any) => void;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  setYearFilter: React.Dispatch<React.SetStateAction<string[]>>;
  setAlbumFilter: React.Dispatch<React.SetStateAction<string[]>>;
  setArtistFilter: React.Dispatch<React.SetStateAction<string[]>>;
}

export function GalleryGrid({
  filteredData,
  visibleCount,
  setSentinelEl,
  lastBatchStartRef,
  favorites,
  toggleFav,
  handleMVClick,
  isGlobalPaused,
  showFavOnly,
  basePath,
  navigate,
  setSearch,
  setYearFilter,
  setAlbumFilter,
  setArtistFilter,
}: GalleryGridProps) {
  const { t, i18n } = useTranslation();

  return (
    <>
      {filteredData.length > 0 ? (
        <div className="grid grid-cols-1 max-[520px]:grid-cols-1 max-[900px]:grid-cols-2 max-[1120px]:grid-cols-3 grid-cols-4 gap-4 md:gap-6 items-start">
          {filteredData.slice(0, visibleCount).map((mv, idx) => {
            const batchIdx = Math.max(0, idx - lastBatchStartRef.current);
            return (
              <AnimatedMVCardItem
                key={mv.id}
                mv={mv}
                isFav={favorites.includes(mv.id)}
                onToggleFav={toggleFav}
                onClick={handleMVClick}
                delayMs={Math.min(batchIdx, 24) * 25}
                isPaused={isGlobalPaused}
              />
            );
          })}
        </div>
      ) : (
        <div className="w-full py-24 flex flex-col items-center justify-center border-4 border-dashed border-border mt-8">
            <div className="text-5xl mb-6 opacity-20">
              <i className="hn hn-cassette-tape text-5xl"></i>
            </div>
            <div className="flex flex-col items-center leading-tight mb-2">
              <h3 className="text-xl font-black">{t("app.no_signal", "找不到訊號")}</h3>
              {shouldShowSecondaryLang(i18n.language) && (
              <span className="text-[10px] font-mono opacity-40">
                NO_SIGNAL_FOUND
              </span>
              )}
            </div>
            <p className="text-sm opacity-60 mb-8 font-mono">{t("app.no_mv_found", "找不到符合檢索條件的 MV")}</p>
            <Button
              onClick={() => {
                setSearch("");
                setYearFilter([]);
                setAlbumFilter([]);
                setArtistFilter([]);
                if (showFavOnly) navigate(basePath);
              }}
              variant="neutral"
              data-umami-event="Z_Reset_Filters"
            >
              <i className="hn hn-refresh text-sm mr-2"></i> {t("app.reset_filters", "重置所有檢索條件")}
            </Button>
          </div>
      )}

      {filteredData.length > 0 && visibleCount < filteredData.length && (
        <div
          ref={setSentinelEl}
          className="w-full h-20 flex items-center justify-center mt-8"
        >
          <div className="animate-pulse flex items-center gap-2 text-main text-xs font-black tracking-widest uppercase">
            <i className="hn hn-spinner text-sm animate-spin"></i>
            <span className="flex flex-col leading-tight">
              <span className="opacity-70">{t("common.loading", "載入中...")}</span>
              {shouldShowSecondaryLang(i18n.language) && (
              <span className="text-[10px] font-mono opacity-40 normal-case">
                Loading Signal...
              </span>
              )}
            </span>
          </div>
        </div>
      )}

      {filteredData.length > 0 && visibleCount >= filteredData.length && (
        <div className="w-full py-18 mt-10 flex flex-col items-center justify-center opacity-30 select-none">
          <div className="flex items-center gap-4 text-xs font-mono font-black">
            <span className="w-12 h-0.5 bg-current"></span>
            <span className="flex flex-col items-center leading-tight">
              <span className="opacity-70">{t("app.archive_boundary", "歸檔邊界")}</span>
              {shouldShowSecondaryLang(i18n.language) && (
              <span className="text-[10px] font-mono opacity-40">
                END_OF_ARCHIVE
              </span>
              )}
            </span>
            <span className="w-12 h-0.5 bg-current"></span>
          </div>
        </div>
      )}

      {showFavOnly && (
        <div className="mt-8 mb-12 max-[768px]:w-[90vw] max-[768px]:relative max-[768px]:left-1/2 max-[768px]:-translate-x-1/2 max-[768px]:px-0">
          <div className="p-4 bg-yellow-400/10 border-2 border-yellow-500/50 flex items-start justify-center gap-3 md:gap-4 rounded-none mx-auto max-w-fit">
            <i className="hn hn-exclamation-triangle text-yellow-500 text-xl md:text-2xl shrink-0 mt-1 md:mt-0"></i>
            <div className="flex flex-col gap-1 md:gap-1.5 text-left">
              <span className="text-xs md:text-sm font-black text-yellow-600 dark:text-yellow-400 flex flex-col md:flex-row md:items-center gap-1 md:gap-2 leading-tight">
                <span>{t("app.fav_notice_1", "請注意：收藏功能基於瀏覽器本地存儲實現")}</span>
                {shouldShowSecondaryLang(i18n.language) && (
                <span className="text-[10px] font-mono opacity-70 normal-case md:border-l-2 md:border-yellow-500/30 md:pl-2">LOCAL_STORAGE_WARNING</span>
                )}
              </span>
              <span className="text-[10px] md:text-xs opacity-80 text-yellow-600 dark:text-yellow-400/80 leading-relaxed">
                {t("app.fav_notice_2", "若清除瀏覽器數據或更換設備，您的收藏項目將會丟失。")}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
