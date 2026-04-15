import React from "react"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import ImageCard from "./image-card"

let containerWidth = 180
let measureWidth = 120
let prefersReducedMotion = false

const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth")
const originalScrollWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollWidth")
const originalMatchMedia = window.matchMedia

class ResizeObserverMock {
  callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe() {
    this.callback([], this as unknown as ResizeObserver)
  }

  unobserve() {}

  disconnect() {}
}

function renderImageCard(caption = "A long title for testing marquee behavior") {
  return render(<ImageCard imageUrl="/test-image.jpg" caption={caption} />)
}

describe("ImageCard", () => {
  beforeEach(() => {
    containerWidth = 180
    measureWidth = 120
    prefersReducedMotion = false

    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return this.getAttribute("data-testid") === "image-card-caption-container"
          ? containerWidth
          : 0
      },
    })

    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get() {
        return this.getAttribute("data-testid") === "image-card-caption-measure"
          ? measureWidth
          : 0
      },
    })

    vi.stubGlobal("ResizeObserver", ResizeObserverMock)
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    vi.stubGlobal("cancelAnimationFrame", vi.fn())

    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: {
        ready: Promise.resolve(),
      },
    })

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: prefersReducedMotion && query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  afterEach(() => {
    cleanup()

    if (originalClientWidth) {
      Object.defineProperty(HTMLElement.prototype, "clientWidth", originalClientWidth)
    }

    if (originalScrollWidth) {
      Object.defineProperty(HTMLElement.prototype, "scrollWidth", originalScrollWidth)
    }

    window.matchMedia = originalMatchMedia
    vi.unstubAllGlobals()
  })

  it("renders a truncated title when the caption fits within the container", async () => {
    measureWidth = 120

    renderImageCard("Short title")

    await waitFor(() => {
      expect(screen.getByTestId("image-card-caption-static")).toBeInTheDocument()
    })

    expect(screen.queryByTestId("image-card-caption-track")).not.toBeInTheDocument()
  })

  it("renders a seamless marquee track when the caption overflows", async () => {
    measureWidth = 420

    renderImageCard()

    const track = await screen.findByTestId("image-card-caption-track")

    expect(track.style.getPropertyValue("--marquee-distance")).toBe("444px")
    expect(track.style.getPropertyValue("--marquee-duration")).toBe("9.25s")
    expect(track).toHaveTextContent("A long title for testing marquee behavior")
  })

  it("pauses marquee animation while the title area is hovered", async () => {
    measureWidth = 420

    renderImageCard()

    const container = screen.getByTestId("image-card-caption-container")
    const track = await screen.findByTestId("image-card-caption-track")

    fireEvent.mouseEnter(container)
    expect(track.style.animationPlayState).toBe("paused")

    fireEvent.mouseLeave(container)
    expect(track.style.animationPlayState).toBe("running")
  })

  it("wraps overflowing text instead of animating when reduced motion is preferred", async () => {
    prefersReducedMotion = true
    measureWidth = 420

    renderImageCard()

    await waitFor(() => {
      expect(screen.getByTestId("image-card-caption-wrap")).toBeInTheDocument()
    })

    expect(screen.queryByTestId("image-card-caption-track")).not.toBeInTheDocument()
  })
})
