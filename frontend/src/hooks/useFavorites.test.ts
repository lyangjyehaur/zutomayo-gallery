import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useFavorites } from "./useFavorites"
import { MVItem } from "@/lib/types"
import { storage, STORAGE_KEYS } from "@/config/storage"
import { toast } from "sonner"

vi.mock("@/config/storage", () => ({
  STORAGE_KEYS: { FAVORITES: "ztmy_favorites" },
  storage: { get: vi.fn(), set: vi.fn() },
}))

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn() }),
}))

const mockMVData: MVItem[] = [
  {
    id: "1", title: "MV Alpha", year: "", date: "",
    youtube: "", bilibili: "", description: "",
    creators: [], albums: [], keywords: [], images: [],
  },
  {
    id: "2", title: "MV Beta", year: "", date: "",
    youtube: "", bilibili: "", description: "",
    creators: [], albums: [], keywords: [], images: [],
  },
]

const bcInstances: any[] = []
const mockPostMessage = vi.fn()
const mockClose = vi.fn()

describe("useFavorites", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(storage.get as any).mockReturnValue([])
    ;(storage.set as any).mockReturnValue(true)
    bcInstances.length = 0
    vi.stubGlobal("BroadcastChannel", vi.fn(() => {
      const instance = { postMessage: mockPostMessage, close: mockClose, onmessage: null as any }
      bcInstances.push(instance)
      return instance
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("initial favorites loaded from storage", () => {
    ;(storage.get as any).mockReturnValue(["1"])
    const { result } = renderHook(() => useFavorites({ mvData: mockMVData, showFavOnly: false }))
    expect(result.current.favorites).toEqual(["1"])
  })

  it("toggleFav adds an item to favorites", () => {
    const { result } = renderHook(() => useFavorites({ mvData: mockMVData, showFavOnly: false }))
    act(() => { result.current.toggleFav("1") })
    expect(result.current.favorites).toEqual(["1"])
  })

  it("toggleFav removes an item from favorites", () => {
    ;(storage.get as any).mockReturnValue(["1"])
    const { result } = renderHook(() => useFavorites({ mvData: mockMVData, showFavOnly: false }))
    act(() => { result.current.toggleFav("1") })
    expect(result.current.favorites).toEqual([])
  })

  it("toggleFav persists to storage", () => {
    const { result } = renderHook(() => useFavorites({ mvData: mockMVData, showFavOnly: false }))
    act(() => { result.current.toggleFav("1") })
    expect(storage.set).toHaveBeenCalledWith(STORAGE_KEYS.FAVORITES, ["1"])
  })

  it("toggleFav shows toast", () => {
    const { result } = renderHook(() => useFavorites({ mvData: mockMVData, showFavOnly: false }))
    act(() => { result.current.toggleFav("1") })
    expect(toast).toHaveBeenCalledWith("已加入收藏", { description: "MV Alpha" })
  })

  it("toggleFav undo action restores the previous state", () => {
    ;(storage.get as any).mockReturnValue(["1"])
    const { result } = renderHook(() => useFavorites({ mvData: mockMVData, showFavOnly: false }))
    act(() => { result.current.toggleFav("1") })
    expect(result.current.favorites).toEqual([])
    const undoCall = (toast as any).mock.calls.find((c: any[]) => c[0] === "已取消收藏")
    expect(undoCall).toBeDefined()
    const undoAction = undoCall![1].action
    act(() => { undoAction.onClick() })
    expect(result.current.favorites).toEqual(["1"])
  })

  it("BroadcastChannel posts message on toggle", () => {
    const { result } = renderHook(() => useFavorites({ mvData: mockMVData, showFavOnly: false }))
    act(() => { result.current.toggleFav("1") })
    expect(mockPostMessage).toHaveBeenCalledWith(["1"])
  })

  it("BroadcastChannel listener syncs favorites from other tabs", () => {
    const { result } = renderHook(() => useFavorites({ mvData: mockMVData, showFavOnly: false }))
    const listenerChannel = bcInstances[0]
    act(() => { listenerChannel.onmessage({ data: ["1", "2"] }) })
    expect(result.current.favorites).toEqual(["1", "2"])
  })

  it("favVersion increments when toggling in showFavOnly mode", () => {
    const { result } = renderHook(() => useFavorites({ mvData: mockMVData, showFavOnly: true }))
    expect(result.current.favVersion).toBe(0)
    act(() => { result.current.toggleFav("1") })
    expect(result.current.favVersion).toBe(1)
  })
})
