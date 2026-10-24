import { MessengerWorkspace } from "@/shared/layout/MessengerWorkspace"
import { InboxSidebar } from "@/features/inbox/components/InboxSidebar"
import { SelectedConversation } from "../components/SelectedConversation"
import type { ChatKind } from "../chat.types"

/** Canonical route input remains compatible with existing direct/group route entries. */
export interface ConversationPageProps { readonly conversationId: string; readonly kind: ChatKind }

/** Compose the canonical mobile conversation and desktop inbox workspace. UI only. */
export function ConversationPage({ conversationId, kind }: ConversationPageProps) {
  return <MessengerWorkspace key={`${kind}:${conversationId}`} isConversationView sidebar={<InboxSidebar />} conversation={<SelectedConversation />} />
}
