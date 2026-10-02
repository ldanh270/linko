import { INVITATION_FIELDS, type InvitationSummaryDto, type IssuedInvitationDto } from "@linko/contracts"

import type { InvitationRecord, InvitationSummaryRecord } from "./invitation.types"

/** Map safe persisted invitation metadata to the management API contract. */
export function toInvitationSummaryDto(invitation: InvitationSummaryRecord): InvitationSummaryDto {
    return {
        [INVITATION_FIELDS.ID]: invitation.id.toString(),
        [INVITATION_FIELDS.EXPIRES_AT]: invitation.expiresAt.toISOString(),
        [INVITATION_FIELDS.MAX_USES]: invitation.maxUses,
        [INVITATION_FIELDS.USE_COUNT]: invitation.useCount,
        [INVITATION_FIELDS.REVOKED_AT]: invitation.revokedAt?.toISOString() ?? null,
        [INVITATION_FIELDS.CREATED_AT]: invitation.createdAt.toISOString(),
    }
}

/** Add the one-time URL to issue metadata without including the token separately. */
export function toIssuedInvitationDto(invitation: InvitationRecord, url: string): IssuedInvitationDto {
    return {
        [INVITATION_FIELDS.ID]: invitation.id.toString(),
        [INVITATION_FIELDS.URL]: url,
        [INVITATION_FIELDS.EXPIRES_AT]: invitation.expiresAt.toISOString(),
        [INVITATION_FIELDS.MAX_USES]: invitation.maxUses,
        [INVITATION_FIELDS.USE_COUNT]: invitation.useCount,
        [INVITATION_FIELDS.CREATED_AT]: invitation.createdAt.toISOString(),
    }
}
