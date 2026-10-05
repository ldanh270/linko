"use client"

import { ProfileForm } from "../components/ProfileForm"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { useProfilePage } from "../hooks/useProfilePage"

/** Display and edit a user's public profile details and images. */
export function ProfilePage() {
  const { query, update } = useProfilePage()
  const profile = query.data
  if (query.isPending) return <LoadingState label="Đang tải hồ sơ" />
  if (query.isError || !profile) return <ErrorState title="Không thể tải hồ sơ" onRetry={() => void query.refetch()} />
  return <section className="mx-auto grid max-w-3xl gap-6"><header><p className="text-sm font-semibold text-[var(--brand)]">Tài khoản</p><h1 className="mt-1 text-3xl font-bold">Hồ sơ của tôi</h1></header><ProfileForm profile={profile} isSaving={update.isPending} isSaved={update.isSuccess} saveError={update.error} onSave={(input) => update.mutate(input)} /></section>
}
