import { MessengerWorkspace } from "@/shared/layout/MessengerWorkspace"
import { SelectedConversation } from "@/features/chat/components/SelectedConversation"
import { ProfileSidebar } from "../components/ProfileSidebar"

/** Compose the profile reference panel with the selected desktop conversation. UI only. */
export function ProfilePage() {
  return <MessengerWorkspace sidebar={<ProfileSidebar />} conversation={<SelectedConversation />} />
}
