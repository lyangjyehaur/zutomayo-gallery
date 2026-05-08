import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useLoadingTransition } from "./useLoadingTransition"

const storage: Record<string, string> = {}

describe("useLoadingTransition", () => {
  beforeEach(() => {
    Object.keys(storage).forEach((k) => delete storage[k])
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => { storage[key] = value },
      removeItem: (key: string) => { delete storage[key] },
      clear: () => Object.keys(storage).forEach((k) => delete storage[k]),
    })
    vi.stubGlobal("umami", { track: vi.fn() })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("showLoadingScreen is true initially", () => {
    const { result } = renderHook(() =>
      useLoadingTransition({ isLoading: true, error: null, mvDataLength: 0 })
    )
    expect(result.current.showLoadingScreen).toBe(true)
  })

  it("transitions to content when isLoading becomes false without network warning", () => {
    const { result, rerender } = renderHook(
      (props: { isLoading: boolean; error: string | null; mvDataLength: number }) =>
        useLoadingTransition(props),
      { initialProps: { isLoading: true, error: null, mvDataLength: 10 } }
    )
    expect(result.current.showLoadingScreen).toBe(true)

    vi.useFakeTimers()

    rerender({ isLoading: false, error: null, mvDataLength: 10 })

    expect(result.current.isTransitioningOut).toBe(true)

    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current.showLoadingScreen).toBe(false)
    expect(result.current.isContentReady).toBe(true)

    act(() => { vi.advanceTimersByTime(50) })
    expect(result.current.isTransitioningOut).toBe(false)
    expect(result.current.isContentFadingIn).toBe(true)

    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.isAnimationComplete).toBe(true)
  })

  it("shows warning screen when networkType is cellular", () => {
    const { result, rerender } = renderHook(
      (props: { isLoading: boolean; error: string | null; mvDataLength: number; networkType?: string }) =>
        useLoadingTransition(props),
      { initialProps: { isLoading: true, error: null, mvDataLength: 10, networkType: "cellular" } }
    )

    vi.useFakeTimers()

    rerender({ isLoading: false, error: null, mvDataLength: 10, networkType: "cellular" })

    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current.showLoadingScreen).toBe(false)
    expect(result.current.showWarningScreen).toBe(true)
  })

  it("shows warning screen when networkSaveData is true", () => {
    const { result, rerender } = renderHook(
      (props: { isLoading: boolean; error: string | null; mvDataLength: number; networkSaveData?: boolean }) =>
        useLoadingTransition(props),
      { initialProps: { isLoading: true, error: null, mvDataLength: 10, networkSaveData: true } }
    )

    vi.useFakeTimers()

    rerender({ isLoading: false, error: null, mvDataLength: 10, networkSaveData: true })

    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current.showWarningScreen).toBe(true)
  })

  it("handleWarningConfirm transitions from warning to content", () => {
    const { result, rerender } = renderHook(
      (props: { isLoading: boolean; error: string | null; mvDataLength: number; networkType?: string }) =>
        useLoadingTransition(props),
      { initialProps: { isLoading: true, error: null, mvDataLength: 10, networkType: "cellular" } }
    )

    vi.useFakeTimers()

    rerender({ isLoading: false, error: null, mvDataLength: 10, networkType: "cellular" })

    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current.showWarningScreen).toBe(true)

    act(() => {
      result.current.handleWarningConfirm()
    })

    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current.showWarningScreen).toBe(false)
    expect(result.current.isContentReady).toBe(true)

    act(() => { vi.advanceTimersByTime(50) })
    expect(result.current.isContentFadingIn).toBe(true)

    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.isAnimationComplete).toBe(true)
  })

  it("skips transition when error exists and mvDataLength is 0", () => {
    const { result, rerender } = renderHook(
      (props: { isLoading: boolean; error: string | null; mvDataLength: number }) =>
        useLoadingTransition(props),
      { initialProps: { isLoading: true, error: null, mvDataLength: 0 } }
    )
    expect(result.current.showLoadingScreen).toBe(true)

    rerender({ isLoading: false, error: "fail", mvDataLength: 0 })

    expect(result.current.showLoadingScreen).toBe(false)
    expect(result.current.showWarningScreen).toBe(false)
    expect(result.current.isTransitioningOut).toBe(false)
  })

  it("sets isTransitioningOut during fade-out phase", () => {
    const { result, rerender } = renderHook(
      (props: { isLoading: boolean; error: string | null; mvDataLength: number }) =>
        useLoadingTransition(props),
      { initialProps: { isLoading: true, error: null, mvDataLength: 10 } }
    )

    vi.useFakeTimers()

    rerender({ isLoading: false, error: null, mvDataLength: 10 })

    expect(result.current.isTransitioningOut).toBe(true)

    act(() => { vi.advanceTimersByTime(500) })
    act(() => { vi.advanceTimersByTime(50) })

    expect(result.current.isTransitioningOut).toBe(false)
  })

  it("sets isContentFadingIn during content fade-in phase", () => {
    const { result, rerender } = renderHook(
      (props: { isLoading: boolean; error: string | null; mvDataLength: number }) =>
        useLoadingTransition(props),
      { initialProps: { isLoading: true, error: null, mvDataLength: 10 } }
    )

    vi.useFakeTimers()

    rerender({ isLoading: false, error: null, mvDataLength: 10 })

    act(() => { vi.advanceTimersByTime(500) })
    act(() => { vi.advanceTimersByTime(50) })

    expect(result.current.isContentFadingIn).toBe(true)
  })

  it("sets isAnimationComplete after animation completes", () => {
    const { result, rerender } = renderHook(
      (props: { isLoading: boolean; error: string | null; mvDataLength: number }) =>
        useLoadingTransition(props),
      { initialProps: { isLoading: true, error: null, mvDataLength: 10 } }
    )

    vi.useFakeTimers()

    rerender({ isLoading: false, error: null, mvDataLength: 10 })

    act(() => { vi.advanceTimersByTime(500) })
    act(() => { vi.advanceTimersByTime(50) })
    expect(result.current.isAnimationComplete).toBe(false)

    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.isAnimationComplete).toBe(true)
  })
})
