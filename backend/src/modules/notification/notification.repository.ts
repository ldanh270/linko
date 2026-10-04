import { CONVERSATION_TYPE } from "@linko/contracts"

import Conversation from "../../models/Conversation"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import { NOTIFICATION_FIELDS } from "./notification.constants"
import type { NotificationPreferenceMemberRecord, NotificationPreferenceRepository, ObjectId } from "./notification.types"

/** Isolate participant preference reads and writes from notification business rules.
 *
 * @pattern Repository
 * @layer Repository
 */
export class MongooseNotificationRepository implements NotificationPreferenceRepository {
    /** Find one active participant without expanding the persistence document into the service. */
    async findCurrentMember(
        conversationId: ObjectId,
        userId: ObjectId,
        transaction?: TransactionContext,
    ): Promise<NotificationPreferenceMemberRecord | null> {
        const conversation = await Conversation.findOne(currentMemberFilter(conversationId, userId))
            .session(transaction?.session ?? null)
            .exec()
        if (!conversation) return null
        const participant = conversation[CONVERSATION_FIELDS.PARTICIPANTS].find((candidate) =>
            candidate[PARTICIPANT_FIELDS.USER_ID].equals(userId),
        )
        return participant ? toMemberRecord(conversation[CONVERSATION_FIELDS.TYPE], participant) : null
    }

    /** Update one participant's boolean preference and erase its prior expiry in one write. */
    async setMuted(
        conversationId: ObjectId,
        userId: ObjectId,
        isMuted: boolean,
        transaction: TransactionContext,
    ): Promise<NotificationPreferenceMemberRecord | null> {
        const conversation = await Conversation.findOneAndUpdate(
            {
                ...currentMemberFilter(conversationId, userId),
                [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
            },
            {
                $set: {
                    [`${CONVERSATION_FIELDS.PARTICIPANTS}.$.${PARTICIPANT_FIELDS.IS_MUTED}`]: isMuted,
                    [`${CONVERSATION_FIELDS.PARTICIPANTS}.$.${PARTICIPANT_FIELDS.MUTED_UNTIL}`]: null,
                },
            },
            { returnDocument: "after", session: transaction.session },
        ).exec()
        if (!conversation) return null
        const participant = conversation[CONVERSATION_FIELDS.PARTICIPANTS].find((candidate) =>
            candidate[PARTICIPANT_FIELDS.USER_ID].equals(userId),
        )
        return participant ? toMemberRecord(conversation[CONVERSATION_FIELDS.TYPE], participant) : null
    }
}

function currentMemberFilter(conversationId: ObjectId, userId: ObjectId): Record<string, unknown> {
    return {
        [CONVERSATION_FIELDS.ID]: conversationId,
        [CONVERSATION_FIELDS.DEL_FLAG]: false,
        [CONVERSATION_FIELDS.PARTICIPANTS]: {
            $elemMatch: {
                [PARTICIPANT_FIELDS.USER_ID]: userId,
                [PARTICIPANT_FIELDS.DEL_FLAG]: { $ne: true },
                [PARTICIPANT_FIELDS.LEFT_AT]: null,
            },
        },
    }
}

function toMemberRecord(
    conversationType: NotificationPreferenceMemberRecord["conversationType"],
    participant: {
        readonly [PARTICIPANT_FIELDS.IS_MUTED]: boolean
        readonly [PARTICIPANT_FIELDS.MUTED_UNTIL]?: Date | null
    },
): NotificationPreferenceMemberRecord {
    return {
        [NOTIFICATION_FIELDS.TYPE]: conversationType,
        [NOTIFICATION_FIELDS.IS_MUTED]: participant[PARTICIPANT_FIELDS.IS_MUTED],
        [NOTIFICATION_FIELDS.MUTED_UNTIL]: participant[PARTICIPANT_FIELDS.MUTED_UNTIL] ?? null,
    }
}
