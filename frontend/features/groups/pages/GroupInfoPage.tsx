"use client"

import { useParams, useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ROLE } from "@linko/contracts"
import { listMembers } from "@/features/membership/api/membership.api"
import { listPins } from "../api/pins.api"
import { getGroupNotificationPreference, setGroupMuted } from "@/features/settings/api/notification.api"
import { leaveGroup } from "../api/groupLifecycle.api"
import { findGroupInInbox } from "../api/groups.api"
import { Link } from "@/shared/components/Link"
import { Button } from "@/shared/components/Button"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"

/** Show group details, members, pins, and personal notification controls. */
export function GroupInfoPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const router = useRouter()
  const client = useQueryClient()
  const query = useQuery({ queryKey: ["group-info", conversationId], queryFn: () => findGroupInInbox(conversationId) })
  const membersQuery = useQuery({ queryKey: ["members", conversationId], queryFn: () => listMembers(conversationId) })
  const pinsQuery = useQuery({ queryKey: ["pins", conversationId], queryFn: () => listPins(conversationId) })
  const preference = useQuery({ queryKey: ["group-preference", conversationId], queryFn: () => getGroupNotificationPreference(conversationId) })
  const mute = useMutation({ mutationFn: (isMuted: boolean) => setGroupMuted({ conversationId, isMuted }), onSuccess: () => client.invalidateQueries({ queryKey: ["group-preference", conversationId] }) })
  const leave = useMutation({ mutationFn: () => leaveGroup(conversationId), onSuccess: () => router.replace("/inbox") })
  const group = query.data?.group
  return <section className="mx-auto grid max-w-3xl gap-6"><header className="flex items-center justify-between"><div><p className="text-sm font-semibold text-[var(--brand)]">Không gian nhóm</p><h1 className="mt-1 text-3xl font-bold">Thông tin nhóm</h1></div><Link href={`/groups/${conversationId}`}>Quay lại chat</Link></header>
    {query.isPending ? <LoadingState label="Đang tải thông tin nhóm" /> : query.isError || !group ? <ErrorState title="Không thể mở thông tin nhóm" onRetry={() => void query.refetch()} /> : <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"><h2 className="text-2xl font-semibold">{group.name}</h2><p className="mt-2 text-[var(--text-secondary)]">{group.description || "Nhóm riêng tư"}</p><div className="mt-5 flex flex-wrap gap-3"><Link href={`/groups/${conversationId}/manage`}>Quản lý nhóm</Link><Link href={`/groups/${conversationId}/invitations`}>Lời mời</Link></div></section>}
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Thông báo</h2><p className="text-sm text-[var(--text-secondary)]">Tùy chọn này chỉ áp dụng cho tài khoản của bạn.</p></div><Button variant="secondary" isLoading={mute.isPending || preference.isPending} disabled={preference.isError} onClick={() => mute.mutate(!preference.data?.isMuted)}>{preference.data?.isMuted ? "Bật thông báo" : "Tắt thông báo"}</Button></div></section>
    {(mute.isError || leave.isError) && <p role="alert" className="text-sm text-[var(--danger)]">Không thể thực hiện thao tác. Có thể tư cách thành viên đã thay đổi.</p>}
    <section className="grid gap-3"><h2 className="text-xl font-semibold">Thành viên</h2>{membersQuery.isPending ? <LoadingState label="Đang tải thành viên" /> : membersQuery.isError ? <ErrorState title="Không thể tải thành viên" onRetry={() => void membersQuery.refetch()} /> : <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4">{membersQuery.data.map((member) => <li key={member.userId} className="flex justify-between py-3"><span>{member.displayName || "Thành viên"}</span><span className="text-sm text-[var(--text-secondary)]">{member.role === ROLE.OWNER ? "Chủ nhóm" : member.role === ROLE.ADMIN ? "Quản trị viên" : "Thành viên"}</span></li>)}</ul>}</section>
    {pinsQuery.data?.length ? <section className="grid gap-3"><h2 className="text-xl font-semibold">Tin đã ghim</h2>{pinsQuery.data.map((message) => <article key={message.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">{message.content || "Tệp đính kèm"}<time className="mt-2 block text-xs text-[var(--text-secondary)]">{new Date(message.createdAt).toLocaleString("vi-VN")}</time></article>)}</section> : null}
    <section className="border-t border-[var(--border)] pt-5"><Button variant="danger" isLoading={leave.isPending} onClick={() => { if (window.confirm("Rời khỏi nhóm? Bạn sẽ mất quyền xem tin nhắn và tệp trong nhóm.")) leave.mutate() }}>Rời nhóm</Button></section>
  </section>
}
