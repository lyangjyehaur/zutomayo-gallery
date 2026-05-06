import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useScrollPosition } from "./useScrollPosition"

describe("useScrollPosition", () => {
  let scrollY: number

  beforeEach(() => {
    scrollY = 0
    Object.defineProperty(window, "scrollY", {
      get: () => scrollY,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("初始回傳 false", () => {
    const { result } = renderHook(() => useScrollPosition())
    expect(result.current).toBe(false)
  })

  it("滾動超過 threshold 時回傳 true", () => {
    const { result } = renderHook(() => useScrollPosition({ threshold: 300 }))

    scrollY = 500
    act(() => { window.dispatchEvent(new Event("scroll")) })

    expect(result.current).toBe(true)
  })

  it("滾動未超過 threshold 時回傳 false", () => {
    const { result } = renderHook(() => useScrollPosition({ threshold: 300 }))

    scrollY = 200
    act(() => { window.dispatchEvent(new Event("scroll")) })

    expect(result.current).toBe(false)
  })

  it("滾回上方時回傳 false", () => {
    const { result } = renderHook(() => useScrollPosition({ threshold: 300 }))

    scrollY = 500
    act(() => { window.dispatchEvent(new Event("scroll")) })
    expect(result.current).toBe(true)

    scrollY = 100
    act(() => { window.dispatchEvent(new Event("scroll")) })
    expect(result.current).toBe(false)
  })

  it("相同值不重複觸發 re-render", () => {
    const { result, rerender } = renderHook(() => useScrollPosition({ threshold: 300 }))

    scrollY = 500
    act(() => { window.dispatchEvent(new Event("scroll")) })
    expect(result.current).toBe(true)

    const renderCountBefore = result.current

    act(() => { window.dispatchEvent(new Event("scroll")) })
    act(() => { window.dispatchEvent(new Event("scroll")) })
    act(() => { window.dispatchEvent(new Event("scroll")) })

    expect(result.current).toBe(renderCountBefore)
  })

  it("自訂 threshold 生效", () => {
    const { result } = renderHook(() => useScrollPosition({ threshold: 100 }))

    scrollY = 150
    act(() => { window.dispatchEvent(new Event("scroll")) })

    expect(result.current).toBe(true)
  })

  it("卸載時移除 scroll 監聽器", () => {
    const addSpy = vi.spyOn(window, "addEventListener")
    const removeSpy = vi.spyOn(window, "removeEventListener")

    const { unmount } = renderHook(() => useScrollPosition())

    const scrollAddCall = addSpy.mock.calls.find((c) => c[0] === "scroll")!
    const handler = scrollAddCall[1]

    unmount()

    const scrollRemoveCall = removeSpy.mock.calls.find((c) => c[0] === "scroll")!
    expect(scrollRemoveCall[1]).toBe(handler)
  })
})
