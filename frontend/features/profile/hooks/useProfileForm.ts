"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ERROR_CODES, type ProfileDto } from "@linko/contracts"
import { ApiError } from "@/shared/http/ApiError"
import type { UpdateMineInput } from "../api/profile.api"
import { PROFILE_FORM_SCHEMA, type ProfileFormValues } from "../profile.schema"
import { useProfileImage } from "./useProfileImage"

/** Editable identity and submit dependencies supplied by the profile dialog. */
export interface ProfileFormOptions { readonly profile: ProfileDto; readonly isSaving: boolean; readonly saveError: unknown; readonly onSave: (input: UpdateMineInput) => void }

/** Own typed form validation and image previews independently of profile presentation. */
export function useProfileForm({ profile, isSaving, saveError, onSave }: ProfileFormOptions) {
  const form = useForm<ProfileFormValues>({ resolver: zodResolver(PROFILE_FORM_SCHEMA), defaultValues: { displayName: profile.displayName, username: profile.username, email: profile.email, bio: profile.bio ?? "" } })
  const avatar = useProfileImage(), background = useProfileImage()
  const imageError = avatar.error ?? background.error
  const onSubmit = form.handleSubmit((values) => { if (!imageError && !isSaving) onSave({ ...values, avatar: avatar.file, background: background.file }) })
  const errorMessage = saveError ? saveError instanceof ApiError && saveError.code !== ERROR_CODES.INTERNAL ? saveError.message : "Không thể lưu thay đổi. Vui lòng thử lại." : null
  return { register: form.register, errors: form.formState.errors, onSubmit, imageError, errorMessage, avatarPreview: avatar.preview ?? profile.avatarUrl, backgroundPreview: background.preview ?? profile.backgroundUrl, onAvatarChange: avatar.onChange, onBackgroundChange: background.onChange }
}
