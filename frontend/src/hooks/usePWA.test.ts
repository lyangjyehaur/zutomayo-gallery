import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { usePWA } from "./usePWA"

const { mockDeferredPrompt, mockPwaEventTarget } = vi.hoisted(() => ({
  mockDeferredPrompt: { value: null as any },
  mockPwaEventTarget: new EventTarget(),
}))

vi.mock("@/App", () => ({
  get globalDeferredPrompt() { return mockDeferredPrompt.value },
  pwaEventTarget: mockPwaEventTarget,
}))

describe("usePWA", () => {
  beforeEach(() => {
    mockDeferredPrompt.value = null
    vi.useFakeTimers()
    vi.stubGlobal("navigator", {
      serviceWorker: {
        getRegistrations: vi.fn(() =>
          Promise.resolve([{ unregister: vi.fn(() => Promise.resolve(true)) }])
        ),
      },
    })
    vi.stubGlobal("caches", {
      keys: vi.fn(() => Promise.resolve(["cache-1"])),
      delete: vi.fn(() => Promise.resolve(true)),
    })
    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: { href: "http://localhost/", replace: vi.fn() },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("deferredPrompt 初始為 null", () => {
    const { result } = renderHook(() => usePWA())
    expect(result.current.deferredPrompt).toBeNull()
  })

  it("isInstallPromptOpen / isRecoverPromptOpen 初始為 false", () => {
    const { result } = renderHook(() => usePWA())
    expect(result.current.isInstallPromptOpen).toBe(false)
    expect(result.current.isRecoverPromptOpen).toBe(false)
  })

  it("setIsInstallPromptOpen / setIsRecoverPromptOpen 可正常切換", () => {
    const { result } = renderHook(() => usePWA())
    act(() => result.current.setIsInstallPromptOpen(true))
    expect(result.current.isInstallPromptOpen).toBe(true)
    act(() => result.current.setIsRecoverPromptOpen(true))
    expect(result.current.isRecoverPromptOpen).toBe(true)
  })

  it("pwa-ready 事件更新 deferredPrompt", () => {
    const { result } = renderHook(() => usePWA())
    mockDeferredPrompt.value = { prompt: vi.fn() }
    act(() => mockPwaEventTarget.dispatchEvent(new Event("pwa-ready")))
    expect(result.current.deferredPrompt).toBe(mockDeferredPrompt.value)
  })

  it("triggerPWARecovery 7 次點擊開啟 recover prompt", () => {
    const { result } = renderHook(() => usePWA())
    for (let i = 0; i < 6; i++) {
      act(() => result.current.triggerPWARecovery())
    }
    expect(result.current.isRecoverPromptOpen).toBe(false)
    act(() => result.current.triggerPWARecovery())
    expect(result.current.isRecoverPromptOpen).toBe(true)
  })

  it("triggerPWARecovery 1500ms 後重置計數", () => {
    const { result } = renderHook(() => usePWA())
    for (let i = 0; i < 6; i++) {
      act(() => result.current.triggerPWARecovery())
    }
    act(() => { vi.advanceTimersByTime(1500) })
    act(() => result.current.triggerPWARecovery())
    expect(result.current.isRecoverPromptOpen).toBe(false)
  })

  it("runPWARecovery 取消註冊 service worker 並清除快取", async () => {
    const { result } = renderHook(() => usePWA())
    await act(async () => {
      await result.current.runPWARecovery()
    })
    expect(navigator.serviceWorker.getRegistrations).toHaveBeenCalled()
    expect(caches.keys).toHaveBeenCalled()
    expect(caches.delete).toHaveBeenCalledWith("cache-1")
  })
})
