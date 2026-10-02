import {
    INVITATION_FIELDS,
    INVITATION_PREVIEW_FIELDS,
    type InvitationPreviewDto,
    type InvitationSummaryDto,
    type IssuedInvitationDto,
} from "@linko/contracts"

import type {
    InvitationPublicGroupPreviewRecord,
    InvitationRecord,
    InvitationSummaryRecord,
} from "./invitation.types"

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

/** Map only public group metadata and expiration into the invitation preview contract. */
export function toInvitationPreviewDto(
    group: InvitationPublicGroupPreviewRecord,
    expiresAt: Date,
): InvitationPreviewDto {
    return {
        [INVITATION_PREVIEW_FIELDS.GROUP_NAME]: group.name,
        [INVITATION_PREVIEW_FIELDS.GROUP_DESCRIPTION]: group.description,
        [INVITATION_PREVIEW_FIELDS.GROUP_AVATAR_URL]: group.avatarUrl,
        [INVITATION_PREVIEW_FIELDS.MEMBER_COUNT]: group.memberCount,
        [INVITATION_PREVIEW_FIELDS.EXPIRES_AT]: expiresAt.toISOString(),
    }
}
