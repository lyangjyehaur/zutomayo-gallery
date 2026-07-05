import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PWAPrompt } from "./PWAPrompt"

const { swState } = vi.hoisted(() => ({
  swState: {
    offlineReady: false,
    needRefresh: true,
    setOfflineReady: vi.fn(),
    setNeedRefresh: vi.fn(),
    updateServiceWorker: vi.fn(),
  },
}))

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({
    offlineReady: [swState.offlineReady, swState.setOfflineReady],
    needRefresh: [swState.needRefresh, swState.setNeedRefresh],
    updateServiceWorker: swState.updateServiceWorker,
  }),
}), { virtual: true })

vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null,
  DrawerContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DrawerFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}))

describe("PWAPrompt changelog", () => {
  beforeEach(() => {
    swState.offlineReady = false
    swState.needRefresh = true
    swState.setOfflineReady.mockClear()
    swState.setNeedRefresh.mockClear()
    swState.updateServiceWorker.mockClear()
  })

  it("renders commit titles from version.json", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({
      json: () => Promise.resolve({
        version: "3.7.10",
        buildHash: "2035437",
        commits: ["abc1234 commit message 1", "def5678 commit message 2"],
      }),
    })))

    render(<PWAPrompt />)

    expect(await screen.findByText("更新內容")).toBeInTheDocument()
    expect(screen.getByText("abc1234 commit message 1")).toBeInTheDocument()
    expect(screen.getByText("def5678 commit message 2")).toBeInTheDocument()
  })

  it("renders fallback text when version.json has no commits", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({
      json: () => Promise.resolve({
        version: "3.7.10",
        buildHash: "2035437",
        commits: [],
      }),
    })))

    render(<PWAPrompt />)

    expect(await screen.findByText("更新內容")).toBeInTheDocument()
    expect(screen.getByText("修復與優化")).toBeInTheDocument()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
  })
})
