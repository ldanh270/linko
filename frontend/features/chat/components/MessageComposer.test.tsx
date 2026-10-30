import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { MessageComposer } from "./MessageComposer"
import type { useConversationPane } from "../hooks/useConversationPane"

function createMockState(overrides: Record<string, unknown> = {}): ReturnType<typeof useConversationPane> {
  const defaultComposer = {
    content: "Xin chào",
    files: [],
    filePreviews: [],
    replyId: null,
    replyTarget: null,
    fileError: null,
    sendError: null,
    isSending: false,
    showMentions: false,
    onContentChange: vi.fn(),
    onFilesChange: vi.fn(),
    onAddFiles: vi.fn(),
    onRemoveFile: vi.fn(),
    onInputChange: vi.fn(),
    onFileInputChange: vi.fn(),
    onReply: vi.fn(),
    onCancelReply: vi.fn(),
    onMention: vi.fn(),
    onSubmit: vi.fn(),
    onKeyDown: vi.fn(),
    onEmoji: vi.fn(),
    canSend: true,
  }

  const { composer: composerOverride, ...restOverrides } = overrides

  return {
    isComposerDisabled: false,
    members: { data: [], isError: false },
    pins: { update: { isError: false } },
    ...restOverrides,
    composer: { ...defaultComposer, ...composerOverride },
  } as unknown as ReturnType<typeof useConversationPane>
}

describe("MessageComposer", () => {
  it("keeps input focused and calls onSubmit when form is submitted", () => {
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
    const state = createMockState({ composer: { onSubmit } })

    render(<MessageComposer state={state} />)
    const textarea = screen.getByRole("textbox", { name: "Soạn tin nhắn" })
    textarea.focus()
    expect(document.activeElement).toBe(textarea)

    const form = screen.getByRole("form", { name: "Soạn tin nhắn" })
    fireEvent.submit(form)

    expect(onSubmit).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(textarea)
  })

  it("prevents default on Send button mousedown to avoid blurring textarea", () => {
    const state = createMockState()
    render(<MessageComposer state={state} />)

    const sendButton = screen.getByRole("button", { name: "Gửi tin nhắn" })
    const mousedownEvent = new MouseEvent("mousedown", { cancelable: true, bubbles: true })
    sendButton.dispatchEvent(mousedownEvent)

    expect(mousedownEvent.defaultPrevented).toBe(true)
  })

  it("keeps textarea enabled for typing next message immediately while isSending is true", () => {
    const state = createMockState({ composer: { isSending: true } })
    render(<MessageComposer state={state} />)

    const textarea = screen.getByRole("textbox", { name: "Soạn tin nhắn" }) as HTMLTextAreaElement
    expect(textarea.readOnly).toBe(false)
    expect(textarea.disabled).toBe(false)
  })

  it("automatically refocuses textarea when send completes", () => {
    const stateSending = createMockState({ composer: { isSending: true } })
    const { rerender } = render(<MessageComposer state={stateSending} />)

    const textarea = screen.getByRole("textbox", { name: "Soạn tin nhắn" })
    // blur the textarea to simulate external blur
    textarea.blur()

    const stateDone = createMockState({ composer: { isSending: false } })
    rerender(<MessageComposer state={stateDone} />)

    expect(document.activeElement).toBe(textarea)
  })
})
