import { ProfilePage } from "@/features/profile/pages/ProfilePage"

/** Connect a public user profile route to the profile screen. */
export default async function UserProfileRoute({ params }: { readonly params: Promise<{ userId: string }> }) {
  const { userId } = await params
  return <ProfilePage userId={userId} />
}
