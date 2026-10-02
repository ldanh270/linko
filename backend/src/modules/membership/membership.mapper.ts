import { MEMBERSHIP_FIELDS, type MemberDto } from "@linko/contracts"

import type { MembershipMemberRecord } from "./membership.types"

/** Map one persistence-independent membership record into its safe API DTO. */
export function toMemberDto(member: MembershipMemberRecord): MemberDto {
    return {
        [MEMBERSHIP_FIELDS.USER_ID]: member.userId.toString(),
        [MEMBERSHIP_FIELDS.ROLE]: member.role,
        [MEMBERSHIP_FIELDS.DISPLAY_NAME]: member.displayName,
        [MEMBERSHIP_FIELDS.AVATAR_URL]: member.avatarUrl,
        [MEMBERSHIP_FIELDS.JOINED_AT]: member.joinedAt?.toISOString() ?? null,
    }
}
