"use client"

import { useQuery } from "@tanstack/react-query"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQueryParamState } from "@/shared/url/useQueryParamState"
import { CONVERSATION_KIND, type ConversationKind } from "@linko/contracts"
import { z } from "zod"
import { listInbox } from "../api/inbox.api"
import { CONVERSATION_QUERY_PARAMS } from "@linko/contracts"
import { APP_ROUTES } from "@/shared/layout/route.constants"
import { Link } from "@/shared/components/Link"
import { LoadingState } from "@/shared/components/LoadingState"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"
import { Button } from "@/shared/components/Button"
import { PageHeader } from "@/shared/components/PageHeader"
import { SurfacePanel } from "@/shared/components/SurfacePanel"
import { ConversationList } from "../components/ConversationList"
import { INBOX_QUERY_KEY } from "../inbox.constants"

const KIND_SCHEMA = z.enum([CONVERSATION_KIND.ALL, CONVERSATION_KIND.GROUP, CONVERSATION_KIND.DIRECT])
const INBOX_FILTERS = [
  { value: CONVERSATION_KIND.ALL, label: "Tất cả" },
  { value: CONVERSATION_KIND.GROUP, label: "Nhóm" },
  { value: CONVERSATION_KIND.DIRECT, label: "Bạn bè" },
] as const

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
    <PageHeader eyebrow="Không gian của bạn" title="Tin nhắn" actions={<Link href={APP_ROUTES.PEOPLE} className="rounded-lg bg-[var(--brand)] px-4 py-2.5 font-semibold text-[var(--brand-contrast)] shadow-[var(--shadow-brand)] hover:bg-[var(--brand-hover)]">Tìm bạn bè</Link>} />
    <nav aria-label="Lọc hội thoại" className="flex w-fit gap-1 rounded-xl bg-[var(--surface-subtle)] p-1">
      {INBOX_FILTERS.map(({ value, label }) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => changeKind(value)} className={`min-h-10 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[var(--brand)] ${kind === value ? "bg-[var(--surface)] text-[var(--brand)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}>{label}</button>)}
    </nav>
    {query.isPending ? <LoadingState label="Đang tải hội thoại" /> : query.isError ? <ErrorState title="Không thể tải hộp thư" onRetry={() => void query.refetch()} /> : items.length === 0 ? <EmptyState title="Chưa có cuộc trò chuyện" description="Tạo một nhóm riêng hoặc kết nối với bạn bè để bắt đầu." action={<Link href={APP_ROUTES.GROUP_CREATE}>Tạo nhóm đầu tiên</Link>} /> : <>
      <SurfacePanel className="overflow-hidden">
        <ConversationList items={items} />
      </SurfacePanel>
      {query.data?.nextCursor && <Button type="button" isLoading={query.isFetching} onClick={() => setCursor(query.data?.nextCursor ?? "")}>Tải thêm</Button>}
    </>}
  </section>
}
