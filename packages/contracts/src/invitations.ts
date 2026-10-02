import type { EntityId } from "./envelope"
import { INVITATION_PREVIEW_FIELDS } from "./constants"

/** One-time invitation URL and usage limits returned only when an invitation is issued. */
export interface IssuedInvitationDto {
    readonly id: EntityId
    readonly url: string
    readonly expiresAt: string
    readonly maxUses: number
    readonly useCount: number
    readonly createdAt: string
}

/** Safe invitation metadata returned by the management list endpoint. */
export interface InvitationSummaryDto {
    readonly id: EntityId
    readonly expiresAt: string
    readonly maxUses: number
    readonly useCount: number
    readonly revokedAt: string | null
    readonly createdAt: string
}

/** Minimal public group details that do not reveal participants or message history. */
export interface InvitationPreviewDto {
    readonly [INVITATION_PREVIEW_FIELDS.GROUP_NAME]: string
    readonly [INVITATION_PREVIEW_FIELDS.GROUP_DESCRIPTION]: string | null
    readonly [INVITATION_PREVIEW_FIELDS.GROUP_AVATAR_URL]: string | null
    readonly [INVITATION_PREVIEW_FIELDS.MEMBER_COUNT]: number
    readonly [INVITATION_PREVIEW_FIELDS.EXPIRES_AT]: string
}
