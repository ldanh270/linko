"use client"

import { ROLE } from "@linko/contracts"
import { Button } from "@/shared/components/Button"
import { Input } from "@/shared/components/Input"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import { useGroupManagePage } from "../hooks/useGroupManagePage"

/**
 * Edit group details and manage membership within server-authorized roles.
 * Strictly presentation only; state and mutation coordination lives in useGroupManagePage.
 */
export function GroupManagePage() {
  const {
    query,
    group,
    membersQuery,
    members,
    name,
    setName,
    description,
    setDescription,
    isSaving,
    isUpdatingRole,
    isRemovingMember,
    isClosingGroup,
    handleSubmit,
    handleToggleRole,
    handleTransfer,
    handleRemove,
    handleClose,
    hasActionError,
  } = useGroupManagePage()

  if (query.isPending) return <LoadingState label="Đang tải nhóm" />
  if (query.isError || !group) {
    return <ErrorState title="Không thể mở phần quản lý nhóm" onRetry={() => void query.refetch()} />
  }

  return (
    <section className="mx-auto grid max-w-3xl gap-6">
      <PageHeader eyebrow="Quyền quản trị" title="Quản lý nhóm" />

      {/* General Settings Form */}
      <form onSubmit={handleSubmit} className="border border-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface)] shadow-[var(--shadow-panel)] grid gap-4 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Thông tin chung</h2>
        <Input
          id="manage-group-name"
          label="Tên nhóm"
          required
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <div className="grid gap-1.5">
          <label
            htmlFor="manage-group-description"
            className="text-sm font-medium text-[var(--text-primary)]"
          >
            Mô tả
          </label>
          <textarea
            id="manage-group-description"
            maxLength={500}
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text-primary)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
          />
        </div>
        <Button type="submit" isLoading={isSaving}>
          Lưu thông tin
        </Button>
      </form>

      {/* Members & Roles Roster */}
      <section className="grid gap-3">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          Thành viên và vai trò {members.length ? `(${members.length})` : ""}
        </h2>
        {membersQuery.isPending ? (
          <LoadingState label="Đang tải thành viên" />
        ) : membersQuery.isError ? (
          <ErrorState
            title="Không thể tải thành viên"
            onRetry={() => void membersQuery.refetch()}
          />
        ) : (
          members.map((member) => (
            <article
              key={member.userId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div>
                <p className="font-medium text-[var(--text-primary)]">
                  {member.displayName || "Thành viên"}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {member.role === ROLE.OWNER
                    ? "Chủ nhóm"
                    : member.role === ROLE.ADMIN
                    ? "Quản trị viên"
                    : "Thành viên"}
                </p>
              </div>
              {member.role !== ROLE.OWNER && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="small"
                    variant="secondary"
                    isLoading={isUpdatingRole}
                    onClick={() => handleToggleRole(member.userId, member.role)}
                  >
                    {member.role === ROLE.ADMIN ? "Hạ quyền" : "Cấp quyền quản trị"}
                  </Button>
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => handleTransfer(member.userId)}
                  >
                    Chuyển chủ nhóm
                  </Button>
                  <Button
                    size="small"
                    variant="danger"
                    isLoading={isRemovingMember}
                    onClick={() => handleRemove(member.userId)}
                  >
                    Xóa
                  </Button>
                </div>
              )}
            </article>
          ))
        )}
      </section>

      {hasActionError && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          Không thể thực hiện thao tác này. Kiểm tra quyền của bạn rồi thử lại.
        </p>
      )}

      {/* Danger Zone: Close Group */}
      <section className="border border-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface)] shadow-[var(--shadow-panel)] border-[var(--danger)]/40 p-5 sm:p-6">
        <h2 className="font-semibold text-[var(--danger)]">Đóng nhóm</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Thành viên sẽ không thể gửi tin hoặc dùng lời mời hiện có.
        </p>
        <Button
          className="mt-4"
          variant="danger"
          isLoading={isClosingGroup}
          onClick={handleClose}
        >
          Đóng nhóm
        </Button>
      </section>
    </section>
  )
}
