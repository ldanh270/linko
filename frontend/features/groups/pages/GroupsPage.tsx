"use client"

import { useQuery } from "@tanstack/react-query"
import { CONVERSATION_KIND, CONVERSATION_QUERY_PARAMS, INBOX_FIELDS } from "@linko/contracts"
import { z } from "zod"
import { useQueryParamState } from "@/shared/url/useQueryParamState"
import { listInbox } from "@/features/inbox/api/inbox.api"
import { Link } from "@/shared/components/Link"
import { LoadingState } from "@/shared/components/LoadingState"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"
import { Button } from "@/shared/components/Button"

/** List private groups returned for the authenticated account. */
export function GroupsPage() {
  const { value: cursor, setValue: setCursor } = useQueryParamState(CONVERSATION_QUERY_PARAMS.CURSOR, z.string(), "")
  const query = useQuery({ queryKey: ["groups", cursor], queryFn: () => listInbox({ kind: CONVERSATION_KIND.GROUP, ...(cursor ? { cursor } : {}) }) })
  const groups = query.data?.items ?? []
  return <section className="grid gap-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-[var(--brand)]">Không gian riêng tư</p><h1 className="mt-1 text-3xl font-bold">Nhóm của bạn</h1></div><Link href={APP_ROUTES.GROUP_CREATE} className="rounded-xl bg-[var(--brand)] px-4 py-3 font-semibold text-[var(--brand-contrast)]">Tạo nhóm</Link></header>
    {query.isPending ? <LoadingState label="Đang tải nhóm" /> : query.isError ? <ErrorState title="Không thể tải danh sách nhóm" onRetry={() => void query.refetch()} /> : groups.length === 0 ? <EmptyState title="Chưa có nhóm nào" description="Tạo một không gian riêng để bắt đầu trò chuyện cùng bạn bè." action={<Link href={APP_ROUTES.GROUP_CREATE}>Tạo nhóm đầu tiên</Link>} /> : <><ul className="grid gap-3 sm:grid-cols-2">{groups.map((group) => <li key={group[INBOX_FIELDS.ID]}><Link href={buildAppRoute(APP_ROUTES.GROUP_CONVERSATION, { conversationId: group.id })} className="block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:bg-[var(--surface-subtle)]"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--brand-soft)] text-xl text-[var(--brand)]">✦</span><h2 className="mt-4 text-lg font-semibold">{group.group?.name}</h2><p className="mt-1 line-clamp-2 min-h-10 text-sm text-[var(--text-secondary)]">{group.group?.description || "Không gian trò chuyện riêng của nhóm."}</p><span className="mt-4 block text-sm text-[var(--brand)]">Mở cuộc trò chuyện →</span></Link></li>)}</ul>{query.data?.nextCursor && <Button type="button" isLoading={query.isFetching} onClick={() => setCursor(query.data?.nextCursor ?? "")}>Tải thêm</Button>}</>}
  </section>
}
