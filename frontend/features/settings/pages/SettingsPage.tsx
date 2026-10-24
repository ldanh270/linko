import { MessengerWorkspace } from "@/shared/layout/MessengerWorkspace"
import { SelectedConversation } from "@/features/chat/components/SelectedConversation"
import { SettingsSidebar } from "../components/SettingsSidebar"

/** Compose the settings reference panel with the persistent desktop conversation. UI only. */
export function SettingsPage() {
  return <MessengerWorkspace sidebar={<SettingsSidebar />} conversation={<SelectedConversation />} />
}
