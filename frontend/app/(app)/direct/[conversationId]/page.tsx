import { ConversationPage } from "@/features/chat/pages/ConversationPage"

/** Connect a direct conversation route to the shared chat screen. */
export default async function DirectConversationRoute({ params }: { readonly params: Promise<{ conversationId: string }> }) { const { conversationId } = await params; return <ConversationPage conversationId={conversationId} kind="direct" /> }
