import { GROUP_FIELDS, type ConversationSummaryDto, type GroupDto, type GroupSummaryDto } from "@linko/contracts"

import { CONVERSATION_FIELDS } from "./conversation.constants"
import type { ConversationSummaryRecord, GroupRecord, GroupSummaryRecord } from "./conversation.types"

/** Map persisted group fields into the public API DTO without audit metadata. */
export function toGroupDto(group: GroupRecord): GroupDto {
    return {
        [GROUP_FIELDS.ID]: group.id.toString(),
        [GROUP_FIELDS.OWNER_ID]: group.ownerId.toString(),
        [GROUP_FIELDS.NAME]: group.name,
        [GROUP_FIELDS.DESCRIPTION]: group.description,
        [GROUP_FIELDS.AVATAR_URL]: group.avatar?.url ?? null,
        [GROUP_FIELDS.PARTICIPANTS]: group.participants.map((participant) => ({
            [GROUP_FIELDS.USER_ID]: participant.userId.toString(),
            [GROUP_FIELDS.ROLE]: participant.role,
        })),
        [GROUP_FIELDS.CREATED_AT]: group.createdAt.toISOString(),
        [GROUP_FIELDS.UPDATED_AT]: group.updatedAt.toISOString(),
    }
}

/** Map a group list record into its compact, safe list representation. */
export function toGroupSummaryDto(group: GroupSummaryRecord): GroupSummaryDto {
    return {
        [GROUP_FIELDS.ID]: group.id.toString(),
        [GROUP_FIELDS.OWNER_ID]: group.ownerId.toString(),
        [GROUP_FIELDS.NAME]: group.name,
        [GROUP_FIELDS.DESCRIPTION]: group.description,
        [GROUP_FIELDS.AVATAR_URL]: group.avatar?.url ?? null,
        [GROUP_FIELDS.MEMBER_COUNT]: group.memberCount,
        [GROUP_FIELDS.LAST_MESSAGE_AT]: group.lastMessageAt?.toISOString() ?? null,
        [GROUP_FIELDS.UPDATED_AT]: group.updatedAt.toISOString(),
    }
}

/** Map an inbox record into safe direct or group conversation fields. */
export function toConversationSummaryDto(conversation: ConversationSummaryRecord): ConversationSummaryDto {
    return {
        id: conversation.id.toString(),
        type: conversation.type,
        participants: conversation.participants.map((participant) => ({
            id: participant.userId.toString(),
            displayName: participant.displayName,
            avatarUrl: participant.avatarUrl,
            joinedAt: participant.joinedAt?.toISOString() ?? null,
        })),
        unreadCount: conversation.unreadCount,
        lastMessage: conversation.lastMessage
            ? {
                id: conversation.lastMessage.id?.toString() ?? null,
                sender: conversation.lastMessage.sender
                    ? {
                        id: conversation.lastMessage.sender.id.toString(),
                        displayName: conversation.lastMessage.sender.displayName,
                        avatarUrl: conversation.lastMessage.sender.avatarUrl,
                    }
                    : null,
                content: conversation.lastMessage.content,
                createdAt: conversation.lastMessage.createdAt?.toISOString() ?? null,
            }
            : null,
        group: conversation.group
            ? {
                name: conversation.group.name,
                description: conversation.group.description,
                avatarUrl: conversation.group.avatarUrl,
            }
            : null,
        [CONVERSATION_FIELDS.CREATED_AT]: conversation.createdAt.toISOString(),
        [CONVERSATION_FIELDS.UPDATED_AT]: conversation.updatedAt.toISOString(),
    }
}
