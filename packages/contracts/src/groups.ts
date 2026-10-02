import { CONVERSATION_DTO_FIELDS, type ConversationStatus, type Role } from "./constants"
import type { EntityId } from "./envelope"

/** Public group membership data; identifiers use the shared API string form. */
export interface GroupParticipantDto {
    readonly userId: EntityId
    readonly role: Role
}

/** Group details safe for the authenticated conversation API. */
export interface GroupDto {
    readonly id: EntityId
    readonly ownerId: EntityId
    readonly name: string
    readonly description: string | null
    readonly avatarUrl: string | null
    readonly [CONVERSATION_DTO_FIELDS.STATUS]: ConversationStatus
    readonly participants: readonly GroupParticipantDto[]
    readonly createdAt: string
    readonly updatedAt: string
}

/** Compact group data needed by the signed-in groups list. */
export interface GroupSummaryDto {
    readonly id: EntityId
    readonly ownerId: EntityId
    readonly name: string
    readonly description: string | null
    readonly avatarUrl: string | null
    readonly [CONVERSATION_DTO_FIELDS.STATUS]: ConversationStatus
    readonly memberCount: number
    readonly lastMessageAt: string | null
    readonly updatedAt: string
}

/** Fields accepted when a user creates a private group. */
export interface CreateGroupRequest {
    readonly name: string
    readonly description?: string
}

/** Editable text fields accepted for an existing private group. */
export interface UpdateGroupRequest {
    readonly name?: string
    readonly description?: string
}
