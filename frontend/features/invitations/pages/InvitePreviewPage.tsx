"use client"

import { Button } from "@/shared/components/Button"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { Link } from "@/shared/components/Link"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { APP_ROUTES } from "@/shared/layout/route.constants"
import { useInvitePreviewPage } from "../hooks/useInvitePreviewPage"

/**
 * Show only safe group details before accepting a private invitation.
 * Strictly presentation only; data fetching and mutation coordination lives in useInvitePreviewPage.
 */
export function InvitePreviewPage() {
  const {
    preview,
    isLoading,
    hasError,
    nextPath,
    isAccepting,
    hasAcceptError,
    handleAccept,
  } = useInvitePreviewPage()

  if (isLoading) {
    return (
      <main className="grid min-h-dvh place-items-center p-4">
        <div className="w-full max-w-md">
          <LoadingState label="Đang kiểm tra lời mời" />
        </div>
      </main>
    )
  }

  if (hasError || !preview) {
    return (
      <main className="grid min-h-dvh place-items-center p-4">
        <section className="grid w-full max-w-md gap-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
          <ErrorState title="Lời mời này không còn khả dụng" />
          <Link
            href={`${APP_ROUTES.LOGIN}?next=${encodeURIComponent(nextPath)}`}
            className="text-center text-sm font-medium text-[var(--brand)] hover:underline"
          >
            Đăng nhập để tiếp tục
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <section className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
          <Icon name={ICON_NAMES.GROUP} className="h-8 w-8" />
        </div>
        <p className="mt-5 text-sm font-semibold text-[var(--brand)]">
          Bạn được mời tham gia nhóm
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">
          {preview.groupName}
        </h1>
        {preview.groupDescription && (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            {preview.groupDescription}
          </p>
        )}
        <p className="mt-5 rounded-xl bg-[var(--surface-subtle)] p-4 text-xs text-[var(--text-secondary)] leading-relaxed">
          {preview.memberCount} thành viên · Bạn chỉ xem được tin nhắn từ khi tham gia.
        </p>
        <Button
          className="mt-6 w-full"
          isLoading={isAccepting}
          onClick={handleAccept}
        >
          Tham gia nhóm
        </Button>
        {hasAcceptError && (
          <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
            Không thể tham gia. Lời mời có thể đã hết hạn hoặc bị thu hồi.
          </p>
        )}
        <p className="mt-4 text-xs text-[var(--text-secondary)]">
          Chưa có tài khoản?{" "}
          <Link
            href={`/signup?next=${encodeURIComponent(nextPath)}`}
            className="font-medium text-[var(--brand)] hover:underline"
          >
            Đăng ký
          </Link>
        </p>
      </section>
    </main>
  )
}
