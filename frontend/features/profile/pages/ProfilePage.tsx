"use client"

import Image from "next/image"
import { USER_PROFILE_FIELDS } from "@linko/contracts"
import { Button } from "@/shared/components/Button"
import { Avatar } from "@/shared/components/Avatar"
import { Badge } from "@/shared/components/Badge"
import { Card, CardHeader, CardContent } from "@/shared/components/Card"
import { PresenceIndicator } from "@/shared/components/PresenceIndicator"
import { ProfilePageSkeleton } from "@/shared/components/Skeleton"
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
    return <ProfilePageSkeleton />
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
      <article className="border border-border rounded-panel bg-surface shadow-panel overflow-hidden">
        {/* Cover visual banner */}
        <div className="relative h-44 w-full bg-gradient-to-r from-brand/20 via-brand-soft to-surface-subtle border-b border-border overflow-hidden">
          {backgroundUrl ? (
            <Image
              src={backgroundUrl}
              alt="Ảnh bìa hồ sơ"
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 bg-radial from-transparent to-surface-subtle/40" />
          )}

          <button
            type="button"
            onClick={editor.onOpenEdit}
            className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-surface/85 px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition hover:bg-surface hover:shadow"
          >
            <Icon name={ICON_NAMES.IMAGE} />
            <span>Đổi ảnh bìa</span>
          </button>
        </div>

        {/* Identity row with overlapping avatar */}
        <div className="px-4 pb-4 pt-0 sm:px-5 sm:pb-5 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 mb-4">
            <div className="relative inline-block rounded-full ring-4 ring-surface shadow-md group">
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
              <Badge variant="brand" shape="pill">
                @{user[USER_PROFILE_FIELDS.USERNAME]}
              </Badge>
              <PresenceIndicator
                isOnline
                variant="badge"
                labelOnline="Đang trực tuyến"
              />
            </div>

            <p className="mt-2.5 text-sm text-text-secondary whitespace-pre-wrap max-w-2xl leading-relaxed">
              {user[USER_PROFILE_FIELDS.BIO] || "Chưa có giới thiệu tiểu sử cá nhân. Hãy thêm vài dòng giới thiệu bản thân nhé!"}
            </p>
          </div>
        </div>
      </article>

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Details */}
        <Card>
          <CardHeader
            title="Thông tin cá nhân & liên hệ"
            icon={<Icon name={ICON_NAMES.PROFILE} />}
            action={
              <Button size="small" variant="ghost" onClick={editor.onOpenEdit}>
                Sửa
              </Button>
            }
          />
          <CardContent>
            <ProfileAbout details={editor.details} />
          </CardContent>
        </Card>

        {/* Account & Security Summary */}
        <Card>
          <CardHeader
            title="Tài khoản & Trạng thái bảo mật"
            icon={<Icon name={ICON_NAMES.SETTINGS} />}
          />
          <CardContent>
            <dl className="grid gap-5 [overflow-wrap:anywhere] [&_dt]:text-xs [&_dt]:text-text-secondary [&_dt]:mb-1 [&_dd]:text-sm [&_dd]:text-text-primary">
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
                  <span className="inline-block h-2 w-2 rounded-full bg-positive" />
                  <span>Hoạt động bình thường</span>
                </dd>
              </div>
              <div>
                <dt>Phiên làm việc</dt>
                <dd>Được mã hóa & bảo vệ an toàn</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {editor.isEditing && <ProfileEditModal state={editor} onClose={editor.onCloseEdit} />}
    </section>
  )
}
