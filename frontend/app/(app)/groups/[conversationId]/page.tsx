import { ConversationPage } from "@/features/chat/pages/ConversationPage"

/** Connect a group conversation route to the shared chat screen. */
export default async function GroupConversationRoute({ params }: { readonly params: Promise<{ conversationId: string }> }) { const { conversationId } = await params; return <ConversationPage conversationId={conversationId} kind="group" /> }
