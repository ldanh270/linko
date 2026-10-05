"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { ApiError } from "@/shared/http/ApiError"
import { previewInvitation, acceptInvitation } from "../api/invitations.api"
import { Button } from "@/shared/components/Button"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { Link } from "@/shared/components/Link"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"

/** Show only safe group details before accepting a private invitation. */
export function InvitePreviewPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const token = params.token
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewInvitation>> | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [hasError, setError] = useState(false)
  useEffect(() => {
    let isActive = true
    void previewInvitation(token).then((result) => { if (isActive) setPreview(result) }).catch(() => { if (isActive) setError(true) }).finally(() => { if (isActive) setLoading(false) })
    return () => { isActive = false }
  }, [token])
  const nextPath = buildAppRoute(APP_ROUTES.INVITATION, { token })
  const accept = useMutation({
    mutationFn: () => acceptInvitation(token),
    onSuccess: (group) => router.replace(buildAppRoute(APP_ROUTES.GROUP_CONVERSATION, { conversationId: group.id })),
    onError: (error) => { if (error instanceof ApiError && error.status === 401) router.replace(`${APP_ROUTES.LOGIN}?next=${encodeURIComponent(nextPath)}`) },
  })
  if (isLoading) return <main className="grid min-h-dvh place-items-center p-4"><div className="w-full max-w-md"><LoadingState label="Đang kiểm tra lời mời" /></div></main>
  if (hasError || !preview) return <main className="grid min-h-dvh place-items-center p-4"><section className="grid w-full max-w-md gap-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8"><ErrorState title="Lời mời này không còn khả dụng" /><Link href={`${APP_ROUTES.LOGIN}?next=${encodeURIComponent(nextPath)}`} className="text-center">Đăng nhập để tiếp tục</Link></section></main>
  return <main className="grid min-h-dvh place-items-center p-4"><section className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[var(--brand-soft)] text-2xl text-[var(--brand)]">✦</div><p className="mt-5 text-sm font-semibold text-[var(--brand)]">Bạn được mời tham gia nhóm</p><h1 className="mt-2 text-3xl font-bold">{preview.groupName}</h1>{preview.groupDescription && <p className="mt-3 text-[var(--text-secondary)]">{preview.groupDescription}</p>}<p className="mt-5 rounded-xl bg-[var(--surface-subtle)] p-4 text-sm">{preview.memberCount} thành viên · Bạn chỉ xem được tin nhắn từ khi tham gia.</p><Button className="mt-6 w-full" isLoading={accept.isPending} onClick={() => accept.mutate()}>Tham gia nhóm</Button>{accept.isError && <p role="alert" className="mt-3 text-sm text-[var(--danger)]">Không thể tham gia. Lời mời có thể đã hết hạn hoặc bị thu hồi.</p>}<p className="mt-4 text-sm text-[var(--text-secondary)]">Chưa có tài khoản? <Link href={`/signup?next=${encodeURIComponent(nextPath)}`}>Đăng ký</Link></p></section></main>
}
