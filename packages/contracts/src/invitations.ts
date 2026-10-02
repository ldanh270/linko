import type { EntityId } from "./envelope"

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
