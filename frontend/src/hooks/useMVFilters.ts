import { useState, useEffect, useMemo } from 'react';
import { MVItem } from '@/lib/types';
import { ALBUM_CATEGORIES } from '@/config/albums';

interface UseMVFiltersParams {
  mvData: MVItem[];
  metadata: {
    albumMeta: Record<string, { date?: string; hideDate?: boolean }>;
    artistMeta: Record<string, { id?: string; hideId?: boolean }>;
    settings: { showAutoAlbumDate: boolean; announcements?: string[] | Record<string, string[]> };
  };
  showFavOnly: boolean;
  favoritesRef: React.MutableRefObject<string[]>;
  favVersion: number;
}

export function useMVFilters({ mvData, metadata, showFavOnly, favoritesRef, favVersion }: UseMVFiltersParams) {
  const [search, setSearch] = useState(() => {
    try { return sessionStorage.getItem('mv_filter_search') || ''; } catch { return ''; }
  });
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const [yearFilter, setYearFilter] = useState<string[]>(() => {
    try { const saved = sessionStorage.getItem('mv_filter_year'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [albumFilter, setAlbumFilter] = useState<string[]>(() => {
    try { const saved = sessionStorage.getItem('mv_filter_album'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [artistFilter, setArtistFilter] = useState<string[]>(() => {
    try { const saved = sessionStorage.getItem('mv_filter_artist'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });

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
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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
      mv.albums?.forEach((a) => {
        albums.add(a.name);
        if (mv.date && (!computedDateMap[a.name] || mv.date < computedDateMap[a.name])) {
          computedDateMap[a.name] = mv.date.replace(/\//g, "/");
        }
      });
      mv.creators?.forEach((a) => artists.add(a.name));
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

    const groups: Record<string, string[]> = {
      full: ALBUM_CATEGORIES.full.items.filter((album) => albums.has(album)),
      mini: ALBUM_CATEGORIES.mini.items.filter((album) => albums.has(album)),
      single: [],
    };

    albumList.forEach((album) => {
      if (
        !ALBUM_CATEGORIES.full.items.includes(album) &&
        !ALBUM_CATEGORIES.mini.items.includes(album)
      ) {
        groups.single.push(album);
      }
    });

    return {
      uniqueYears: Array.from(years).sort((a, b) => b.localeCompare(a)),
      uniqueAlbums: albumList,
      groupedAlbums: groups,
      uniqueArtists: Array.from(artists)
        .filter((a) => a && a.trim() !== "")
        .sort((a, b) => a.localeCompare(b)),
      albumDateMap: dateMap,
    };
  }, [mvData, metadata]);

  const filteredData = useMemo(() => {
    let data = mvData.filter((mv) => {
      const searchLower = debouncedSearch.toLowerCase();
      const matchesSearch =
        !debouncedSearch ||
        mv.title.toLowerCase().includes(searchLower) ||
        (mv.keywords &&
          mv.keywords.some((k) => k.name.toLowerCase().includes(searchLower))) ||
        (mv.description && mv.description.toLowerCase().includes(searchLower));

      const matchesYear =
        yearFilter.length === 0 ||
        yearFilter.some(
          (y) => mv.year === y || (mv.date && mv.date.startsWith(y)),
        );

      const matchesAlbum =
        albumFilter.length === 0 ||
        (mv.albums && mv.albums.some((a) => albumFilter.includes(a.name)));

      const matchesArtist =
        artistFilter.length === 0 ||
        (mv.creators && mv.creators.some((a) => artistFilter.includes(a.name)));

      const matchesFav = !showFavOnly || favoritesRef.current.includes(mv.id);

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
    debouncedSearch,
    yearFilter,
    albumFilter,
    artistFilter,
    showFavOnly,
    sortOrder,
    favVersion,
  ]);

  return {
    search,
    setSearch,
    debouncedSearch,
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
    filteredData,
    sortOrder,
    setSortOrder,
  };
}
