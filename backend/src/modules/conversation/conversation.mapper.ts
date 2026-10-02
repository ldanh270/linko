import {
    CONVERSATION_DTO_FIELDS,
    GROUP_FIELDS,
    type GroupDto,
} from "@linko/contracts"

import { CONVERSATION_FIELDS } from "./conversation.constants"
import type { GroupRecord } from "./conversation.types"

/** Map persisted group fields into the public API DTO without audit metadata. */
export function toGroupDto(group: GroupRecord): GroupDto {
    return {
        [GROUP_FIELDS.ID]: group.id.toString(),
        [GROUP_FIELDS.OWNER_ID]: group.ownerId.toString(),
        [GROUP_FIELDS.NAME]: group.name,
        [GROUP_FIELDS.DESCRIPTION]: group.description,
        [GROUP_FIELDS.AVATAR_URL]: group.avatar?.url ?? null,
        [CONVERSATION_DTO_FIELDS.STATUS]: group.status,
        [GROUP_FIELDS.PARTICIPANTS]: group.participants.map((participant) => ({
            [GROUP_FIELDS.USER_ID]: participant.userId.toString(),
            [GROUP_FIELDS.ROLE]: participant.role,
        })),
        [GROUP_FIELDS.CREATED_AT]: group.createdAt.toISOString(),
        [GROUP_FIELDS.UPDATED_AT]: group.updatedAt.toISOString(),
    }
}
