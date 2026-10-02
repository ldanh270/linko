import type { GroupMemberRole } from "./constants"
import type { EntityId } from "./envelope"

/** Field names shared by membership persistence mapping and client DTOs. */
export const MEMBERSHIP_FIELDS = {
    USER_ID: "userId",
    ROLE: "role",
    DISPLAY_NAME: "displayName",
    AVATAR_URL: "avatarUrl",
    JOINED_AT: "joinedAt",
} as const

/** Safe member details returned to a current participant of a group. */
export interface MemberDto {
    readonly [MEMBERSHIP_FIELDS.USER_ID]: EntityId
    readonly [MEMBERSHIP_FIELDS.ROLE]: GroupMemberRole
    readonly [MEMBERSHIP_FIELDS.DISPLAY_NAME]: string | null
    readonly [MEMBERSHIP_FIELDS.AVATAR_URL]: string | null
    readonly [MEMBERSHIP_FIELDS.JOINED_AT]: string | null
}
