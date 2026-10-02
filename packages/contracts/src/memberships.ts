import { CONVERSATION_PARAMS, type GroupMemberRole } from "./constants"
import type { EntityId } from "./envelope"

/** Membership route parameter names shared by server and client adapters. */
export const MEMBERSHIP_PARAMS = {
    USER_ID: "userId",
} as const

/** Route suffixes shared by membership registration and client adapters. */
export const MEMBERSHIP_ROUTE_PATHS = {
    PARTICIPANTS: `/:${CONVERSATION_PARAMS.ID}/participants`,
    MEMBER: `/:${CONVERSATION_PARAMS.ID}/participants/:${MEMBERSHIP_PARAMS.USER_ID}`,
    TRANSFER_OWNER: `/:${CONVERSATION_PARAMS.ID}/transfer-owner`,
} as const

/** Request field names shared by membership routes and client adapters. */
export const MEMBERSHIP_REQUEST_FIELDS = {
    ROLE: "role",
    NEW_OWNER_ID: "newOwnerId",
} as const

/** Field names shared by membership persistence mapping and client DTOs. */
export const MEMBERSHIP_FIELDS = {
    USER_ID: "userId",
    ROLE: "role",
    DISPLAY_NAME: "displayName",
    AVATAR_URL: "avatarUrl",
    JOINED_AT: "joinedAt",
    NEW_OWNER_ID: MEMBERSHIP_REQUEST_FIELDS.NEW_OWNER_ID,
} as const

/** Request to change one current group participant role. */
export interface ChangeMemberRoleRequest {
    readonly [MEMBERSHIP_REQUEST_FIELDS.ROLE]: GroupMemberRole
}

/** Request to transfer group ownership to a current participant. */
export interface TransferOwnerRequest {
    readonly [MEMBERSHIP_REQUEST_FIELDS.NEW_OWNER_ID]: EntityId
}

/** Safe member details returned to a current participant of a group. */
export interface MemberDto {
    readonly [MEMBERSHIP_FIELDS.USER_ID]: EntityId
    readonly [MEMBERSHIP_FIELDS.ROLE]: GroupMemberRole
    readonly [MEMBERSHIP_FIELDS.DISPLAY_NAME]: string | null
    readonly [MEMBERSHIP_FIELDS.AVATAR_URL]: string | null
    readonly [MEMBERSHIP_FIELDS.JOINED_AT]: string | null
}
