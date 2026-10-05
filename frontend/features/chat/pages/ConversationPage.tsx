"use client"

import { useState, type FormEvent } from "react"
import { ATTACHMENT_LIMITS, MESSAGE_ATTACHMENT_FIELDS, MESSAGE_FIELDS, MESSAGE_LIMITS } from "@linko/contracts"
import { Button } from "@/shared/components/Button"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { Link } from "@/shared/components/Link"
import { useConversationChat } from "../hooks/useConversationChat"
import { useGroupPins } from "../hooks/useGroupPins"
import { listMembers } from "@/features/membership/api/membership.api"
import { useQuery } from "@tanstack/react-query"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"

/** Render one responsive timeline for group and direct conversations. */
export function ConversationPage({ conversationId, kind }: { readonly conversationId: string; readonly kind: "group" | "direct" }) {
  const { query, messages, send } = useConversationChat(conversationId)
  const { query: pinsQuery, update: pinsUpdate } = useGroupPins(conversationId, kind === "group")
  const pinnedIds = new Set(pinsQuery.data?.map((message) => message.id) ?? [])
  const [content, setContent] = useState("")
  const [replyId, setReplyId] = useState<string | null>(null)
  const [files, setFiles] = useState<readonly File[]>([])
  const [mentions, setMentions] = useState<readonly string[]>([])
  const [showMentions, setShowMentions] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const membersQuery = useQuery({ queryKey: ["members", conversationId], queryFn: () => listMembers(conversationId), enabled: kind === "group" })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [clientMessageId, setClientMessageId] = useState<string | null>(null)
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = content.trim()
    if ((!trimmed && files.length === 0) || send.isPending || fileError) return
    setErrorMessage(null)
    const retryId = clientMessageId ?? crypto.randomUUID()
    setClientMessageId(retryId)
    send.mutate({ clientMessageId: retryId, content: trimmed, ...(replyId ? { replyTo: replyId } : {}), mentions, files }, { onSuccess: () => { setContent(""); setFiles([]); setMentions([]); setReplyId(null); setClientMessageId(null) }, onError: () => setErrorMessage("Tin nhắn chưa gửi được. Hãy thử lại.") })
  }
  const onMessageChange = (value: string) => { setContent(value); setClientMessageId(null); setShowMentions(kind === "group" && value.endsWith("@")) }
  const addMention = (member: { readonly userId: string; readonly displayName: string | null }) => {
    const name = member.displayName ?? "thành viên"
    setContent((current) => `${current.slice(0, -1)}${name} `)
    setClientMessageId(null)
    setMentions((current) => current.includes(member.userId) ? current : [...current, member.userId])
    setShowMentions(false)
  }
  if (query.isPending) return <LoadingState label="Đang tải tin nhắn" />
  if (query.isError && !query.data?.pages.length) return <ErrorState title="Không thể tải cuộc trò chuyện" onRetry={() => void query.refetch()} />
  return <section className="mx-auto grid h-[calc(100dvh-10rem)] min-h-[30rem] max-w-5xl grid-rows-[auto_1fr_auto] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3 sm:px-6"><div><p className="text-sm text-[var(--text-secondary)]">{kind === "group" ? "Nhóm riêng" : "Tin nhắn riêng"}</p><h1 className="text-lg font-semibold">{kind === "group" ? "Cuộc trò chuyện" : "Bạn bè"}</h1></div><div className="flex flex-wrap gap-3">{kind === "group" ? <><Link href={buildAppRoute(APP_ROUTES.GROUP_INFO, { conversationId })}>Thông tin nhóm</Link><Link href={buildAppRoute(APP_ROUTES.GROUP_INVITATIONS, { conversationId })}>Lời mời</Link></> : <Link href={APP_ROUTES.PEOPLE}>Bạn bè</Link>}</div></header>
    <div className="grid content-start gap-3 overflow-y-auto p-4 sm:p-6" aria-label="Tin nhắn" aria-live="polite">{query.isFetchNextPageError && <ErrorState title="Không thể tải tin cũ hơn" onRetry={() => void query.fetchNextPage()} />}{query.hasNextPage && <Button type="button" isLoading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>Tải tin cũ hơn</Button>}{messages.map((message) => { const isPinned = pinnedIds.has(message.id); return <article key={message[MESSAGE_FIELDS.ID]} className="max-w-[85%] rounded-2xl bg-[var(--surface-subtle)] p-3 sm:max-w-[70%]"><p className="whitespace-pre-wrap break-words">{message[MESSAGE_FIELDS.CONTENT]}</p>{message.attachments.map((file) => <Link key={file[MESSAGE_ATTACHMENT_FIELDS.ID]} className="mt-2 block text-sm" href={`/attachments/${message.id}/${file.id}`}>{file.name ?? "Tải tệp"}</Link>)}<footer className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]"><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString("vi-VN")}</time><button type="button" onClick={() => { setReplyId(message.id); setClientMessageId(null) }} className="underline focus-visible:outline-2 focus-visible:outline-[var(--brand)]">Trả lời</button>{kind === "group" && <button type="button" disabled={pinsUpdate.isPending || (!isPinned && pinnedIds.size >= 3)} onClick={() => pinsUpdate.mutate({ messageId: message.id, isPinned })} className="underline disabled:cursor-not-allowed disabled:opacity-50">{isPinned ? "Bỏ ghim" : "Ghim"}</button>}</footer></article> })}</div>
    <form onSubmit={onSubmit} className="relative border-t border-[var(--border)] p-3 sm:p-4">{replyId && <div className="mb-2 flex items-center justify-between text-sm"><span>Đang trả lời tin nhắn</span><button type="button" onClick={() => { setReplyId(null); setClientMessageId(null) }} className="underline">Bỏ trả lời</button></div>}{showMentions && membersQuery.data && <ul role="listbox" aria-label="Chọn người được nhắc tên" className="absolute bottom-full left-3 z-10 max-h-48 w-72 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg">{membersQuery.data.map((member) => <li key={member.userId}><button type="button" role="option" aria-selected="false" onClick={() => addMention(member)} className="min-h-11 w-full rounded-lg px-3 text-left hover:bg-[var(--surface-subtle)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]">{member.displayName ?? "Thành viên"}</button></li>)}</ul>}<div className="flex items-end gap-2"><label className="sr-only" htmlFor="message-input">Soạn tin nhắn</label><textarea id="message-input" rows={2} maxLength={MESSAGE_LIMITS.MAX_CONTENT_LENGTH} value={content} onChange={(event) => onMessageChange(event.target.value)} placeholder="Viết tin nhắn…" className="min-h-12 min-w-0 flex-1 resize-y rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 focus-visible:outline-2 focus-visible:outline-[var(--brand)]" /><Button type="submit" isLoading={send.isPending} disabled={!content.trim() && files.length===0}>Gửi</Button></div><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><label htmlFor="message-files" className="cursor-pointer text-sm font-medium text-[var(--brand)] underline">Đính kèm tệp<input id="message-files" type="file" multiple className="sr-only" onChange={(event) => { const selected = Array.from(event.target.files ?? []); const issue = selected.length > ATTACHMENT_LIMITS.MAX_FILE_COUNT ? "Mỗi tin nhắn có thể đính kèm tối đa 5 tệp." : selected.some((file) => file.size > ATTACHMENT_LIMITS.MAX_FILE_SIZE_BYTES) ? "Mỗi tệp có dung lượng tối đa 10 MiB." : null; setFileError(issue); setFiles(issue ? [] : selected); setClientMessageId(null) }} /></label>{files.length > 0 && <span className="text-sm text-[var(--text-secondary)]">{files.length} tệp đã chọn</span>}</div>{fileError && <p role="alert" className="mt-2 text-sm text-[var(--danger)]">{fileError}</p>}{errorMessage && <p role="alert" className="mt-2 text-sm text-[var(--danger)]">{errorMessage}</p>}</form>
  </section>
}
