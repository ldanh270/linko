import { CONVERSATION_TYPE, GROUP_FIELDS } from "@linko/contracts"

import Conversation from "../../models/Conversation"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import {
    CONVERSATION_FIELDS,
    GROUP_AVATAR_FIELDS,
    PARTICIPANT_FIELDS,
} from "../conversation/conversation.constants"
import Invitation, { type InvitationType } from "./Invitation"
import { INVITATION_MESSAGES, INVITATION_MODEL_FIELDS } from "./invitation.constants"
import type {
    CreateInvitationRecord,
    InvitationGroupAccessRecord,
    InvitationPublicGroupPreviewRecord,
    InvitationRepository,
    InvitationRecord,
    InvitationSummaryRecord,
    ObjectId,
} from "./invitation.types"

/** Isolate invitation and group membership reads/writes behind a persistence port.
 *
 * @pattern Repository
 * @layer Repository
 */
export class MongooseInvitationRepository implements InvitationRepository {
    /** Read current group roles without loading unrelated conversation fields. */
    async findGroupAccess(
        conversationId: ObjectId,
        transaction?: TransactionContext,
    ): Promise<InvitationGroupAccessRecord | null> {
        const query = Conversation.findOne({
            [CONVERSATION_FIELDS.ID]: conversationId,
            [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
        }).select({
            [`${CONVERSATION_FIELDS.PARTICIPANTS}.${PARTICIPANT_FIELDS.USER_ID}`]: 1,
            [`${CONVERSATION_FIELDS.PARTICIPANTS}.${PARTICIPANT_FIELDS.ROLE}`]: 1,
        })
        if (transaction) query.session(transaction.session)

        const conversation = await query.exec()
        if (!conversation) return null
        return {
            participants: conversation[CONVERSATION_FIELDS.PARTICIPANTS].map((participant) => ({
                userId: participant[PARTICIPANT_FIELDS.USER_ID],
                role: participant[PARTICIPANT_FIELDS.ROLE],
            })),
        }
    }

    /** Revoke every prior link before a new one becomes the group's active link. */
    async revokeUnrevokedInvitations(
        conversationId: ObjectId,
        revokedAt: Date,
        transaction: TransactionContext,
    ): Promise<void> {
        await Invitation.updateMany(
            {
                [INVITATION_MODEL_FIELDS.CONVERSATION_ID]: conversationId,
                [INVITATION_MODEL_FIELDS.REVOKED_AT]: null,
            },
            { $set: { [INVITATION_MODEL_FIELDS.REVOKED_AT]: revokedAt } },
        ).session(transaction.session)
    }

    /** Persist a one-way token hash and return its generated issue metadata. */
    async createInvitation(
        input: CreateInvitationRecord,
        transaction: TransactionContext,
    ): Promise<InvitationRecord> {
        const [invitation] = await Invitation.create([{
            [INVITATION_MODEL_FIELDS.CONVERSATION_ID]: input.conversationId,
            [INVITATION_MODEL_FIELDS.TOKEN_HASH]: input.tokenHash,
            [INVITATION_MODEL_FIELDS.IDEMPOTENCY_KEY_HASH]: input.idempotencyKeyHash,
        }], { session: transaction.session })
        if (!invitation) throw new Error(INVITATION_MESSAGES.INVALID_INSERT)
        return this.toInvitationRecord(invitation)
    }

    /** Detect a completed issue attempt without exposing or selecting its token material. */
    async hasInvitationRequest(
        idempotencyKeyHash: string,
        transaction?: TransactionContext,
    ): Promise<boolean> {
        const query = Invitation.findOne({
            [INVITATION_MODEL_FIELDS.IDEMPOTENCY_KEY_HASH]: idempotencyKeyHash,
        }).select({ [INVITATION_MODEL_FIELDS.ID]: 1 })
        if (transaction) query.session(transaction.session)
        return (await query.exec()) !== null
    }

    /** Find one invitation while preserving its group ownership boundary. */
    async findInvitation(
        invitationId: ObjectId,
        conversationId: ObjectId,
        transaction?: TransactionContext,
    ): Promise<InvitationRecord | null> {
        const query = Invitation.findOne({
            [INVITATION_MODEL_FIELDS.ID]: invitationId,
            [INVITATION_MODEL_FIELDS.CONVERSATION_ID]: conversationId,
        })
        if (transaction) query.session(transaction.session)
        const invitation = await query.exec()
        return invitation ? this.toInvitationRecord(invitation) : null
    }

    /** Resolve an invitation only by its persisted one-way token digest. */
    async findInvitationByTokenHash(tokenHash: string): Promise<InvitationRecord | null> {
        const invitation = await Invitation.findOne({
            [INVITATION_MODEL_FIELDS.TOKEN_HASH]: tokenHash,
        }).exec()
        return invitation ? this.toInvitationRecord(invitation) : null
    }

    /** Return only public group metadata and the current participant count. */
    async findPublicGroupPreview(
        conversationId: ObjectId,
    ): Promise<InvitationPublicGroupPreviewRecord | null> {
        const conversation = await Conversation.findOne({
            [CONVERSATION_FIELDS.ID]: conversationId,
            [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
        }).select({
            [`${CONVERSATION_FIELDS.GROUP}.${GROUP_FIELDS.NAME}`]: 1,
            [`${CONVERSATION_FIELDS.GROUP}.${GROUP_FIELDS.DESCRIPTION}`]: 1,
            [`${CONVERSATION_FIELDS.GROUP}.${GROUP_FIELDS.AVATAR}.${GROUP_AVATAR_FIELDS.URL}`]: 1,
            [CONVERSATION_FIELDS.PARTICIPANTS]: 1,
        }).exec()
        const group = conversation?.[CONVERSATION_FIELDS.GROUP]
        if (!conversation || !group) return null

        return {
            name: group[GROUP_FIELDS.NAME],
            description: group[GROUP_FIELDS.DESCRIPTION] ?? null,
            avatarUrl: group[GROUP_FIELDS.AVATAR]?.[GROUP_AVATAR_FIELDS.URL] ?? null,
            memberCount: conversation[CONVERSATION_FIELDS.PARTICIPANTS].length,
        }
    }

    /** Return invitation list fields without selecting the token hash. */
    async listInvitations(conversationId: ObjectId): Promise<readonly InvitationSummaryRecord[]> {
        const invitations = await Invitation.find({
            [INVITATION_MODEL_FIELDS.CONVERSATION_ID]: conversationId,
        }).select({
            [INVITATION_MODEL_FIELDS.ID]: 1,
            [INVITATION_MODEL_FIELDS.EXPIRES_AT]: 1,
            [INVITATION_MODEL_FIELDS.MAX_USES]: 1,
            [INVITATION_MODEL_FIELDS.USE_COUNT]: 1,
            [INVITATION_MODEL_FIELDS.REVOKED_AT]: 1,
            [INVITATION_MODEL_FIELDS.CREATED_AT]: 1,
        }).sort({ [INVITATION_MODEL_FIELDS.CREATED_AT]: -1 }).exec()

        return invitations.map((invitation) => this.toInvitationSummaryRecord(invitation))
    }

    /** Set the revocation time for a link without deleting its audit record. */
    async revokeInvitation(
        invitationId: ObjectId,
        conversationId: ObjectId,
        revokedAt: Date,
        transaction: TransactionContext,
    ): Promise<void> {
        await Invitation.updateOne(
            {
                [INVITATION_MODEL_FIELDS.ID]: invitationId,
                [INVITATION_MODEL_FIELDS.CONVERSATION_ID]: conversationId,
                [INVITATION_MODEL_FIELDS.REVOKED_AT]: null,
            },
            { $set: { [INVITATION_MODEL_FIELDS.REVOKED_AT]: revokedAt } },
        ).session(transaction.session)
    }

    private toInvitationRecord(invitation: InvitationType & { readonly _id: ObjectId }): InvitationRecord {
        return {
            id: invitation[INVITATION_MODEL_FIELDS.ID],
            conversationId: invitation[INVITATION_MODEL_FIELDS.CONVERSATION_ID],
            tokenHash: invitation[INVITATION_MODEL_FIELDS.TOKEN_HASH],
            expiresAt: invitation[INVITATION_MODEL_FIELDS.EXPIRES_AT],
            maxUses: invitation[INVITATION_MODEL_FIELDS.MAX_USES],
            useCount: invitation[INVITATION_MODEL_FIELDS.USE_COUNT],
            revokedAt: invitation[INVITATION_MODEL_FIELDS.REVOKED_AT] ?? null,
            createdAt: invitation[INVITATION_MODEL_FIELDS.CREATED_AT],
        }
    }

    private toInvitationSummaryRecord(
        invitation: InvitationType & { readonly _id: ObjectId },
    ): InvitationSummaryRecord {
        return {
            id: invitation[INVITATION_MODEL_FIELDS.ID],
            expiresAt: invitation[INVITATION_MODEL_FIELDS.EXPIRES_AT],
            maxUses: invitation[INVITATION_MODEL_FIELDS.MAX_USES],
            useCount: invitation[INVITATION_MODEL_FIELDS.USE_COUNT],
            revokedAt: invitation[INVITATION_MODEL_FIELDS.REVOKED_AT] ?? null,
            createdAt: invitation[INVITATION_MODEL_FIELDS.CREATED_AT],
        }
    }
}
