"use client"

import { useEffect, useState, type FormEvent } from "react"
import Image from "next/image"
import type { ProfileDto } from "@linko/contracts"
import type { UpdateMineInput } from "../api/profile.api"
import { USER_PROFILE_LIMITS } from "@linko/contracts"
import { ApiError } from "@/shared/http/ApiError"
import { Button } from "@/shared/components/Button"
import { Input } from "@/shared/components/Input"

/** Form props keep persisted profile data separate from local edits. */
export interface ProfileFormProps {
  readonly profile: ProfileDto
  readonly isSaving: boolean
  readonly isSaved: boolean
  readonly saveError: unknown
  onSave(input: UpdateMineInput): void
}

/** Edit profile text and preview valid image files before saving. */
export function ProfileForm({ profile, isSaving, isSaved, saveError, onSave }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [username, setUsername] = useState(profile.username)
  const [email, setEmail] = useState(profile.email)
  const [bio, setBio] = useState(profile.bio ?? "")
  const [avatar, setAvatar] = useState<File | undefined>()
  const [background, setBackground] = useState<File | undefined>()
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview) }, [avatarPreview])
  useEffect(() => () => { if (backgroundPreview) URL.revokeObjectURL(backgroundPreview) }, [backgroundPreview])
  const selectImage = (file: File | undefined, kind: "avatar" | "background") => {
    if (file && (!file.type.startsWith("image/") || file.size > USER_PROFILE_LIMITS.MAX_IMAGE_SIZE_BYTES)) { setImageError("Chọn ảnh hợp lệ có dung lượng tối đa 10 MiB."); return }
    setImageError(null)
    if (kind === "avatar") { setAvatar(file); setAvatarPreview(file ? URL.createObjectURL(file) : null) }
    else { setBackground(file); setBackgroundPreview(file ? URL.createObjectURL(file) : null) }
  }
  const onSubmit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!imageError) onSave({ displayName, username, email, bio, avatar, background }) }
  return <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)]"><div className="h-40 bg-[var(--brand-soft)] bg-cover bg-center" style={{ backgroundImage: backgroundPreview ? `url(${backgroundPreview})` : profile.backgroundUrl ? `url(${profile.backgroundUrl})` : undefined }} /><div className="-mt-12 px-6"><Image src={avatarPreview ?? profile.avatarUrl ?? "/file.svg"} alt="Ảnh đại diện" width={96} height={96} unoptimized className="h-24 w-24 rounded-3xl border-4 border-[var(--surface)] bg-[var(--surface)] object-cover" /></div>
    <form onSubmit={onSubmit} className="grid gap-5 p-6 sm:grid-cols-2"><Input id="display-name" label="Tên hiển thị" required maxLength={80} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /><Input id="username" label="Tên đăng nhập" required value={username} onChange={(event) => setUsername(event.target.value)} /><Input id="email" label="Email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      <div className="grid gap-1.5"><label htmlFor="bio" className="text-sm font-medium">Giới thiệu</label><textarea id="bio" maxLength={500} rows={3} value={bio} onChange={(event) => setBio(event.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 focus-visible:outline-2 focus-visible:outline-[var(--brand)]" /></div>
      <div className="grid gap-1.5"><label htmlFor="avatar" className="text-sm font-medium">Ảnh đại diện</label><input id="avatar" type="file" accept="image/*" onChange={(event) => selectImage(event.target.files?.[0], "avatar")} /></div><div className="grid gap-1.5"><label htmlFor="background" className="text-sm font-medium">Ảnh nền</label><input id="background" type="file" accept="image/*" onChange={(event) => selectImage(event.target.files?.[0], "background")} /></div>
      {imageError && <p role="alert" className="text-sm text-[var(--danger)] sm:col-span-2">{imageError}</p>}{saveError !== null && saveError !== undefined && <p role="alert" className="text-sm text-[var(--danger)] sm:col-span-2">{saveError instanceof ApiError ? saveError.message : "Không thể lưu thay đổi."}</p>}{isSaved && <p role="status" className="text-sm text-[var(--positive)] sm:col-span-2">Đã lưu hồ sơ.</p>}<div className="sm:col-span-2"><Button type="submit" isLoading={isSaving} disabled={Boolean(imageError)}>Lưu thay đổi</Button></div></form></div>
}
