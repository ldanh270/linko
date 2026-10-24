"use client"

import { ProfileForm } from "../components/ProfileForm"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { useProfilePage } from "../hooks/useProfilePage"
import { PageHeader } from "@/shared/components/PageHeader"

/** Display and edit a user's public profile details and images. */
export function ProfilePage() {
  const { query, update } = useProfilePage()
  const profile = query.data
  if (query.isPending) return <LoadingState label="Đang tải hồ sơ" />
  if (query.isError || !profile) return <ErrorState title="Không thể tải hồ sơ" onRetry={() => void query.refetch()} />
  return <section className="mx-auto grid max-w-3xl gap-6">
    <PageHeader eyebrow="Tài khoản" title="Hồ sơ của tôi" />
    <ProfileForm profile={profile} isSaving={update.isPending} isSaved={update.isSuccess} saveError={update.error} onSave={(input) => update.mutate(input)} />
  </section>
}
