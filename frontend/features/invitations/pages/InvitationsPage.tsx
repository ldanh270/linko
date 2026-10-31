"use client"

import { Button } from "@/shared/components/Button"
import { LoadingState } from "@/shared/components/LoadingState"
import { EmptyState } from "@/shared/components/EmptyState"
import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import { useInvitationsPage } from "../hooks/useInvitationsPage"

/**
 * Render group invitation dashboard with link generation, clipboard copying,
 * and access revocation. UI presentation only.
 */
export function InvitationsPage() {
  const {
    query,
    invitations,
    issuedUrl,
    feedback,
    isIssuing,
    isRevoking,
    hasIssueError,
    hasRevokeError,
    handleIssue,
    handleCopy,
    handleRevoke,
  } = useInvitationsPage()

  return (
    <section className="mx-auto grid max-w-3xl gap-6">
      <PageHeader
        eyebrow="Quản lý thành viên"
        title="Lời mời nhóm"
        description="Người có liên kết có thể chuyển tiếp lời mời này."
      />

      {/* Generate Invitation Section */}
      <section className="border border-border rounded-panel bg-surface shadow-panel p-4 sm:p-5">
        <h2 className="font-semibold text-text-primary">Tạo liên kết mới</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Liên kết có thời hạn và số lượt tham gia giới hạn.
        </p>
        <Button className="mt-4" isLoading={isIssuing} onClick={handleIssue}>
          Tạo lời mời
        </Button>

        {hasIssueError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            Bạn không có quyền tạo lời mời hoặc đã có lỗi xảy ra.
          </p>
        )}

        {issuedUrl && (
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="sr-only" htmlFor="issued-link">
              Liên kết lời mời
            </label>
            <input
              id="issued-link"
              readOnly
              value={issuedUrl}
              className="min-h-11 min-w-0 rounded-lg border border-border bg-surface-subtle px-3 text-sm text-text-primary"
            />
            <Button variant="secondary" onClick={() => void handleCopy()}>
              Sao chép
            </Button>
          </div>
        )}

        {feedback && (
          <p role="status" className="mt-2 text-sm text-text-secondary">
            {feedback}
          </p>
        )}
      </section>

      {/* Generated Invitations List */}
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold text-text-primary">Liên kết đã tạo</h2>
        {query.isPending ? (
          <LoadingState label="Đang tải lời mời" />
        ) : query.isError ? (
          <ErrorState title="Không thể tải lời mời" onRetry={() => void query.refetch()} />
        ) : invitations.length === 0 ? (
          <EmptyState
            title="Chưa có liên kết nào"
            description="Liên kết mới sẽ xuất hiện tại đây."
          />
        ) : (
          invitations.map((invitation) => (
            <article
              key={invitation.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4"
            >
              <div>
                <p className="font-medium text-text-primary">
                  {invitation.revokedAt ? "Đã thu hồi" : "Còn hiệu lực"}
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {invitation.useCount}/{invitation.maxUses} lượt · Hết hạn{" "}
                  {new Date(invitation.expiresAt).toLocaleDateString("vi-VN")}
                </p>
              </div>
              {!invitation.revokedAt && (
                <Button
                  variant="danger"
                  size="small"
                  isLoading={isRevoking}
                  onClick={() => handleRevoke(invitation.id)}
                >
                  Thu hồi
                </Button>
              )}
            </article>
          ))
        )}
      </section>

      {hasRevokeError && (
        <p role="alert" className="text-sm text-danger">
          Không thể thu hồi liên kết. Bạn có thể không còn quyền quản lý nhóm.
        </p>
      )}
    </section>
  )
}
