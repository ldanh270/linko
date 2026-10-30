import { MessengerWorkspace } from "@/shared/layout/MessengerWorkspace"
import { SelectedConversation } from "@/features/chat/components/SelectedConversation"
import { InboxSidebar } from "../components/InboxSidebar"

/** Compose the inbox reference panel with the shared selected conversation. UI only. */
export function InboxPage() {
  return <MessengerWorkspace sidebar={<InboxSidebar />} conversation={<SelectedConversation />} />
}
