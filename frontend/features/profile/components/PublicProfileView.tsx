"use client"

import Image from "next/image"
import { USER_PROFILE_FIELDS } from "@linko/contracts"
import { Button } from "@/shared/components/Button"
import { Avatar } from "@/shared/components/Avatar"
import { Badge } from "@/shared/components/Badge"
import { Card, CardHeader, CardContent } from "@/shared/components/Card"
import { PresenceIndicator } from "@/shared/components/PresenceIndicator"
import { PageHeader } from "@/shared/components/PageHeader"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import type { OtherUserProfileState } from "../hooks/useUserProfile"

export interface PublicProfileViewProps {
  readonly state: OtherUserProfileState
}

/** Render public user profile with identity info and social actions. UI only. */
export function PublicProfileView({ state }: PublicProfileViewProps) {
  const user = state.user
  if (!user) return null

  const backgroundUrl = user[USER_PROFILE_FIELDS.BACKGROUND_URL]

  return (
    <section className="mx-auto grid max-w-4xl gap-6">
      <PageHeader
        eyebrow="Hồ sơ người dùng"
        title={user[USER_PROFILE_FIELDS.DISPLAY_NAME]}
        description={`Trang cá nhân của @${user[USER_PROFILE_FIELDS.USERNAME]} trên Linko.`}
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={state.onOpenChat} disabled={state.isChatPending}>
              <Icon name={ICON_NAMES.CHAT} />
              <span>Nhắn tin</span>
            </Button>
            {state.isFriend ? (
              <Button variant="secondary" disabled>
                <Icon name={ICON_NAMES.CONTACTS} />
                <span>Bạn bè</span>
              </Button>
            ) : state.isRequested ? (
              <Button variant="secondary" disabled>
                <Icon name={ICON_NAMES.CHECK} />
                <span>Đã gửi lời mời</span>
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={state.onRequestFriend}
                disabled={state.isRequestPending}
              >
                <Icon name={ICON_NAMES.ADD_CONTACT} />
                <span>Thêm bạn</span>
              </Button>
            )}
          </div>
        }
      />

      <article className="border border-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface)] shadow-[var(--shadow-panel)] overflow-hidden">
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
        </div>

        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 mb-4">
            <div className="relative inline-block rounded-full ring-4 ring-[var(--surface)] shadow-md">
              <Avatar
                label={user[USER_PROFILE_FIELDS.DISPLAY_NAME]}
                src={user[USER_PROFILE_FIELDS.AVATAR_URL]}
                size="large"
                isOnline={state.isOnline}
              />
            </div>

            <div className="flex gap-2">
              <Button size="small" onClick={state.onOpenChat} disabled={state.isChatPending}>
                <Icon name={ICON_NAMES.CHAT} /> Nhắn tin
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
                isOnline={state.isOnline}
                variant="badge"
                labelOnline="Đang trực tuyến"
                labelOffline="Ngoại tuyến"
              />
            </div>

            <p className="mt-2.5 text-sm text-[var(--text-secondary)] whitespace-pre-wrap max-w-2xl leading-relaxed">
              {user[USER_PROFILE_FIELDS.BIO] || "Người dùng này chưa thêm phần giới thiệu tiểu sử."}
            </p>
          </div>
        </div>
      </article>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Thông tin người dùng" icon={<Icon name={ICON_NAMES.PROFILE} />} />
          <CardContent>
            <dl className="grid gap-5 [overflow-wrap:anywhere] [&_dt]:text-xs [&_dt]:text-[var(--text-secondary)] [&_dt]:mb-1 [&_dd]:text-sm [&_dd]:text-[var(--text-primary)]">
              <div>
                <dt>Tên hiển thị</dt>
                <dd>{user[USER_PROFILE_FIELDS.DISPLAY_NAME]}</dd>
              </div>
              <div>
                <dt>Tên người dùng</dt>
                <dd>@{user[USER_PROFILE_FIELDS.USERNAME]}</dd>
              </div>
              <div>
                <dt>Trạng thái</dt>
                <dd>
                  <PresenceIndicator
                    isOnline={state.isOnline}
                    variant="text"
                    labelOnline="Đang trực tuyến"
                    labelOffline="Ngoại tuyến"
                  />
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Mối quan hệ & Kết nối" icon={<Icon name={ICON_NAMES.CONTACTS} />} />
          <CardContent>
            <dl className="grid gap-5 [overflow-wrap:anywhere] [&_dt]:text-xs [&_dt]:text-[var(--text-secondary)] [&_dt]:mb-1 [&_dd]:text-sm [&_dd]:text-[var(--text-primary)]">
              <div>
                <dt>Quan hệ kết nối</dt>
                <dd>
                  {state.isFriend
                    ? "Bạn bè"
                    : state.isRequested
                      ? "Đã gửi lời mời kết bạn"
                      : "Chưa kết bạn"}
                </dd>
              </div>
              <div>
                <dt>Trò chuyện</dt>
                <dd>Hỗ trợ nhắn tin trực tiếp và gửi tệp tin</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
