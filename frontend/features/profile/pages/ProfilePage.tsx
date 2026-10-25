"use client"

import { USER_PROFILE_FIELDS } from "@linko/contracts"
import { Button } from "@/shared/components/Button"
import { Avatar } from "@/shared/components/Avatar"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { useProfileEditor } from "../hooks/useProfileEditor"
import { ProfileAbout } from "../components/ProfileAbout"
import { ProfileEditModal } from "../components/ProfileEditModal/ProfileEditModal"

/** Render the full-page profile with clean personal information and edit actions. UI only. */
export function ProfilePage() {
  const state = useProfileEditor()
  const user = state.query.data

  if (state.query.isPending) {
    return <LoadingState label="Đang tải hồ sơ của bạn..." />
  }

  if (state.query.isError || !user) {
    return <ErrorState title="Không thể tải hồ sơ" onRetry={state.onRetry} />
  }

  return (
    <section className="mx-auto grid max-w-4xl gap-6">
      <PageHeader
        eyebrow="Tài khoản cá nhân"
        title="Hồ sơ của tôi"
        description="Quản lý thông tin định danh, giới thiệu và thông tin cá nhân của bạn trên Linko."
        actions={
          <Button variant="secondary" onClick={state.onOpenEdit}>
            <Icon name={ICON_NAMES.EDIT} /> Chỉnh sửa hồ sơ
          </Button>
        }
      />

      {/* Main Identity Banner Card */}
      <article className="surface-panel overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-[var(--brand)]/20 via-[var(--brand-soft)] to-[var(--surface-subtle)] border-b border-[var(--border)] relative" />
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 mb-4">
            <div className="relative inline-block rounded-full ring-4 ring-[var(--surface)] shadow-md">
              <Avatar label={user[USER_PROFILE_FIELDS.DISPLAY_NAME]} src={user[USER_PROFILE_FIELDS.AVATAR_URL]} size="large" />
            </div>
            <div className="flex gap-2">
              <Button size="small" variant="secondary" onClick={state.onOpenEdit}>
                <Icon name={ICON_NAMES.EDIT} /> Chỉnh sửa
              </Button>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold">{user[USER_PROFILE_FIELDS.DISPLAY_NAME]}</h2>
              <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--brand)]">
                @{user[USER_PROFILE_FIELDS.USERNAME]}
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
              {user[USER_PROFILE_FIELDS.BIO] || "Chưa có giới thiệu tiểu sử."}
            </p>
          </div>
        </div>
      </article>

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Details */}
        <article className="surface-panel p-6">
          <div className="flex items-center gap-2 mb-4 text-base font-semibold border-b border-[var(--border)] pb-3">
            <Icon name={ICON_NAMES.PROFILE} />
            <span>Thông tin cá nhân</span>
          </div>
          <ProfileAbout details={state.details} />
        </article>

        {/* Account & Security Summary */}
        <article className="surface-panel p-6">
          <div className="flex items-center gap-2 mb-4 text-base font-semibold border-b border-[var(--border)] pb-3">
            <Icon name={ICON_NAMES.SETTINGS} />
            <span>Tài khoản & Trạng thái</span>
          </div>
          <dl className="profile-details">
            <div>
              <dt>Tên người dùng</dt>
              <dd>@{user[USER_PROFILE_FIELDS.USERNAME]}</dd>
            </div>
            <div>
              <dt>Trạng thái</dt>
              <dd className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-[var(--positive)]" />
                <span>Đang hoạt động</span>
              </dd>
            </div>
            <div>
              <dt>Bảo mật phiên</dt>
              <dd>Được xác thực an toàn</dd>
            </div>
          </dl>
        </article>
      </div>

      {state.isEditing && <ProfileEditModal state={state} onClose={state.onCloseEdit} />}
    </section>
  )
}
