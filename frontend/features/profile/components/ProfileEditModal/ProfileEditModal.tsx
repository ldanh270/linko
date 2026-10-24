"use client"

import { Modal } from "@/shared/components/Modal/Modal"
import { ProfileForm } from "../ProfileForm"
import type { useProfilePage } from "../../hooks/useProfilePage"

/** Persisted profile state and controlled dialog dismissal. */
export interface ProfileEditModalProps { readonly state: ReturnType<typeof useProfilePage>; readonly onClose: () => void }

/** Render the existing profile editor as its own focused dialog. UI only. */
export function ProfileEditModal({ state, onClose }: ProfileEditModalProps) {
  if (!state.query.data) return null
  return <Modal title="Chỉnh sửa hồ sơ" onClose={onClose}><ProfileForm profile={state.query.data} isSaving={state.update.isPending} isSaved={state.update.isSuccess} saveError={state.update.error} onSave={state.onSave} /></Modal>
}
