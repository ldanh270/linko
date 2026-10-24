"use client"

import Image from "next/image"
import { USER_PROFILE_FIELDS, USER_PROFILE_IMAGE_TYPES, USER_PROFILE_TEXT_LIMITS, type ProfileDto } from "@linko/contracts"
import type { UpdateMineInput } from "../api/profile.api"
import { Button } from "@/shared/components/Button"
import { Input } from "@/shared/components/Input"
import { Avatar } from "@/shared/components/Avatar"
import { useProfileForm } from "../hooks/useProfileForm"

/** Persisted identity and mutation status supplied by the profile editor. */
export interface ProfileFormProps {
  readonly profile: ProfileDto; readonly isSaving: boolean; readonly isSaved: boolean
  readonly saveError: unknown; readonly onSave: (input: UpdateMineInput) => void
}

/** Render validated profile fields and supported image previews. UI only; logic lives in useProfileForm. */
export function ProfileForm(props: ProfileFormProps) {
  const state = useProfileForm(props)
  return <form onSubmit={state.onSubmit} className="grid gap-5" noValidate>
    <div className="profile-edit-cover">{state.backgroundPreview && <Image src={state.backgroundPreview} alt="Ảnh nền xem trước" width={520} height={120} unoptimized />}</div>
    <Avatar label={props.profile.displayName} src={state.avatarPreview} size="large" />
    <fieldset disabled={props.isSaving} className="grid gap-4 sm:grid-cols-2">
      <Input id={USER_PROFILE_FIELDS.DISPLAY_NAME} label="Tên hiển thị" {...state.register(USER_PROFILE_FIELDS.DISPLAY_NAME)} error={state.errors.displayName?.message} maxLength={USER_PROFILE_TEXT_LIMITS.MAX_DISPLAY_NAME} />
      <Input id={USER_PROFILE_FIELDS.USERNAME} label="Tên đăng nhập" {...state.register(USER_PROFILE_FIELDS.USERNAME)} error={state.errors.username?.message} />
      <Input id={USER_PROFILE_FIELDS.EMAIL} label="Email" type="email" {...state.register(USER_PROFILE_FIELDS.EMAIL)} error={state.errors.email?.message} />
      <div className="grid gap-1.5"><label htmlFor={USER_PROFILE_FIELDS.BIO}>Giới thiệu</label><textarea id={USER_PROFILE_FIELDS.BIO} {...state.register(USER_PROFILE_FIELDS.BIO)} maxLength={USER_PROFILE_TEXT_LIMITS.MAX_BIO} rows={3} className="rounded border border-[var(--border)] bg-[var(--surface-subtle)] p-3 focus-visible:outline-2 focus-visible:outline-[var(--brand)]" /></div>
      <div className="grid gap-2 text-sm"><label htmlFor={USER_PROFILE_FIELDS.AVATAR}>Ảnh đại diện</label><input id={USER_PROFILE_FIELDS.AVATAR} type="file" accept={USER_PROFILE_IMAGE_TYPES.join(",")} onChange={state.onAvatarChange} /></div>
      <div className="grid gap-2 text-sm"><label htmlFor={USER_PROFILE_FIELDS.BACKGROUND}>Ảnh nền</label><input id={USER_PROFILE_FIELDS.BACKGROUND} type="file" accept={USER_PROFILE_IMAGE_TYPES.join(",")} onChange={state.onBackgroundChange} /></div>
    </fieldset>
    {state.imageError && <p role="alert" className="composer-error">{state.imageError}</p>}
    {state.errorMessage && <p role="alert" className="composer-error">{state.errorMessage}</p>}
    {props.isSaved && <p role="status" className="text-sm text-[var(--positive)]">Đã lưu hồ sơ.</p>}
    <Button type="submit" isLoading={props.isSaving} disabled={Boolean(state.imageError)}>Lưu thay đổi</Button>
  </form>
}
