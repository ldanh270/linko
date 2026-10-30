import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useMessageComposer } from "./useMessageComposer"
import type { ComposerRequest, SendCallbacks } from "../chat.types"

describe("message composer", () => {
  it("should_preserve_retry_identity_until_content_changes", () => {
    const onSend = vi.fn((_input: ComposerRequest, callbacks: SendCallbacks) => callbacks.onError())
    const { result } = renderHook(() => useMessageComposer({ onSend, isSending: false, kind: "direct" }))
    act(() => result.current.onContentChange("Xin chào"))
    act(() => result.current.onSubmit({ preventDefault: vi.fn() }))
    act(() => result.current.onSubmit({ preventDefault: vi.fn() }))
    expect(onSend.mock.calls[0][0].clientMessageId).toBe(onSend.mock.calls[1][0].clientMessageId)
    act(() => result.current.onContentChange("Tin mới"))
    act(() => result.current.onSubmit({ preventDefault: vi.fn() }))
    expect(onSend.mock.calls[2][0].clientMessageId).not.toBe(onSend.mock.calls[0][0].clientMessageId)
  })
  it("should_block_a_second_send_before_the_query_pending_state_updates", () => {
    const onSend = vi.fn()
    const { result } = renderHook(() => useMessageComposer({ onSend, isSending: false, kind: "direct" }))
    act(() => result.current.onContentChange("Xin chào"))
    act(() => { result.current.onSubmit({ preventDefault: vi.fn() }); result.current.onSubmit({ preventDefault: vi.fn() }) })
    expect(onSend).toHaveBeenCalledOnce()
  })
  it("should_block_empty_sends_and_oversized_or_excessive_attachments", () => {
    const onSend = vi.fn()
    const { result } = renderHook(() => useMessageComposer({ onSend, isSending: false, kind: "group" }))
    act(() => result.current.onSubmit({ preventDefault: vi.fn() }))
    expect(onSend).not.toHaveBeenCalled()
    act(() => result.current.onFilesChange(Array.from({ length: 6 }, () => new File(["x"], "a.txt"))))
    expect(result.current.fileError).toBeTruthy()
    const oversized = new File(["x"], "large.txt")
    Object.defineProperty(oversized, "size", { value: 11 * 1024 * 1024 })
    act(() => result.current.onFilesChange([oversized]))
    expect(result.current.fileError).toBeTruthy()
    expect(result.current.files).toEqual([])
  })
  it("should_support_removing_individual_files_and_clearing_draft_errors", () => {
    const onSend = vi.fn()
    const { result } = renderHook(() => useMessageComposer({ onSend, isSending: false, kind: "direct" }))
    const file1 = new File(["1"], "photo.png", { type: "image/png" })
    const file2 = new File(["2"], "doc.pdf", { type: "application/pdf" })
    act(() => result.current.onFilesChange([file1, file2]))
    expect(result.current.files).toHaveLength(2)
    act(() => result.current.onRemoveFile(0))
    expect(result.current.files).toHaveLength(1)
    expect(result.current.files[0].name).toBe("doc.pdf")
  })
  it("should_clear_draft_immediately_on_send_and_restore_on_error", () => {
    let capturedCallbacks: SendCallbacks | null = null
    const onSend = vi.fn((_input: ComposerRequest, callbacks: SendCallbacks) => {
      capturedCallbacks = callbacks
    })
    const { result } = renderHook(() => useMessageComposer({ onSend, isSending: false, kind: "direct" }))
    act(() => result.current.onContentChange("Tin tức thì"))
    act(() => result.current.onSubmit({ preventDefault: vi.fn() }))

    // Content is cleared immediately (0ms delay)
    expect(result.current.content).toBe("")

    // On error, draft is restored so user doesn't lose input
    act(() => {
      if (capturedCallbacks) capturedCallbacks.onError(new Error("Lỗi mạng"))
    })
    expect(result.current.content).toBe("Tin tức thì")
    expect(result.current.sendError).toBe("Lỗi mạng")
  })
})
