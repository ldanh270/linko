import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useMessageAttachment } from "./useMessageAttachment"
import type { AttachmentViewModel } from "../chat.types"

vi.mock("./useAttachmentThumbnail", () => ({
  useAttachmentThumbnail: vi.fn(({ isImage }: { isImage: boolean }) => ({
    objectUrl: isImage ? "blob:http://localhost/test-uuid" : null,
    isLoading: false,
    hasError: false,
  })),
}))

describe("useMessageAttachment", () => {
  const imageAttachment: AttachmentViewModel = {
    id: "att-1",
    messageId: "msg-1",
    name: "photo.jpg",
    sizeLabel: "1.2 MB",
    imageUrl: "/api/messages/msg-1/attachments/att-1",
    href: "/attachments/msg-1/att-1",
  }

  const documentAttachment: AttachmentViewModel = {
    id: "att-2",
    messageId: "msg-1",
    name: "document.pdf",
    sizeLabel: "500 KB",
    href: "/attachments/msg-1/att-2",
  }

  it("should detect images and control lightbox open/close state", () => {
    const { result } = renderHook(() => useMessageAttachment({ file: imageAttachment }))

    expect(result.current.isImage).toBe(true)
    expect(result.current.thumbnail.objectUrl).toBe("blob:http://localhost/test-uuid")
    expect(result.current.isLightboxOpen).toBe(false)

    act(() => {
      result.current.onOpenLightbox()
    })
    expect(result.current.isLightboxOpen).toBe(true)

    act(() => {
      result.current.onCloseLightbox()
    })
    expect(result.current.isLightboxOpen).toBe(false)
  })

  it("should identify non-image attachments correctly", () => {
    const { result } = renderHook(() => useMessageAttachment({ file: documentAttachment }))

    expect(result.current.isImage).toBe(false)
    expect(result.current.thumbnail.objectUrl).toBeNull()
  })
})
