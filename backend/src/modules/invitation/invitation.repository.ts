import { CONVERSATION_TYPE } from "@linko/contracts"

import Conversation from "../../models/Conversation"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import Invitation, { type InvitationType } from "./Invitation"
import { INVITATION_MESSAGES, INVITATION_MODEL_FIELDS } from "./invitation.constants"
import type {
    CreateInvitationRecord,
    InvitationGroupAccessRecord,
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
        }], { session: transaction.session })
        if (!invitation) throw new Error(INVITATION_MESSAGES.INVALID_INSERT)
        return this.toInvitationRecord(invitation)
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
