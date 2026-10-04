import mongoose from "mongoose"

import Conversation from "../../models/Conversation"
import User from "../../models/User"
import { REALTIME_MODEL_FIELDS } from "./realtime.constants"
import type { RealtimeRepository } from "./realtime.types"

/** Isolate account and active membership checks from socket authorization.
 *
 * @pattern Repository
 * @layer Repository
 */
export class MongooseRealtimeRepository implements RealtimeRepository {
    /** Check that the token subject still belongs to an active account. */
    async isActiveUser(userId: string): Promise<boolean> {
        if (!mongoose.isValidObjectId(userId)) return false
        return (await User.exists({
            [REALTIME_MODEL_FIELDS.ID]: new mongoose.Types.ObjectId(userId),
            [REALTIME_MODEL_FIELDS.DEL_FLAG]: false,
        })) !== null
    }

    /** Check current participant state without granting access from a guessed room ID. */
    async isCurrentMember(conversationId: string, userId: string): Promise<boolean> {
        if (!mongoose.isValidObjectId(conversationId) || !mongoose.isValidObjectId(userId)) return false
        return (await Conversation.exists({
            [REALTIME_MODEL_FIELDS.ID]: new mongoose.Types.ObjectId(conversationId),
            [REALTIME_MODEL_FIELDS.DEL_FLAG]: false,
            [REALTIME_MODEL_FIELDS.PARTICIPANTS]: {
                $elemMatch: {
                    [REALTIME_MODEL_FIELDS.PARTICIPANT_USER_ID]: new mongoose.Types.ObjectId(userId),
                    [REALTIME_MODEL_FIELDS.PARTICIPANT_DEL_FLAG]: { $ne: true },
                },
            },
        })) !== null
    }
}
