import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useInfiniteScroll } from "./useInfiniteScroll"
import type { MVItem } from "@/lib/types"

const PAGE_SIZE = 24

const mockFilteredData = Array.from({ length: 100 }, (_, i) => ({ id: String(i) })) as MVItem[]

let observerCallback: IntersectionObserverCallback
let observerDisconnect: ReturnType<typeof vi.fn>

describe("useInfiniteScroll", () => {
  beforeEach(() => {
    observerDisconnect = vi.fn()
    vi.stubGlobal("IntersectionObserver", vi.fn((cb) => {
      observerCallback = cb
      return { observe: vi.fn(), disconnect: observerDisconnect, unobserve: vi.fn() }
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("visibleCount starts at PAGE_SIZE", () => {
    const { result } = renderHook(() =>
      useInfiniteScroll({ filteredData: mockFilteredData, filterDeps: [] })
    )
    expect(result.current.visibleCount).toBe(PAGE_SIZE)
  })

  it("setSentinelEl accepts an element", () => {
    const { result } = renderHook(() =>
      useInfiniteScroll({ filteredData: mockFilteredData, filterDeps: [] })
    )
    const div = document.createElement("div")
    act(() => {
      result.current.setSentinelEl(div)
    })
    expect(IntersectionObserver).toHaveBeenCalled()
  })

  it("increases visibleCount by PAGE_SIZE when sentinel intersects", () => {
    const { result } = renderHook(() =>
      useInfiniteScroll({ filteredData: mockFilteredData, filterDeps: [] })
    )
    const div = document.createElement("div")
    act(() => {
      result.current.setSentinelEl(div)
    })

    act(() => {
      observerCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    })

    expect(result.current.visibleCount).toBe(PAGE_SIZE * 2)
  })

  it("resets visibleCount to PAGE_SIZE when filterDeps change", () => {
    const { result, rerender } = renderHook(
      ({ deps }) => useInfiniteScroll({ filteredData: mockFilteredData, filterDeps: deps }),
      { initialProps: { deps: ["a"] } }
    )

    const div = document.createElement("div")
    act(() => {
      result.current.setSentinelEl(div)
    })

    act(() => {
      observerCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    })
    expect(result.current.visibleCount).toBe(PAGE_SIZE * 2)

    rerender({ deps: ["b"] })
    expect(result.current.visibleCount).toBe(PAGE_SIZE)
  })

  it("updates lastBatchStartRef when loading more", () => {
    const { result } = renderHook(() =>
      useInfiniteScroll({ filteredData: mockFilteredData, filterDeps: [] })
    )
    const div = document.createElement("div")
    act(() => {
      result.current.setSentinelEl(div)
    })

    act(() => {
      observerCallback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    })

    expect(result.current.lastBatchStartRef.current).toBe(PAGE_SIZE)
  })

  it("disconnects IntersectionObserver on cleanup", () => {
    const { result, unmount } = renderHook(() =>
      useInfiniteScroll({ filteredData: mockFilteredData, filterDeps: [] })
    )
    const div = document.createElement("div")
    act(() => {
      result.current.setSentinelEl(div)
    })

    unmount()

    expect(observerDisconnect).toHaveBeenCalled()
  })
})
