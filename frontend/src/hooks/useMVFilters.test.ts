import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useMVFilters } from "./useMVFilters"
import { MVItem } from "@/lib/types"

const mockMVData: MVItem[] = [
  {
    id: "1", title: "MV Alpha", year: "2024", date: "2024-01-15",
    youtube: "", bilibili: "", description: "Desc Alpha", heroVideo: "",
    creators: [{ name: "Artist A" }], albums: [{ name: "Album X" }],
    keywords: [], images: [],
  },
  {
    id: "2", title: "MV Beta", year: "2023", date: "2023-06-20",
    youtube: "", bilibili: "", description: "Desc Beta", heroVideo: "",
    creators: [{ name: "Artist B" }], albums: [{ name: "Album Y" }],
    keywords: [], images: [],
  },
  {
    id: "3", title: "MV Gamma", year: "2024", date: "2024-03-10",
    youtube: "", bilibili: "", description: "Desc Gamma", heroVideo: "",
    creators: [{ name: "Artist A" }], albums: [{ name: "Album X" }],
    keywords: [], images: [],
  },
  {
    id: "4", title: "MV Delta", year: "2022", date: "2022-12-01",
    youtube: "", bilibili: "", description: "Desc Delta", heroVideo: "",
    creators: [{ name: "Artist C" }], albums: [{ name: "Album Z" }],
    keywords: [], images: [],
  },
]

const mockMetadata = {
  albumMeta: {
    "Album X": { date: "2024-01-01" },
    "Album Y": { date: "2023-06-01" },
    "Album Z": { date: "2022-12-01" },
  },
  artistMeta: {},
  settings: { showAutoAlbumDate: true },
}

const ssStorage: Record<string, string> = {}

const defaultParams = {
  mvData: mockMVData,
  metadata: mockMetadata,
  showFavOnly: false,
  favoritesRef: { current: [] as string[] },
  favVersion: 0,
}

