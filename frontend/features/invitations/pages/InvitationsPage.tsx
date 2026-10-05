"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { issueInvitation, listInvitations, revokeInvitation } from "../api/invitations.api"
import { Button } from "@/shared/components/Button"
import { LoadingState } from "@/shared/components/LoadingState"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"

/** Create, copy, inspect, and revoke group invitations. */
export function InvitationsPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const queryClient = useQueryClient()
  const [issuedUrl, setIssuedUrl] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const queryKey = ["invitations", conversationId] as const
  const query = useQuery({ queryKey, queryFn: () => listInvitations(conversationId) })
  const issue = useMutation({ mutationFn: () => issueInvitation(conversationId, crypto.randomUUID()), onSuccess: async (result) => { setIssuedUrl(result.url); await queryClient.invalidateQueries({ queryKey }) } })
  const revoke = useMutation({ mutationFn: (id: string) => revokeInvitation(conversationId, id), onSuccess: () => queryClient.invalidateQueries({ queryKey }) })
  const onCopy = async () => { if (!issuedUrl) return; try { await navigator.clipboard.writeText(issuedUrl); setFeedback("Đã sao chép liên kết.") } catch { setFeedback("Không thể sao chép. Hãy chọn và sao chép liên kết thủ công.") } }
  const invitations = query.data ?? []
  return <section className="mx-auto grid max-w-3xl gap-6"><header><p className="text-sm font-semibold text-[var(--brand)]">Quản lý thành viên</p><h1 className="mt-1 text-3xl font-bold">Lời mời nhóm</h1><p className="mt-2 text-[var(--text-secondary)]">Người có liên kết có thể chuyển tiếp lời mời này.</p></header>
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><h2 className="font-semibold">Tạo liên kết mới</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Liên kết có thời hạn và số lượt tham gia giới hạn.</p><Button className="mt-4" isLoading={issue.isPending} onClick={() => { setFeedback(null); issue.mutate() }}>Tạo lời mời</Button>{issue.isError && <p role="alert" className="mt-3 text-sm text-[var(--danger)]">Bạn không có quyền tạo lời mời hoặc đã có lỗi xảy ra.</p>}{issuedUrl && <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"><label className="sr-only" htmlFor="issued-link">Liên kết lời mời</label><input id="issued-link" readOnly value={issuedUrl} className="min-h-11 min-w-0 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /><Button variant="secondary" onClick={() => void onCopy()}>Sao chép</Button></div>}{feedback && <p role="status" className="mt-2 text-sm text-[var(--text-secondary)]">{feedback}</p>}</section>
    <section className="grid gap-3"><h2 className="text-lg font-semibold">Liên kết đã tạo</h2>{query.isPending ? <LoadingState label="Đang tải lời mời" /> : query.isError ? <ErrorState title="Không thể tải lời mời" onRetry={() => void query.refetch()} /> : invitations.length === 0 ? <EmptyState title="Chưa có liên kết nào" description="Liên kết mới sẽ xuất hiện tại đây." /> : invitations.map((invitation) => <article key={invitation.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><div><p className="font-medium">{invitation.revokedAt ? "Đã thu hồi" : "Còn hiệu lực"}</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{invitation.useCount}/{invitation.maxUses} lượt · Hết hạn {new Date(invitation.expiresAt).toLocaleDateString("vi-VN")}</p></div>{!invitation.revokedAt && <Button variant="danger" size="small" isLoading={revoke.isPending} onClick={() => { if (window.confirm("Thu hồi liên kết này? Người khác sẽ không thể tham gia bằng liên kết.")) revoke.mutate(invitation.id) }}>Thu hồi</Button>}</article>)}</section>
    {revoke.isError && <p role="alert" className="text-sm text-[var(--danger)]">Không thể thu hồi liên kết. Bạn có thể không còn quyền quản lý nhóm.</p>}
  </section>
}
