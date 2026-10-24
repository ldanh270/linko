"use client"

import { useRef, useState, type KeyboardEvent, type ChangeEvent } from "react"
import { ATTACHMENT_LIMITS } from "@linko/contracts"
import { CHAT_COPY, CHAT_KIND } from "../chat.constants"
import type { ChatKind, ComposerRequest, SendCallbacks } from "../chat.types"

/** Composer dependencies expose only the send operation and current pending state. */
export interface MessageComposerOptions { readonly kind: ChatKind; readonly isSending: boolean; readonly isDisabled?: boolean; readonly onSend: (input: ComposerRequest, callbacks: SendCallbacks) => void }

/** Own a recipient-scoped draft, upload validation and stable retry identity. */
export function useMessageComposer({ kind, isSending, isDisabled = false, onSend }: MessageComposerOptions) {
  const [content, setContent] = useState("")
  const [replyId, setReplyId] = useState<string | null>(null)
  const [files, setFiles] = useState<readonly File[]>([])
  const [mentions, setMentions] = useState<readonly string[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const retryId = useRef<string | null>(null)
  const sending = useRef(false)
  const [showMentions, setShowMentions] = useState(false)
  const onContentChange = (value: string) => { setContent(value); retryId.current = null; setShowMentions(kind === CHAT_KIND.GROUP && value.endsWith("@")) }
  const onFilesChange = (selected: readonly File[]) => {
    const issue = selected.length > ATTACHMENT_LIMITS.MAX_FILE_COUNT ? CHAT_COPY.FILE_COUNT_ERROR : selected.some((file) => file.size > ATTACHMENT_LIMITS.MAX_FILE_SIZE_BYTES) ? CHAT_COPY.FILE_SIZE_ERROR : null
    setFileError(issue); setFiles(issue ? [] : selected); retryId.current = null
  }
  const onReply = (id: string | null) => { setReplyId(id); retryId.current = null }
  const onMention = (member: { readonly userId: string; readonly displayName: string | null }) => {
    setContent((current) => `${current.slice(0, -1)}${member.displayName ?? CHAT_COPY.MEMBER} `)
    setMentions((current) => current.includes(member.userId) ? current : [...current, member.userId]); setShowMentions(false); retryId.current = null
  }
  const onSubmit = (event: { preventDefault(): void }) => {
    event.preventDefault()
    if ((!content.trim() && !files.length) || isSending || isDisabled || sending.current || fileError) return
    retryId.current ??= crypto.randomUUID(); sending.current = true; setSendError(null)
    onSend({ clientMessageId: retryId.current, content: content.trim(), files, mentions, ...(replyId ? { replyTo: replyId } : {}) }, {
      onSuccess: () => { sending.current = false; setContent(""); setFiles([]); setMentions([]); setReplyId(null); retryId.current = null },
      onError: () => { sending.current = false; setSendError(CHAT_COPY.SEND_ERROR) },
    })
  }
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) onSubmit(event) }
  const onInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => onContentChange(event.target.value)
  const onFileInputChange = (event: ChangeEvent<HTMLInputElement>) => { onFilesChange(Array.from(event.target.files ?? [])); event.target.value = "" }
  return { content, files, replyId, fileError, sendError, isSending, showMentions, onContentChange, onFilesChange, onInputChange, onFileInputChange, onReply, onCancelReply: () => onReply(null), onMention, onSubmit, onKeyDown, onEmoji: () => onContentChange(`${content}😊`), canSend: Boolean(content.trim() || files.length) && !fileError && !isSending && !isDisabled }
}
