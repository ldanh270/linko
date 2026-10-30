"use client"

import { useRef, useState, type KeyboardEvent, type ChangeEvent } from "react"
import { ATTACHMENT_LIMITS } from "@linko/contracts"
import { ALLOWED_ATTACHMENT_EXTENSIONS, CHAT_COPY, CHAT_KIND } from "../chat.constants"
import type { ChatKind, ComposerRequest, SendCallbacks } from "../chat.types"
import { useComposerFilePreviews } from "./useComposerFilePreviews"
import { useChatPreferences } from "../preferences/useChatPreferences"

/** Composer dependencies expose only the send operation and current pending state. */
export interface MessageComposerOptions {
  readonly kind: ChatKind
  readonly isSending: boolean
  readonly isDisabled?: boolean
  readonly onSend: (input: ComposerRequest, callbacks: SendCallbacks) => void
  readonly onTyping?: () => void
}

/** Own a recipient-scoped draft, upload validation and stable retry identity. */
export function useMessageComposer({ kind, isSending, isDisabled = false, onSend, onTyping }: MessageComposerOptions) {
  const [content, setContent] = useState("")
  const [replyId, setReplyId] = useState<string | null>(null)
  const [files, setFiles] = useState<readonly File[]>([])
  const [mentions, setMentions] = useState<readonly string[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const retryId = useRef<string | null>(null)
  const sending = useRef(false)
  const [showMentions, setShowMentions] = useState(false)
  const filePreviews = useComposerFilePreviews(files)

  const onContentChange = (value: string) => {
    setContent(value)
    retryId.current = null
    setShowMentions(kind === CHAT_KIND.GROUP && value.endsWith("@"))
    onTyping?.()
  }

  const validateFiles = (selected: readonly File[]): string | null => {
    if (selected.length > ATTACHMENT_LIMITS.MAX_FILE_COUNT) return CHAT_COPY.FILE_COUNT_ERROR
    if (selected.some((file) => file.size > ATTACHMENT_LIMITS.MAX_FILE_SIZE_BYTES)) return CHAT_COPY.FILE_SIZE_ERROR
    const hasUnsupported = selected.some((file) => {
      const ext = `.${file.name.split(".").pop() ?? ""}`.toLowerCase()
      return !ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext as (typeof ALLOWED_ATTACHMENT_EXTENSIONS)[number])
    })
    if (hasUnsupported) return CHAT_COPY.FILE_TYPE_ERROR
    return null
  }

  const onFilesChange = (selected: readonly File[]) => {
    const issue = validateFiles(selected)
    setFileError(issue)
    setFiles(issue ? [] : selected)
    retryId.current = null
  }

  const onAddFiles = (newFiles: readonly File[]) => {
    if (newFiles.length === 0) return
    const combined = [...files, ...newFiles]
    const issue = validateFiles(combined)
    setFileError(issue)
    setFiles(issue ? files : combined)
    retryId.current = null
  }

  const onRemoveFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index)
    setFiles(updated)
    setFileError(validateFiles(updated))
    retryId.current = null
  }

  const onReply = (id: string | null) => { setReplyId(id); retryId.current = null }
  const onMention = (member: { readonly userId: string; readonly displayName: string | null }) => {
    setContent((current) => `${current.slice(0, -1)}${member.displayName ?? CHAT_COPY.MEMBER} `)
    setMentions((current) => current.includes(member.userId) ? current : [...current, member.userId])
    setShowMentions(false)
    retryId.current = null
  }
  const onSubmit = (event: { preventDefault(): void }) => {
    event.preventDefault()
    if ((!content.trim() && !files.length) || isSending || isDisabled || sending.current || fileError) return
    retryId.current ??= crypto.randomUUID()
    sending.current = true
    setSendError(null)

    const submittedContent = content.trim()
    const submittedFiles = files
    const submittedMentions = mentions
    const submittedReplyId = replyId

    // Optimistically clear the draft immediately for instant 0ms response
    setContent("")
    setFiles([])
    setMentions([])
    setReplyId(null)

    onSend({ clientMessageId: retryId.current, content: submittedContent, files: submittedFiles, mentions: submittedMentions, ...(submittedReplyId ? { replyTo: submittedReplyId } : {}) }, {
      onSuccess: () => {
        sending.current = false
        retryId.current = null
      },
      onError: (error?: unknown) => {
        sending.current = false
        // Restore draft so user never loses message content on failure
        setContent(submittedContent)
        setFiles(submittedFiles)
        setMentions(submittedMentions)
        setReplyId(submittedReplyId)
        const message = error instanceof Error && error.message && error.message !== "HTTP_ERROR" ? error.message : CHAT_COPY.SEND_ERROR
        setSendError(message)
      },
    })
  }
  const { preferences: chatPreferences } = useChatPreferences()
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (chatPreferences.sendOnEnter) {
      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
        onSubmit(event)
      }
    } else {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.nativeEvent.isComposing) {
        onSubmit(event)
      }
    }
  }
  const onInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => onContentChange(event.target.value)
  const onFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? [])
    if (files.length === 0) {
      onFilesChange(selected)
    } else {
      onAddFiles(selected)
    }
    event.target.value = ""
  }

  return {
    content,
    files,
    filePreviews,
    replyId,
    fileError,
    sendError,
    isSending,
    showMentions,
    onContentChange,
    onFilesChange,
    onAddFiles,
    onRemoveFile,
    onInputChange,
    onFileInputChange,
    onReply,
    onCancelReply: () => onReply(null),
    onMention,
    onSubmit,
    onKeyDown,
    onEmoji: () => {},
    canSend: Boolean(content.trim() || files.length) && !fileError && !isSending && !isDisabled,
  }
}
