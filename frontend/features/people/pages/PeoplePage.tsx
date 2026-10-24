import { MessengerWorkspace } from "@/shared/layout/MessengerWorkspace"
import { SelectedConversation } from "@/features/chat/components/SelectedConversation"
import { ContactsSidebar } from "../components/ContactsSidebar"

/** Compose the contacts reference panel with a persistent desktop chat. UI only. */
export function PeoplePage() {
  return <MessengerWorkspace sidebar={<ContactsSidebar />} conversation={<SelectedConversation />} />
}
