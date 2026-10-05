"use client"

import { useState, type FormEvent } from "react"
import { useParams, useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ROLE } from "@linko/contracts"
import { changeRole, listMembers, removeMember, transferOwner } from "@/features/membership/api/membership.api"
import { closeGroup } from "../api/groupLifecycle.api"
import { findGroupInInbox, updateGroup } from "../api/groups.api"
import { Button } from "@/shared/components/Button"
import { Input } from "@/shared/components/Input"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"

/** Edit group details and manage membership within server-authorized roles. */
export function GroupManagePage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const router = useRouter()
  const client = useQueryClient()
  const key = ["group-manage", conversationId] as const
  const query = useQuery({ queryKey: key, queryFn: () => findGroupInInbox(conversationId) })
  const membersQuery = useQuery({ queryKey: ["members", conversationId], queryFn: () => listMembers(conversationId) })
  const group = query.data?.group
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const [descriptionDraft, setDescriptionDraft] = useState<string | null>(null)
  const name = nameDraft ?? group?.name ?? ""
  const description = descriptionDraft ?? group?.description ?? ""
  const refresh = () => Promise.all([client.invalidateQueries({ queryKey: key }), client.invalidateQueries({ queryKey: ["members", conversationId] })])
  const save = useMutation({ mutationFn: () => updateGroup({ id: conversationId, name, description }), onSuccess: () => refresh() })
  const updateRole = useMutation({ mutationFn: (input: { userId: string; role: typeof ROLE.ADMIN | typeof ROLE.MEMBER }) => changeRole({ conversationId, ...input }), onSuccess: refresh })
  const remove = useMutation({ mutationFn: (userId: string) => removeMember({ conversationId, userId }), onSuccess: refresh })
  const transfer = useMutation({ mutationFn: (newOwnerId: string) => transferOwner({ conversationId, newOwnerId }), onSuccess: refresh })
  const close = useMutation({ mutationFn: () => closeGroup(conversationId), onSuccess: () => router.replace("/groups") })
  const onSubmit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); save.mutate() }
  if (query.isPending) return <LoadingState label="Đang tải nhóm" />
  if (query.isError || !group) return <ErrorState title="Không thể mở phần quản lý nhóm" onRetry={() => void query.refetch()} />
  return <section className="mx-auto grid max-w-3xl gap-6"><header><p className="text-sm font-semibold text-[var(--brand)]">Quyền quản trị</p><h1 className="mt-1 text-3xl font-bold">Quản lý nhóm</h1></header>
    <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><h2 className="text-lg font-semibold">Thông tin chung</h2><Input id="manage-group-name" label="Tên nhóm" required maxLength={80} value={name} onChange={(event) => setNameDraft(event.target.value)} /><div className="grid gap-1.5"><label htmlFor="manage-group-description" className="text-sm font-medium">Mô tả</label><textarea id="manage-group-description" maxLength={500} rows={3} value={description} onChange={(event) => setDescriptionDraft(event.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3" /></div><Button type="submit" isLoading={save.isPending}>Lưu thông tin</Button></form>
    <section className="grid gap-3"><h2 className="text-xl font-semibold">Thành viên và vai trò</h2>{membersQuery.isPending ? <LoadingState label="Đang tải thành viên" /> : membersQuery.isError ? <ErrorState title="Không thể tải thành viên" onRetry={() => void membersQuery.refetch()} /> : membersQuery.data.map((member) => <article key={member.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><div><p className="font-medium">{member.displayName || "Thành viên"}</p><p className="text-sm text-[var(--text-secondary)]">{member.role}</p></div>{member.role !== ROLE.OWNER && <div className="flex flex-wrap gap-2"><Button size="small" variant="secondary" isLoading={updateRole.isPending} onClick={() => updateRole.mutate({ userId: member.userId, role: member.role === ROLE.ADMIN ? ROLE.MEMBER : ROLE.ADMIN })}>{member.role === ROLE.ADMIN ? "Hạ quyền" : "Cấp quyền quản trị"}</Button><Button size="small" variant="secondary" onClick={() => { if (window.confirm("Chuyển quyền chủ nhóm cho thành viên này?")) transfer.mutate(member.userId) }}>Chuyển chủ nhóm</Button><Button size="small" variant="danger" isLoading={remove.isPending} onClick={() => { if (window.confirm("Xóa thành viên khỏi nhóm?")) remove.mutate(member.userId) }}>Xóa</Button></div>}</article>)}</section>
    {(save.isError || updateRole.isError || remove.isError || transfer.isError || close.isError) && <p role="alert" className="text-sm text-[var(--danger)]">Không thể thực hiện thao tác này. Kiểm tra quyền của bạn rồi thử lại.</p>}
    <section className="rounded-2xl border border-[var(--danger)]/40 bg-[var(--surface)] p-5"><h2 className="font-semibold">Đóng nhóm</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Thành viên sẽ không thể gửi tin hoặc dùng lời mời hiện có.</p><Button className="mt-4" variant="danger" isLoading={close.isPending} onClick={() => { if (window.confirm("Đóng nhóm này? Thao tác này sẽ dừng trò chuyện và thu hồi lời mời.")) close.mutate() }}>Đóng nhóm</Button></section>
  </section>
}
