import {
    CONVERSATION_DTO_FIELDS,
    INBOX_FIELDS,
    INBOX_MESSAGE_FIELDS,
    INBOX_PARTICIPANT_FIELDS,
    GROUP_FIELDS,
    MESSAGE_FIELDS,
    type InboxItemDto,
} from "@linko/contracts"

import type { InboxItemRecord } from "./inbox.types"

/** Map a persistence-independent inbox record to the safe public conversation DTO. */
export function toInboxItemDto(item: InboxItemRecord): InboxItemDto {
    return {
        [INBOX_FIELDS.ID]: item.id.toString(),
        [INBOX_FIELDS.TYPE]: item.type,
        [CONVERSATION_DTO_FIELDS.STATUS]: item.status,
        [INBOX_FIELDS.PARTICIPANTS]: item.participants.map((participant) => ({
            [INBOX_PARTICIPANT_FIELDS.ID]: participant.id.toString(),
            [INBOX_PARTICIPANT_FIELDS.DISPLAY_NAME]: participant.displayName,
            [INBOX_PARTICIPANT_FIELDS.AVATAR_URL]: participant.avatarUrl,
            [INBOX_PARTICIPANT_FIELDS.JOINED_AT]: participant.joinedAt?.toISOString() ?? null,
        })),
        [INBOX_FIELDS.UNREAD_COUNT]: item.unreadCount,
        [INBOX_FIELDS.LAST_MESSAGE]: item.lastMessage
            ? {
                [MESSAGE_FIELDS.ID]: item.lastMessage.id?.toString() ?? null,
                [INBOX_MESSAGE_FIELDS.SENDER]: item.lastMessage.sender
                    ? {
                        [INBOX_PARTICIPANT_FIELDS.ID]: item.lastMessage.sender.id.toString(),
                        [INBOX_PARTICIPANT_FIELDS.DISPLAY_NAME]: item.lastMessage.sender.displayName,
                        [INBOX_PARTICIPANT_FIELDS.AVATAR_URL]: item.lastMessage.sender.avatarUrl,
                    }
                    : null,
                [MESSAGE_FIELDS.CONTENT]: item.lastMessage.content,
                [MESSAGE_FIELDS.CREATED_AT]: item.lastMessage.createdAt?.toISOString() ?? null,
            }
            : null,
        [INBOX_FIELDS.GROUP]: item.group
            ? {
                [GROUP_FIELDS.NAME]: item.group.name,
                [GROUP_FIELDS.DESCRIPTION]: item.group.description,
                [GROUP_FIELDS.AVATAR_URL]: item.group.avatarUrl,
            }
            : null,
        [INBOX_FIELDS.CREATED_AT]: item.createdAt.toISOString(),
        [INBOX_FIELDS.UPDATED_AT]: item.updatedAt.toISOString(),
    }
}
