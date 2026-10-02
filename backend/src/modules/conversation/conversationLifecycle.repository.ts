import { CONVERSATION_STATUS, CONVERSATION_TYPE } from "@linko/contracts"
import type { HydratedDocument } from "mongoose"

import Conversation, { type ConversationType } from "../../models/Conversation"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "./conversation.constants"
import type { ObjectId } from "./conversation.types"
import type {
    ConversationLifecycleRepository,
    LeaveParticipantRecordInput,
} from "./conversationLifecycle.types"

/** Persist participant departure history and group closure state.
 *
 * @pattern Repository
 * @layer Repository
 */
export class MongooseConversationLifecycleRepository implements ConversationLifecycleRepository {
    /** Mark one current participant as departed while preserving its previous join record. */
    async leaveParticipant(input: LeaveParticipantRecordInput, transaction: TransactionContext): Promise<boolean> {
        const conversation = await this.findGroupDocument(input.conversationId, transaction)
        if (!conversation) return false

        const participant = conversation[CONVERSATION_FIELDS.PARTICIPANTS].find((candidate) =>
            candidate[PARTICIPANT_FIELDS.DEL_FLAG] !== true
                && candidate[PARTICIPANT_FIELDS.USER_ID].equals(input.actorId),
        )
        if (!participant) return false

        participant[PARTICIPANT_FIELDS.LEFT_AT] = input.leftAt
        participant[PARTICIPANT_FIELDS.DEL_FLAG] = true
        if (input.closeEmptyGroup) {
            conversation[CONVERSATION_FIELDS.STATUS] = CONVERSATION_STATUS.CLOSED
        }
        await conversation.save({ session: transaction.session })
        return true
    }

    /** Close a group without deleting its participant or message history. */
    async closeGroup(conversationId: ObjectId, transaction: TransactionContext): Promise<boolean> {
        const conversation = await this.findGroupDocument(conversationId, transaction)
        if (!conversation) return false
        conversation[CONVERSATION_FIELDS.STATUS] = CONVERSATION_STATUS.CLOSED
        await conversation.save({ session: transaction.session })
        return true
    }

    private async findGroupDocument(
        conversationId: ObjectId,
        transaction: TransactionContext,
    ): Promise<HydratedDocument<ConversationType> | null> {
        return Conversation.findOne({
            [CONVERSATION_FIELDS.ID]: conversationId,
            [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
        }).session(transaction.session).exec()
    }
}
