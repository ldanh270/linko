import { MessengerWorkspace } from "@/shared/layout/MessengerWorkspace"
import { SelectedConversation } from "@/features/chat/components/SelectedConversation"
import { GroupsSidebar } from "../components/GroupsSidebar"

/** Compose the groups reference panel with the shared selected conversation. UI only. */
export function GroupsPage() {
  return <MessengerWorkspace sidebar={<GroupsSidebar />} conversation={<SelectedConversation />} />
}
