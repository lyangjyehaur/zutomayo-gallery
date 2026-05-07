import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useAnimationPause } from "./useAnimationPause"
import type { RefObject } from "react"

let observerCallback: IntersectionObserverCallback

function createHeaderRef(): RefObject<HTMLElement | null> {
  const headerEl = document.createElement("header")
  const titleEl = document.createElement("div")
  titleEl.className = "ztmy-cyber-title-crt"
  const pulseEl = document.createElement("div")
  pulseEl.className = "animate-pulse"
  headerEl.appendChild(titleEl)
  headerEl.appendChild(pulseEl)
  return { current: headerEl }
}

const defaultParams = {
  selectedMvId: null as string | null,
  selectedIllustratorId: null as string | null,
  isFeedbackOpen: false,
  isAboutOpen: false,
  isMobile: false,
  headerRef: { current: null } as RefObject<HTMLElement | null>,
}

describe("useAnimationPause", () => {
  beforeEach(() => {
    observerCallback = null as any
    vi.stubGlobal("IntersectionObserver", vi.fn((cb: IntersectionObserverCallback) => {
      observerCallback = cb
      return { observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() }
    }))
    Object.defineProperty(document, "hidden", { value: false, configurable: true, writable: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("無 modal 開啟且 tab 活躍時 isGlobalPaused 為 false", () => {
    const { result } = renderHook(() =>
      useAnimationPause({ ...defaultParams, headerRef: createHeaderRef() }),
    )
    expect(result.current).toBe(false)
  })

  it("selectedMvId 設定時 isGlobalPaused 為 true", () => {
    const { result } = renderHook(() =>
      useAnimationPause({ ...defaultParams, selectedMvId: "mv-1", headerRef: createHeaderRef() }),
    )
    expect(result.current).toBe(true)
  })

  it("selectedIllustratorId 設定時 isGlobalPaused 為 true", () => {
    const { result } = renderHook(() =>
      useAnimationPause({ ...defaultParams, selectedIllustratorId: "illust-1", headerRef: createHeaderRef() }),
    )
    expect(result.current).toBe(true)
  })

  it("isFeedbackOpen 且 isMobile 時 isGlobalPaused 為 true", () => {
    const { result } = renderHook(() =>
      useAnimationPause({ ...defaultParams, isFeedbackOpen: true, isMobile: true, headerRef: createHeaderRef() }),
    )
    expect(result.current).toBe(true)
  })

  it("isAboutOpen 且 isMobile 時 isGlobalPaused 為 true", () => {
    const { result } = renderHook(() =>
      useAnimationPause({ ...defaultParams, isAboutOpen: true, isMobile: true, headerRef: createHeaderRef() }),
    )
    expect(result.current).toBe(true)
  })

  it("tab 隱藏時 isGlobalPaused 為 true", () => {
    const { result } = renderHook(() =>
      useAnimationPause({ ...defaultParams, headerRef: createHeaderRef() }),
    )
    Object.defineProperty(document, "hidden", { value: true, writable: true })
    act(() => { document.dispatchEvent(new Event("visibilitychange")) })
    expect(result.current).toBe(true)
  })

  it("headerRef 被 IntersectionObserver 觀察", () => {
    const headerRef = createHeaderRef()
    renderHook(() => useAnimationPause({ ...defaultParams, headerRef }))
    const observeMock = (IntersectionObserver as ReturnType<typeof vi.fn>).mock.results[0].value.observe
    expect(observeMock).toHaveBeenCalledWith(headerRef.current)
  })

  it("header 不在視窗內時動畫暫停", () => {
    const headerRef = createHeaderRef()
    renderHook(() => useAnimationPause({ ...defaultParams, headerRef }))
    act(() => {
      observerCallback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })
    const titleEl = headerRef.current!.querySelector(".ztmy-cyber-title-crt") as HTMLElement
    const pulseEl = headerRef.current!.querySelector(".animate-pulse") as HTMLElement
    expect(titleEl.style.animationPlayState).toBe("paused")
    expect(pulseEl.style.animationPlayState).toBe("paused")
  })

  it("isGlobalPaused 為 true 時無論是否相交動畫皆暫停", () => {
    const headerRef = createHeaderRef()
    renderHook(() =>
      useAnimationPause({ ...defaultParams, selectedMvId: "mv-1", headerRef }),
    )
    act(() => {
      observerCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })
    const titleEl = headerRef.current!.querySelector(".ztmy-cyber-title-crt") as HTMLElement
    const pulseEl = headerRef.current!.querySelector(".animate-pulse") as HTMLElement
    expect(titleEl.style.animationPlayState).toBe("paused")
    expect(pulseEl.style.animationPlayState).toBe("paused")
  })
})