describe("useMVFilters", () => {
  beforeEach(() => {
    Object.keys(ssStorage).forEach((k) => delete ssStorage[k])
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => ssStorage[key] ?? null,
      setItem: (key: string, value: string) => { ssStorage[key] = value },
      removeItem: (key: string) => { delete ssStorage[key] },
      clear: () => Object.keys(ssStorage).forEach((k) => delete ssStorage[k]),
    })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("initial state: all filters empty, sortOrder desc", () => {
    const { result } = renderHook(() => useMVFilters(defaultParams))
    expect(result.current.search).toBe("")
    expect(result.current.debouncedSearch).toBe("")
    expect(result.current.yearFilter).toEqual([])
    expect(result.current.albumFilter).toEqual([])
    expect(result.current.artistFilter).toEqual([])
    expect(result.current.sortOrder).toBe("desc")
  })

  it("setSearch updates search state", () => {
    const { result } = renderHook(() => useMVFilters(defaultParams))
    act(() => { result.current.setSearch("Alpha") })
    expect(result.current.search).toBe("Alpha")
  })

  it("debounced search updates after 300ms", () => {
    const { result } = renderHook(() => useMVFilters(defaultParams))
    act(() => { result.current.setSearch("Alpha") })
    expect(result.current.debouncedSearch).toBe("")
    act(() => { vi.advanceTimersByTime(300) })
    expect(result.current.debouncedSearch).toBe("Alpha")
  })

  it("yearFilter / albumFilter / artistFilter setters work", () => {
    const { result } = renderHook(() => useMVFilters(defaultParams))
    act(() => { result.current.setYearFilter(["2024"]) })
    act(() => { result.current.setAlbumFilter(["Album X"]) })
    act(() => { result.current.setArtistFilter(["Artist A"]) })
    expect(result.current.yearFilter).toEqual(["2024"])
    expect(result.current.albumFilter).toEqual(["Album X"])
    expect(result.current.artistFilter).toEqual(["Artist A"])
  })

  it("filteredData filters by search text (match title/keywords/description)", () => {
    const { result } = renderHook(() => useMVFilters(defaultParams))
    act(() => { result.current.setSearch("alpha") })
    act(() => { vi.advanceTimersByTime(300) })
    expect(result.current.filteredData.length).toBe(1)
    expect(result.current.filteredData[0].id).toBe("1")
  })

  it("filteredData filters by yearFilter", () => {
    const { result } = renderHook(() => useMVFilters(defaultParams))
    act(() => { result.current.setYearFilter(["2024"]) })
    expect(result.current.filteredData.length).toBe(2)
    expect(result.current.filteredData.every((mv) => mv.year === "2024")).toBe(true)
  })

  it("filteredData filters by albumFilter", () => {
    const { result } = renderHook(() => useMVFilters(defaultParams))
    act(() => { result.current.setAlbumFilter(["Album X"]) })
    expect(result.current.filteredData.length).toBe(2)
    expect(result.current.filteredData.every((mv) => mv.albums?.some((a) => a.name === "Album X"))).toBe(true)
  })

  it("filteredData filters by artistFilter", () => {
    const { result } = renderHook(() => useMVFilters(defaultParams))
    act(() => { result.current.setArtistFilter(["Artist A"]) })
    expect(result.current.filteredData.length).toBe(2)
    expect(result.current.filteredData.every((mv) => mv.creators?.some((a) => a.name === "Artist A"))).toBe(true)
  })

  it("filteredData filters by showFavOnly", () => {
    const favoritesRef = { current: ["1", "3"] as string[] }
    const { result } = renderHook(() => useMVFilters({ ...defaultParams, showFavOnly: true, favoritesRef }))
    expect(result.current.filteredData.length).toBe(2)
    expect(result.current.filteredData.every((mv) => ["1", "3"].includes(mv.id))).toBe(true)
  })

  it("sortOrder asc sorts oldest first, desc sorts newest first", () => {
    const { result } = renderHook(() => useMVFilters(defaultParams))
    expect(result.current.sortOrder).toBe("desc")
    const descOrder = result.current.filteredData.map((mv) => mv.id)
    act(() => { result.current.setSortOrder("asc") })
    const ascOrder = result.current.filteredData.map((mv) => mv.id)
    expect(ascOrder).toEqual([...descOrder].reverse())
    expect(ascOrder[0]).toBe("4")
  })

  it("uniqueYears returns sorted unique years from mvData", () => {
    const { result } = renderHook(() => useMVFilters(defaultParams))
    expect(result.current.uniqueYears).toEqual(["2024", "2023", "2022"])
  })

  it("uniqueAlbums returns sorted unique album names", () => {
    const { result } = renderHook(() => useMVFilters(defaultParams))
    expect(result.current.uniqueAlbums).toEqual(["Album X", "Album Y", "Album Z"])
  })

  it("groupedAlbums groups albums by category", () => {
    const { result } = renderHook(() => useMVFilters(defaultParams))
    expect(result.current.groupedAlbums.full).toEqual([])
    expect(result.current.groupedAlbums.mini).toEqual([])
    expect(result.current.groupedAlbums.single).toEqual(["Album X", "Album Y", "Album Z"])
  })

  it("uniqueArtists returns sorted unique artist names", () => {
    const { result } = renderHook(() => useMVFilters(defaultParams))
    expect(result.current.uniqueArtists).toEqual(["Artist A", "Artist B", "Artist C"])
  })

  it("albumDateMap maps album names to dates", () => {
    const { result } = renderHook(() => useMVFilters(defaultParams))
    expect(result.current.albumDateMap).toEqual({
      "Album X": "2024-01-01",
      "Album Y": "2023-06-01",
      "Album Z": "2022-12-01",
    })
  })

  it("sessionStorage persistence: filter values are saved on change", () => {
    const { result } = renderHook(() => useMVFilters(defaultParams))
    act(() => { result.current.setSearch("test") })
    act(() => { result.current.setYearFilter(["2024"]) })
    act(() => { result.current.setAlbumFilter(["Album X"]) })
    act(() => { result.current.setArtistFilter(["Artist A"]) })
    expect(ssStorage["mv_filter_search"]).toBe("test")
    expect(JSON.parse(ssStorage["mv_filter_year"])).toEqual(["2024"])
    expect(JSON.parse(ssStorage["mv_filter_album"])).toEqual(["Album X"])
    expect(JSON.parse(ssStorage["mv_filter_artist"])).toEqual(["Artist A"])
  })
})
