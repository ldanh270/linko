"use client"

import Image from "next/image"
import { USER_PROFILE_FIELDS, USER_PROFILE_IMAGE_TYPES, USER_PROFILE_TEXT_LIMITS, type ProfileDto } from "@linko/contracts"
import type { UpdateMineInput } from "../api/profile.api"
import { Button } from "@/shared/components/Button"
import { Input } from "@/shared/components/Input"
import { Avatar } from "@/shared/components/Avatar"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { useProfileForm } from "../hooks/useProfileForm"

/** Persisted identity and mutation status supplied by the profile editor. */
export interface ProfileFormProps {
  readonly profile: ProfileDto
  readonly isSaving: boolean
  readonly isSaved: boolean
  readonly saveError: unknown
  readonly onSave: (input: UpdateMineInput) => void
}

/** Render validated profile fields and supported image previews. UI only. */
export function ProfileForm(props: ProfileFormProps) {
  const state = useProfileForm(props)
  const currentBio = state.watch(USER_PROFILE_FIELDS.BIO) ?? ""

  return (
    <form onSubmit={state.onSubmit} className="grid gap-6" noValidate>
      {/* Cover and Avatar Visual Area */}
      <div className="relative rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] overflow-hidden">
        {/* Cover Preview */}
        <div className="relative h-28 w-full bg-gradient-to-r from-[var(--brand)]/20 via-[var(--brand-soft)] to-[var(--surface-subtle)] flex items-center justify-center overflow-hidden">
          {state.backgroundPreview ? (
            <Image
              src={state.backgroundPreview}
              alt="Ảnh bìa xem trước"
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="text-xs font-medium text-[var(--text-secondary)]">Chưa có ảnh bìa tùy chỉnh</span>
          )}

          <label
            htmlFor="profile-bg-upload"
            className="absolute bottom-2 right-2 flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--surface)]/90 px-2.5 py-1 text-xs font-semibold shadow backdrop-blur transition hover:bg-[var(--surface)]"
          >
            <Icon name={ICON_NAMES.IMAGE} />
            <span>Đổi ảnh bìa</span>
            <input
              id="profile-bg-upload"
              type="file"
              accept={USER_PROFILE_IMAGE_TYPES.join(",")}
              onChange={state.onBackgroundChange}
              className="sr-only"
            />
          </label>
        </div>

        {/* Avatar Preview */}
        <div className="px-5 pb-4 pt-0">
          <div className="flex items-end justify-between -mt-10 gap-3">
            <div className="relative inline-block rounded-full ring-4 ring-[var(--surface)]">
              <Avatar
                label={props.profile.displayName}
                src={state.avatarPreview}
                size="large"
              />
              <label
                htmlFor="profile-avatar-upload"
                title="Đổi ảnh đại diện"
                className="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-[var(--brand)] text-white shadow hover:opacity-90 transition"
              >
                <Icon name={ICON_NAMES.EDIT} />
                <input
                  id="profile-avatar-upload"
                  type="file"
                  accept={USER_PROFILE_IMAGE_TYPES.join(",")}
                  onChange={state.onAvatarChange}
                  className="sr-only"
                />
              </label>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-1">
              Hỗ trợ JPG, PNG, WEBP tối đa 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* Main Information Inputs */}
      <fieldset disabled={props.isSaving} className="grid gap-4 sm:grid-cols-2">
        <Input
          id={USER_PROFILE_FIELDS.DISPLAY_NAME}
          label="Tên hiển thị"
          required
          {...state.register(USER_PROFILE_FIELDS.DISPLAY_NAME)}
          error={state.errors.displayName?.message}
          maxLength={USER_PROFILE_TEXT_LIMITS.MAX_DISPLAY_NAME}
        />

        <Input
          id={USER_PROFILE_FIELDS.USERNAME}
          label="Tên người dùng (Username)"
          required
          {...state.register(USER_PROFILE_FIELDS.USERNAME)}
          error={state.errors.username?.message}
          maxLength={USER_PROFILE_TEXT_LIMITS.MAX_USERNAME}
        />

        <Input
          id={USER_PROFILE_FIELDS.EMAIL}
          label="Địa chỉ Email"
          type="email"
          required
          {...state.register(USER_PROFILE_FIELDS.EMAIL)}
          error={state.errors.email?.message}
        />

        <Input
          id={USER_PROFILE_FIELDS.PHONE}
          label="Số điện thoại"
          type="tel"
          placeholder="Ví dụ: 0912345678"
          {...state.register(USER_PROFILE_FIELDS.PHONE)}
          error={state.errors.phone?.message}
        />

        <div className="grid gap-1.5 sm:col-span-2">
          <div className="flex justify-between items-center text-sm font-medium">
            <label htmlFor={USER_PROFILE_FIELDS.BIO}>Tiểu sử / Giới thiệu</label>
            <span className="text-xs text-[var(--text-secondary)]">
              {currentBio.length} / {USER_PROFILE_TEXT_LIMITS.MAX_BIO}
            </span>
          </div>
          <textarea
            id={USER_PROFILE_FIELDS.BIO}
            {...state.register(USER_PROFILE_FIELDS.BIO)}
            maxLength={USER_PROFILE_TEXT_LIMITS.MAX_BIO}
            rows={3}
            placeholder="Chia sẻ đôi điều về bạn..."
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-sm focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
          />
          {state.errors.bio?.message && (
            <p role="alert" className="text-xs text-[var(--danger)]">{state.errors.bio.message}</p>
          )}
        </div>
      </fieldset>

      {/* Status & Feedback */}
      {state.imageError && <p role="alert" className="text-sm font-medium text-[var(--danger)]">{state.imageError}</p>}
      {state.errorMessage && <p role="alert" className="text-sm font-medium text-[var(--danger)]">{state.errorMessage}</p>}
      {props.isSaved && (
        <p role="status" className="flex items-center gap-1.5 text-sm font-medium text-[var(--positive)]">
          <Icon name={ICON_NAMES.CHECK} className="h-4 w-4 shrink-0" />
          <span>Đã lưu thay đổi hồ sơ thành công.</span>
        </p>
      )}

      <Button type="submit" isLoading={props.isSaving} disabled={Boolean(state.imageError)}>
        Lưu thay đổi hồ sơ
      </Button>
    </form>
  )
}
