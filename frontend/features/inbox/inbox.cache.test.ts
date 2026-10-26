import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"
import type { CursorPage, InboxItemDto, MessageDto } from "@linko/contracts"

import { clearInboxItemUnreadCount, updateInboxItemWithNewMessage } from "./inbox.cache"
import { INBOX_QUERY_KEY } from "./inbox.constants"

function createSampleInboxItem(id: string, content = "old message", unreadCount = 0): InboxItemDto {
    return {
        id,
        type: "DIRECT",
        status: "ACTIVE",
        participants: [
            { id: "user-1", displayName: "Duc An", avatarUrl: null, joinedAt: null },
            { id: "user-2", displayName: "Thanh Dat", avatarUrl: null, joinedAt: null },
        ],
        unreadCount,
        lastMessage: {
            id: `msg-${id}-old`,
            sender: { id: "user-2", displayName: "Thanh Dat", avatarUrl: null },
            content,
            createdAt: "2026-10-25T00:25:00.000Z",
        },
        group: null,
        createdAt: "2026-10-24T00:00:00.000Z",
        updatedAt: "2026-10-25T00:25:00.000Z",
    }
}

describe("inbox cache updates", () => {
    it("should_update_conversation_last_message_and_move_it_to_top_of_list", () => {
        const queryClient = new QueryClient()
        const initialPage: CursorPage<InboxItemDto> = {
            items: [
                createSampleInboxItem("conv-1", "first"),
                createSampleInboxItem("conv-2", "second"),
            ],
            nextCursor: null,
        }

        queryClient.setQueryData([...INBOX_QUERY_KEY, "ALL", ""], initialPage)
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

        const newMessage: MessageDto = {
            id: "msg-new",
            conversationId: "conv-2",
            senderId: "user-1",
            content: "ff",
            clientMessageId: "client-1",
            replyTo: null,
            mentions: [],
            attachments: [],
            createdAt: "2026-10-25T10:20:00.000Z",
        }

        updateInboxItemWithNewMessage(queryClient, newMessage, {
            displayName: "Duc An",
            avatarUrl: "/avatar.png",
        })

        const updated = queryClient.getQueryData<CursorPage<InboxItemDto>>([
            ...INBOX_QUERY_KEY,
            "ALL",
            "",
        ])

        expect(updated?.items).toHaveLength(2)
        // conv-2 must be moved to the top
        expect(updated?.items[0].id).toBe("conv-2")
        expect(updated?.items[0].lastMessage?.content).toBe("ff")
        expect(updated?.items[0].lastMessage?.sender?.displayName).toBe("Duc An")
        expect(updated?.items[0].lastMessage?.sender?.id).toBe("user-1")
        expect(updated?.items[0].updatedAt).toBe("2026-10-25T10:20:00.000Z")

        expect(updated?.items[1].id).toBe("conv-1")
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: INBOX_QUERY_KEY })
    })

    it("should_increment_unread_count_when_increment_option_is_true", () => {
        const queryClient = new QueryClient()
        const initialPage: CursorPage<InboxItemDto> = {
            items: [createSampleInboxItem("conv-1", "old", 2)],
            nextCursor: null,
        }
        queryClient.setQueryData([...INBOX_QUERY_KEY, "ALL", ""], initialPage)

        const newMessage: MessageDto = {
            id: "msg-incoming",
            conversationId: "conv-1",
            senderId: "user-2",
            content: "new message from peer",
            clientMessageId: "client-peer",
            replyTo: null,
            mentions: [],
            attachments: [],
            createdAt: "2026-10-25T10:21:00.000Z",
        }

        updateInboxItemWithNewMessage(queryClient, newMessage, { incrementUnread: true })

        const updated = queryClient.getQueryData<CursorPage<InboxItemDto>>([
            ...INBOX_QUERY_KEY,
            "ALL",
            "",
        ])

        expect(updated?.items[0].unreadCount).toBe(3)
    })

    it("should_clear_unread_count_when_conversation_is_viewed", () => {
        const queryClient = new QueryClient()
        const initialPage: CursorPage<InboxItemDto> = {
            items: [
                createSampleInboxItem("conv-1", "unread", 5),
            ],
            nextCursor: null,
        }

        queryClient.setQueryData([...INBOX_QUERY_KEY, "ALL", ""], initialPage)

        clearInboxItemUnreadCount(queryClient, "conv-1")

        const updated = queryClient.getQueryData<CursorPage<InboxItemDto>>([
            ...INBOX_QUERY_KEY,
            "ALL",
            "",
        ])

        expect(updated?.items[0].unreadCount).toBe(0)
    })
})
