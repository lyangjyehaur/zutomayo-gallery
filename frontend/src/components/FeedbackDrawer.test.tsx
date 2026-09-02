import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { FeedbackDrawer } from "./FeedbackDrawer"

vi.mock("@/components/WalineComments", () => ({
  WalineComments: () => <div data-testid="waline-comments" />,
}))

const getDrawer = (container: HTMLElement) => {
  const drawer = container.querySelector(".fixed.left-0.top-0.bottom-0")
  expect(drawer).not.toBeNull()
  return drawer as HTMLElement
}

describe("FeedbackDrawer animation", () => {
  it("uses valid mobile and desktop animations when opening", () => {
    const { container } = render(
      <FeedbackDrawer
        isFeedbackOpen
        setIsFeedbackOpen={vi.fn()}
        shouldRenderFeedback={false}
      />,
    )

    const drawer = getDrawer(container)
    expect(drawer).toHaveClass(
      "animate-[drawer-mobile-fade-in_700ms_cubic-bezier(0.32,0.72,0,1)_forwards]",
      "lg:animate-[drawer-desktop-fade-in_700ms_cubic-bezier(0.32,0.72,0,1)_forwards]",
    )
  })

  it("uses valid mobile and desktop animations when closing", () => {
    const { container } = render(
      <FeedbackDrawer
        isFeedbackOpen={false}
        setIsFeedbackOpen={vi.fn()}
        shouldRenderFeedback={false}
      />,
    )

    const drawer = getDrawer(container)
    expect(drawer).toHaveClass(
      "animate-[drawer-mobile-fade-out_700ms_cubic-bezier(0.32,0.72,0,1)_forwards]",
      "lg:animate-[drawer-desktop-fade-out_700ms_cubic-bezier(0.32,0.72,0,1)_forwards]",
    )
  })
})
