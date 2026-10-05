"use client"

import { useQuery } from "@tanstack/react-query"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQueryParamState } from "@/shared/url/useQueryParamState"
import { CONVERSATION_KIND, CONVERSATION_TYPE, INBOX_FIELDS, type ConversationKind, type InboxItemDto } from "@linko/contracts"
import { z } from "zod"
import { listInbox } from "../api/inbox.api"
import { CONVERSATION_QUERY_PARAMS } from "@linko/contracts"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"
import { Link } from "@/shared/components/Link"
import { LoadingState } from "@/shared/components/LoadingState"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"
import { Button } from "@/shared/components/Button"

const KIND_SCHEMA = z.enum([CONVERSATION_KIND.ALL, CONVERSATION_KIND.GROUP, CONVERSATION_KIND.DIRECT])
const INBOX_QUERY_KEY = ["inbox"] as const

/** Render conversations with a URL-backed kind filter and explicit request states. */
export function InboxPage() {
  const { value: kind } = useQueryParamState<ConversationKind>(CONVERSATION_QUERY_PARAMS.KIND, KIND_SCHEMA, CONVERSATION_KIND.ALL)
  const { value: cursor, setValue: setCursor } = useQueryParamState(CONVERSATION_QUERY_PARAMS.CURSOR, z.string(), "")
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const changeKind = (value: ConversationKind) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete(CONVERSATION_QUERY_PARAMS.CURSOR)
    if (value === CONVERSATION_KIND.ALL) params.delete(CONVERSATION_QUERY_PARAMS.KIND)
    else params.set(CONVERSATION_QUERY_PARAMS.KIND, value)
    const queryString = params.toString()
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }
  const query = useQuery({ queryKey: [...INBOX_QUERY_KEY, kind, cursor], queryFn: () => listInbox({ kind, ...(cursor ? { cursor } : {}) }) })
  const items = query.data?.items ?? []
  return <section className="grid gap-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-[var(--brand)]">Không gian của bạn</p><h1 className="mt-1 text-3xl font-bold">Tin nhắn</h1></div><Link href={APP_ROUTES.PEOPLE}>Tìm bạn bè</Link></header>
    <nav aria-label="Lọc hội thoại" className="flex gap-2">{([[CONVERSATION_KIND.ALL,"Tất cả"],[CONVERSATION_KIND.GROUP,"Nhóm"],[CONVERSATION_KIND.DIRECT,"Bạn bè"]] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={kind===value} onClick={() => changeKind(value)} className={`min-h-11 rounded-full px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-[var(--brand)] ${kind===value?"bg-[var(--brand-soft)] text-[var(--brand)]":"text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"}`}>{label}</button>)}</nav>
    {query.isPending ? <LoadingState label="Đang tải hội thoại" /> : query.isError ? <ErrorState title="Không thể tải hộp thư" onRetry={() => void query.refetch()} /> : items.length === 0 ? <EmptyState title="Chưa có cuộc trò chuyện" description="Tạo một nhóm riêng hoặc kết nối với bạn bè để bắt đầu." action={<Link href={APP_ROUTES.GROUP_CREATE}>Tạo nhóm đầu tiên</Link>} /> : <><ul className="grid gap-2">{items.map((item) => <InboxRow key={item[INBOX_FIELDS.ID]} item={item} />)}</ul>{query.data?.nextCursor && <Button type="button" isLoading={query.isFetching} onClick={() => setCursor(query.data?.nextCursor ?? "")}>Tải thêm</Button>}</>}
  </section>
}

function InboxRow({ item }: { readonly item: InboxItemDto }) {
  const title = item.group?.name ?? item.participants[0]?.displayName ?? "Cuộc trò chuyện"
  const href = item.type === CONVERSATION_TYPE.GROUP ? buildAppRoute(APP_ROUTES.GROUP_CONVERSATION, { conversationId: item.id }) : buildAppRoute(APP_ROUTES.DIRECT_CONVERSATION, { conversationId: item.id })
  return <li><Link href={href} className="flex min-h-20 items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 hover:bg-[var(--surface-subtle)]">
    <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--brand-soft)] font-semibold text-[var(--brand)]">{title.slice(0,1).toUpperCase()}</span>
    <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{title}</span><span className="mt-1 block truncate text-sm text-[var(--text-secondary)]">{item.lastMessage?.content ?? "Chưa có tin nhắn"}</span></span>
    {item.unreadCount > 0 && <span className="rounded-full bg-[var(--brand)] px-2.5 py-1 text-xs font-bold text-[var(--brand-contrast)]" aria-label={`${item.unreadCount} tin chưa đọc`}>{item.unreadCount}</span>}
  </Link></li>
}
