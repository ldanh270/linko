import type {
    ConversationParticipantSummaryDto,
    CursorPage,
    InboxItemDto,
    MessageDto,
} from "@linko/contracts"
import type { QueryClient } from "@tanstack/react-query"

import { INBOX_QUERY_KEY } from "./inbox.constants"

/** Sender profile override and unread increment options when updating the inbox cache. */
export interface UpdateInboxOptions {
    readonly displayName?: string | null
    readonly avatarUrl?: string | null
    readonly incrementUnread?: boolean
}

/** Optimistically update the conversation preview, timestamp, and position in inbox queries.
 *
 * Places the conversation with the newest activity at the front of the list,
 * then triggers a background invalidation to ensure server consistency.
 */
export function updateInboxItemWithNewMessage(
    queryClient: QueryClient,
    message: MessageDto,
    options?: UpdateInboxOptions | null,
): void {
    const conversationId = message.conversationId

    queryClient.setQueriesData<CursorPage<InboxItemDto>>(
        { queryKey: INBOX_QUERY_KEY },
        (current) => {
            if (!current || !Array.isArray(current.items)) return current

            const existingIndex = current.items.findIndex((item: InboxItemDto) => item.id === conversationId)
            if (existingIndex === -1) return current

            const existingItem = current.items[existingIndex]
            const senderDisplayName =
                options?.displayName
                ?? existingItem.participants.find(
                    (participant: ConversationParticipantSummaryDto) => participant.id === message.senderId,
                )?.displayName
                ?? null
            const senderAvatarUrl =
                options?.avatarUrl
                ?? existingItem.participants.find(
                    (participant: ConversationParticipantSummaryDto) => participant.id === message.senderId,
                )?.avatarUrl
                ?? null

            let updatedUnreadCount = existingItem.unreadCount
            if (options?.incrementUnread === true) {
                updatedUnreadCount = (existingItem.unreadCount ?? 0) + 1
            } else if (options?.incrementUnread === false) {
                updatedUnreadCount = 0
            }

            const updatedItem: InboxItemDto = {
                ...existingItem,
                unreadCount: updatedUnreadCount,
                lastMessage: {
                    id: message.id,
                    sender: {
                        id: message.senderId,
                        displayName: senderDisplayName,
                        avatarUrl: senderAvatarUrl,
                    },
                    content: message.content,
                    createdAt: message.createdAt,
                },
                updatedAt: message.createdAt,
            }

            const remainingItems = current.items.filter((item: InboxItemDto) => item.id !== conversationId)
            return {
                ...current,
                items: [updatedItem, ...remainingItems],
            }
        },
    )

    void queryClient.invalidateQueries({ queryKey: INBOX_QUERY_KEY })
}

/** Clear the unread badge for a conversation in all active inbox queries upon viewing. */
export function clearInboxItemUnreadCount(
    queryClient: QueryClient,
    conversationId: string,
): void {
    queryClient.setQueriesData<CursorPage<InboxItemDto>>(
        { queryKey: INBOX_QUERY_KEY },
        (current) => {
            if (!current || !Array.isArray(current.items)) return current

            const item = current.items.find((entry: InboxItemDto) => entry.id === conversationId)
            if (!item || item.unreadCount === 0) return current

            return {
                ...current,
                items: current.items.map((entry: InboxItemDto) =>
                    entry.id === conversationId ? { ...entry, unreadCount: 0 } : entry,
                ),
            }
        },
    )

    void queryClient.invalidateQueries({ queryKey: INBOX_QUERY_KEY })
}
