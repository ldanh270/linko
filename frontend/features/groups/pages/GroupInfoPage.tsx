"use client"

import { ROLE } from "@linko/contracts"
import { Link } from "@/shared/components/Link"
import { Button } from "@/shared/components/Button"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"
import { useGroupInfoPage } from "../hooks/useGroupInfoPage"

/**
 * Render group profile details, member roster, pinned messages,
 * personal notification mute toggle, and group exit action. UI presentation only.
 */
export function GroupInfoPage() {
  const {
    conversationId,
    query,
    group,
    membersQuery,
    members,
    pins,
    isMuted,
    isMutePending,
    isMuteDisabled,
    toggleMute,
    isLeavePending,
    handleLeaveGroup,
    hasActionError,
  } = useGroupInfoPage()

  return (
    <section className="mx-auto grid max-w-3xl gap-6">
      <PageHeader
        eyebrow="Không gian nhóm"
        title="Thông tin nhóm"
        actions={
          <Link href={buildAppRoute(APP_ROUTES.GROUP_CONVERSATION, { conversationId })}>
            Quay lại chat
          </Link>
        }
      />

      {/* Group Info Card */}
      {query.isPending ? (
        <LoadingState label="Đang tải thông tin nhóm" />
      ) : query.isError || !group ? (
        <ErrorState title="Không thể mở thông tin nhóm" onRetry={() => void query.refetch()} />
      ) : (
        <article className="border border-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface)] shadow-[var(--shadow-panel)] p-4 sm:p-5">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{group.name}</h2>
          <p className="mt-2 text-[var(--text-secondary)]">
            {group.description || "Nhóm riêng tư"}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={buildAppRoute(APP_ROUTES.GROUP_MANAGE, { conversationId })}
              className="inline-flex items-center text-sm font-medium text-[var(--brand)] hover:underline"
            >
              Quản lý nhóm
            </Link>
            <Link
              href={buildAppRoute(APP_ROUTES.GROUP_INVITATIONS, { conversationId })}
              className="inline-flex items-center text-sm font-medium text-[var(--brand)] hover:underline"
            >
              Lời mời
            </Link>
          </div>
        </article>
      )}

      {/* Personal Notifications Card */}
      <article className="border border-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface)] shadow-[var(--shadow-panel)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">Thông báo</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Tùy chọn này chỉ áp dụng cho tài khoản của bạn.
            </p>
          </div>
          <Button
            variant="secondary"
            isLoading={isMutePending}
            disabled={isMuteDisabled}
            onClick={toggleMute}
          >
            {isMuted ? "Bật thông báo" : "Tắt thông báo"}
          </Button>
        </div>
      </article>

      {hasActionError && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          Không thể thực hiện thao tác. Có thể tư cách thành viên đã thay đổi.
        </p>
      )}

      {/* Group Members List */}
      <section className="grid gap-3">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          Thành viên {members.length ? `(${members.length})` : ""}
        </h2>
        {membersQuery.isPending ? (
          <LoadingState label="Đang tải thành viên" />
        ) : membersQuery.isError ? (
          <ErrorState
            title="Không thể tải thành viên"
            onRetry={() => void membersQuery.refetch()}
          />
        ) : (
          <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4">
            {members.map((member) => (
              <li key={member.userId} className="flex justify-between py-3">
                <span className="font-medium text-[var(--text-primary)]">
                  {member.displayName || "Thành viên"}
                </span>
                <span className="text-sm text-[var(--text-secondary)]">
                  {member.role === ROLE.OWNER
                    ? "Chủ nhóm"
                    : member.role === ROLE.ADMIN
                    ? "Quản trị viên"
                    : "Thành viên"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pinned Messages */}
      {pins.length > 0 && (
        <section className="grid gap-3">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Tin đã ghim</h2>
          {pins.map((message) => (
            <article
              key={message.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <p className="text-sm text-[var(--text-primary)]">
                {message.content || "Tệp đính kèm"}
              </p>
              <time className="mt-2 block text-xs text-[var(--text-secondary)]">
                {new Date(message.createdAt).toLocaleString("vi-VN")}
              </time>
            </article>
          ))}
        </section>
      )}

      {/* Danger Zone: Leave Group */}
      <section className="border-t border-[var(--border)] pt-5">
        <Button variant="danger" isLoading={isLeavePending} onClick={handleLeaveGroup}>
          Rời nhóm
        </Button>
      </section>
    </section>
  )
}
