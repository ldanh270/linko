import { GROUP_FIELDS, type GroupDto, type GroupSummaryDto } from "@linko/contracts"

import type { GroupRecord, GroupSummaryRecord } from "./conversation.types"

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
