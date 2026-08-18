import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { MVItem } from "@/lib/types"
import { AnnotationForm, buildAnnotationMediaItems, getI18nStatus } from "./AdminAnnotationsPage"

const mediaItems = [{
  id: "media-1",
  url: "https://example.com/image.jpg",
  mvId: "mv-1",
  mvTitle: "MV",
}]

afterEach(() => cleanup())

function renderEditingForm(labelI18n: Record<string, string>) {
  const onSave = vi.fn()
  render(
    <AnnotationForm
      annotation={{
        id: "annotation-1",
        media_id: "media-1",
        label: "主標籤",
        label_i18n: labelI18n,
        x: 10,
        y: 20,
      }}
      mediaItems={mediaItems}
      mvData={[{ id: "mv-1", title: "MV" }]}
      initialMvId="mv-1"
      onSave={onSave}
      onCancel={vi.fn()}
      isSaving={false}
    />,
  )
  return onSave
}

describe("AdminAnnotationsPage annotation contracts", () => {
  it("submits a translation-only edit using the current translation state", () => {
    const onSave = renderEditingForm({ en: "Old translation" })

    fireEvent.change(screen.getByPlaceholderText("英翻譯"), {
      target: { value: "New translation" },
    })
    fireEvent.click(screen.getByRole("button", { name: "更新" }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      label_i18n: { en: "New translation" },
    }))
  })

  it("submits an explicit empty translation map when the last translation is cleared", () => {
    const onSave = renderEditingForm({ en: "Old translation" })

    fireEvent.change(screen.getByPlaceholderText("英翻譯"), {
      target: { value: "" },
    })
    fireEvent.click(screen.getByRole("button", { name: "更新" }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ label_i18n: {} }))
  })

  it("only exposes still images to the coordinate picker", () => {
    const mv = {
      id: "mv-1",
      title: "MV",
      images: [
        { id: "image", type: "official", media_type: "image", url: "image.jpg" },
        { id: "video", type: "official", media_type: "video", url: "video.mp4" },
        { id: "gif", type: "official", media_type: "gif", url: "gif.mp4" },
      ],
    } as MVItem

    expect(buildAnnotationMediaItems([mv]).map((item) => item.id)).toEqual(["image"])
  })

  it("treats zh-TW as the base label and includes Japanese in translation completion", () => {
    const translations = {
      "zh-CN": "简中",
      "zh-HK": "港繁",
      ja: "日本語",
      ko: "한국어",
      en: "English",
      es: "Español",
    }

    expect(getI18nStatus(translations)).toEqual({ done: 6, total: 6 })
    renderEditingForm(translations)
    expect(screen.getByPlaceholderText("日翻譯")).toBeInTheDocument()
    expect(screen.queryByPlaceholderText("繁中翻譯")).not.toBeInTheDocument()
  })
})
