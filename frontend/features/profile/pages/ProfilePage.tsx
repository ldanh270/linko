"use client"

import Image from "next/image"
import { USER_PROFILE_FIELDS } from "@linko/contracts"
import { Button } from "@/shared/components/Button"
import { Avatar } from "@/shared/components/Avatar"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { PageHeader } from "@/shared/components/PageHeader"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { useUserProfile } from "../hooks/useUserProfile"
import { ProfileAbout } from "../components/ProfileAbout"
import { ProfileEditModal } from "../components/ProfileEditModal/ProfileEditModal"
import { PublicProfileView } from "../components/PublicProfileView"

export interface ProfilePageProps {
  readonly userId?: string
}

/** Render either own profile editor or another user's public profile. UI only. */
export function ProfilePage({ userId }: ProfilePageProps = {}) {
  const state = useUserProfile(userId)

  if (state.isLoading) {
    return <LoadingState label="Đang tải hồ sơ..." />
  }

  if (state.isError || !state.user) {
    return <ErrorState title="Không thể tải hồ sơ" onRetry={state.onRetry} />
  }

  if (!state.isOwnProfile) {
    return <PublicProfileView state={state} />
  }

  const editor = state.editor
  const user = state.user
  const backgroundUrl = user[USER_PROFILE_FIELDS.BACKGROUND_URL]

  return (
    <section className="mx-auto grid max-w-4xl gap-6">
      <PageHeader
        eyebrow="Tài khoản cá nhân"
        title="Hồ sơ của tôi"
        description="Quản lý thông tin định danh, giới thiệu và thông tin cá nhân của bạn trên Linko."
        actions={
          <Button variant="secondary" onClick={editor.onOpenEdit}>
            <Icon name={ICON_NAMES.EDIT} /> Chỉnh sửa hồ sơ
          </Button>
        }
      />

      {/* Main Identity Banner Card */}
      <article className="surface-panel overflow-hidden">
        {/* Cover visual banner */}
        <div className="relative h-44 w-full bg-gradient-to-r from-[var(--brand)]/20 via-[var(--brand-soft)] to-[var(--surface-subtle)] border-b border-[var(--border)] overflow-hidden">
          {backgroundUrl ? (
            <Image
              src={backgroundUrl}
              alt="Ảnh bìa hồ sơ"
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 bg-radial from-transparent to-[var(--surface-subtle)]/40" />
          )}

          <button
            type="button"
            onClick={editor.onOpenEdit}
            className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-[var(--surface)]/85 px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition hover:bg-[var(--surface)] hover:shadow"
          >
            <Icon name={ICON_NAMES.IMAGE} />
            <span>Đổi ảnh bìa</span>
          </button>
        </div>

        {/* Identity row with overlapping avatar */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 mb-4">
            <div className="relative inline-block rounded-full ring-4 ring-[var(--surface)] shadow-md group">
              <Avatar
                label={user[USER_PROFILE_FIELDS.DISPLAY_NAME]}
                src={user[USER_PROFILE_FIELDS.AVATAR_URL]}
                size="large"
              />
              <button
                type="button"
                onClick={editor.onOpenEdit}
                title="Đổi ảnh đại diện"
                className="absolute inset-0 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition backdrop-blur-xs"
              >
                <Icon name={ICON_NAMES.EDIT} />
              </button>
            </div>

            <div className="flex gap-2">
              <Button size="small" variant="secondary" onClick={editor.onOpenEdit}>
                <Icon name={ICON_NAMES.EDIT} /> Chỉnh sửa thông tin
              </Button>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl font-bold">{user[USER_PROFILE_FIELDS.DISPLAY_NAME]}</h2>
              <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--brand)]">
                @{user[USER_PROFILE_FIELDS.USERNAME]}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--positive)]/30 bg-[var(--positive)]/10 px-2 py-0.5 text-xs font-medium text-[var(--positive)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--positive)]" />
                Đang trực tuyến
              </span>
            </div>

            <p className="mt-2.5 text-sm text-[var(--text-secondary)] whitespace-pre-wrap max-w-2xl leading-relaxed">
              {user[USER_PROFILE_FIELDS.BIO] || "Chưa có giới thiệu tiểu sử cá nhân. Hãy thêm vài dòng giới thiệu bản thân nhé!"}
            </p>
          </div>
        </div>
      </article>

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Details */}
        <article className="surface-panel p-6">
          <div className="flex items-center justify-between gap-2 mb-4 border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2 text-base font-semibold">
              <Icon name={ICON_NAMES.PROFILE} />
              <span>Thông tin cá nhân & liên hệ</span>
            </div>
            <Button size="small" variant="ghost" onClick={editor.onOpenEdit}>
              Sửa
            </Button>
          </div>
          <ProfileAbout details={editor.details} />
        </article>

        {/* Account & Security Summary */}
        <article className="surface-panel p-6">
          <div className="flex items-center gap-2 mb-4 text-base font-semibold border-b border-[var(--border)] pb-3">
            <Icon name={ICON_NAMES.SETTINGS} />
            <span>Tài khoản & Trạng thái bảo mật</span>
          </div>
          <dl className="profile-details">
            <div>
              <dt>Tên người dùng</dt>
              <dd>@{user[USER_PROFILE_FIELDS.USERNAME]}</dd>
            </div>
            <div>
              <dt>Email đăng ký</dt>
              <dd>{user[USER_PROFILE_FIELDS.EMAIL]}</dd>
            </div>
            <div>
              <dt>Trạng thái tài khoản</dt>
              <dd className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-[var(--positive)]" />
                <span>Hoạt động bình thường</span>
              </dd>
            </div>
            <div>
              <dt>Phiên làm việc</dt>
              <dd>Được mã hóa & bảo vệ an toàn</dd>
            </div>
          </dl>
        </article>
      </div>

      {editor.isEditing && <ProfileEditModal state={editor} onClose={editor.onCloseEdit} />}
    </section>
  )
}
