import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useStickyFilterBar } from "./useStickyFilterBar"

describe("useStickyFilterBar", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal("ResizeObserver", vi.fn(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
      unobserve: vi.fn(),
    })))
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1))
    vi.stubGlobal("cancelAnimationFrame", vi.fn())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("建立 filterBarRef 和 filterAnchorRef", () => {
    const { result } = renderHook(() => useStickyFilterBar({ filterDeps: [] }))
    expect(result.current.filterBarRef).toBeDefined()
    expect(result.current.filterAnchorRef).toBeDefined()
  })

  it("filterDeps 變更時捲動至錨點（首次渲染不觸發）", () => {
    const scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {})
    const { result, rerender } = renderHook(
      ({ deps }) => useStickyFilterBar({ filterDeps: deps }),
      { initialProps: { deps: [0] } },
    )

    const anchorEl = document.createElement("div")
    anchorEl.getBoundingClientRect = vi.fn(() => ({ top: 100 } as DOMRect))
    result.current.filterAnchorRef.current = anchorEl

    act(() => { vi.advanceTimersByTime(100) })
    expect(scrollToSpy).not.toHaveBeenCalled()

    rerender({ deps: [1] })
    act(() => { vi.advanceTimersByTime(50) })
    expect(scrollToSpy).toHaveBeenCalled()
  })

  it("sticky 效果只註冊一次 scroll/resize 監聽器", () => {
    const addSpy = vi.spyOn(window, "addEventListener")
    renderHook(() => useStickyFilterBar({ filterDeps: [] }))
    const scrollCalls = addSpy.mock.calls.filter((c) => c[0] === "scroll")
    const resizeCalls = addSpy.mock.calls.filter((c) => c[0] === "resize")
    expect(scrollCalls.length).toBe(1)
    expect(resizeCalls.length).toBe(1)
  })

  it("卸載時移除監聽器並中斷 ResizeObserver", () => {
    const mockDisconnect = vi.fn()
    vi.stubGlobal("ResizeObserver", vi.fn(() => ({
      observe: vi.fn(),
      disconnect: mockDisconnect,
      unobserve: vi.fn(),
    })))
    const removeSpy = vi.spyOn(window, "removeEventListener")
    const { unmount } = renderHook(() => useStickyFilterBar({ filterDeps: [] }))
    unmount()
    const scrollRemoveCalls = removeSpy.mock.calls.filter((c) => c[0] === "scroll")
    const resizeRemoveCalls = removeSpy.mock.calls.filter((c) => c[0] === "resize")
    expect(scrollRemoveCalls.length).toBe(1)
    expect(resizeRemoveCalls.length).toBe(1)
    expect(mockDisconnect).toHaveBeenCalled()
  })
})
