import React from 'react';
import { useTranslation } from 'react-i18next';
import { shouldShowSecondaryLang } from '@/i18n';
import { ALBUM_CATEGORIES } from '@/config/albums';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

interface FilterBarProps {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  yearFilter: string[];
  setYearFilter: React.Dispatch<React.SetStateAction<string[]>>;
  albumFilter: string[];
  setAlbumFilter: React.Dispatch<React.SetStateAction<string[]>>;
  artistFilter: string[];
  setArtistFilter: React.Dispatch<React.SetStateAction<string[]>>;
  openYear: boolean;
  setOpenYear: React.Dispatch<React.SetStateAction<boolean>>;
  openAlbum: boolean;
  setOpenAlbum: React.Dispatch<React.SetStateAction<boolean>>;
  openArtist: boolean;
  setOpenArtist: React.Dispatch<React.SetStateAction<boolean>>;
  uniqueYears: string[];
  uniqueAlbums: string[];
  groupedAlbums: Record<string, string[]>;
  uniqueArtists: string[];
  albumDateMap: Record<string, string>;
  filterBarRef: React.RefObject<HTMLDivElement>;
  filterAnchorRef: React.RefObject<HTMLDivElement>;
  metadata: {
    artistMeta: Record<string, { id?: string; hideId?: boolean; twitter?: string }>;
  };
}

export function FilterBar({
  search,
  setSearch,
  yearFilter,
  setYearFilter,
  albumFilter,
  setAlbumFilter,
  artistFilter,
  setArtistFilter,
  openYear,
  setOpenYear,
  openAlbum,
  setOpenAlbum,
  openArtist,
  setOpenArtist,
  uniqueYears,
  uniqueAlbums,
  groupedAlbums,
  uniqueArtists,
  albumDateMap,
  filterBarRef,
  filterAnchorRef,
  metadata,
}: FilterBarProps) {
  const { t, i18n } = useTranslation();

  return (
    <>
      <div ref={filterAnchorRef} className="w-full h-0 pointer-events-none" />

      <div
        className="flex flex-col gap-0 mt-0 mb-0 sticky z-40 py-4 transition-all duration-200 w-full bg-transparent border-b-2 border-transparent"
        style={{ top: '0px' }}
        ref={filterBarRef}
      >
        <div className="flex flex-col md:flex-row gap-4 w-full mx-auto max-w-[var(--container-width,1280px)]">
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
                      <span lang="ja" className="truncate w-full block">
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
                                    {group.heading.id === 'full' ? t('app.album_category_full', '完整專輯') :
                                     group.heading.id === 'mini' ? t('app.album_category_mini', '迷你專輯') :
                                     t('app.album_category_single', '單曲 / 其他')}
                                  </span>
                                  {shouldShowSecondaryLang(i18n.language) && (
                                  <span className="text-[10px] font-mono opacity-50 normal-case">
                                    {group.heading.en}
                                  </span>
                                  )}
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
                                <span lang="ja" className="whitespace-normal break-words">
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
                      <span lang="ja" className="truncate w-full block">
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
                        const twitter = metadata?.artistMeta?.[artist]?.hideId
                          ? undefined
                          : metadata?.artistMeta?.[artist]?.twitter || metadata?.artistMeta?.[artist]?.id;

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
                            <span lang="ja" className="whitespace-normal break-words">
                              {artist}
                            </span>
                            {twitter && (
                              <span className="ml-auto text-xs opacity-50 shrink-0">
                                {twitter}
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
      </div>

      <div
        className={`grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] w-full max-w-[var(--container-width,1280px)] mx-auto relative z-30 ${
          (yearFilter.length > 0 || albumFilter.length > 0 || artistFilter.length > 0)
            ? 'grid-rows-[1fr] opacity-100 mb-6 mt-2'
            : 'grid-rows-[0fr] opacity-0 mb-4 mt-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-wrap gap-2 items-center w-full pt-1 pb-1">
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
                <span lang="ja" className="font-bold mr-1 truncate max-w-[100px] sm:max-w-[200px]" title={album}>{album}</span>
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
                <span lang="ja" className="font-bold mr-1 truncate max-w-[80px] sm:max-w-[150px]" title={artist}>{artist}</span>
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
              data-umami-event="Z_Clear_All_Filters"
            >{t("app.clear_all", "清除全部")}</Button>
          </div>
        </div>
      </div>
    </>
  );
}
