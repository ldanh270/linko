import { CONVERSATION_STATUS } from "@linko/contracts"
import Conversation from "../../models/Conversation"
import Message from "../../models/Message"
import { CONVERSATION_FIELDS as C, PARTICIPANT_FIELDS as P } from "../conversation/conversation.constants"
import { MESSAGE_MODEL_FIELDS as M } from "../message/message.constants"
import { MongooseMessageRepository } from "../message/message.repository"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import type { UtilityAccessRepository } from "./utility.access"
import { UTILITY_FIELDS } from "./utility.constants"
import type { UtilityActor, UtilityMembership } from "./utility.types"

/** Isolate membership, visibility and transactional write fences.
 * @pattern Repository
 * @layer Repository
 */
export class MongooseUtilityAccessRepository implements UtilityAccessRepository {
  /** Reuse the existing friendship repository boundary. */
  constructor(private readonly messages: Pick<MongooseMessageRepository, "areFriends">) {}

  /** Load only active participants with the strictest current history boundary. */
  async membership(input: UtilityActor, transaction?: TransactionContext): Promise<UtilityMembership | null> {
    const conversation = await Conversation.findById(input.conversationId).session(transaction?.session ?? null)
    if (!conversation) return null
    const active = conversation[C.PARTICIPANTS].filter((member) => member[P.DEL_FLAG] !== true && !member[P.LEFT_AT])
    const member = active.find((candidate) => candidate[P.USER_ID].equals(input.actorId))
    if (!member) return null
    const joinedAt = member[P.JOINED_AT] ?? conversation[C.CREATED_AT]
    const clearedAt = member[P.CLEARED_HISTORY_AT]
    return {
      role: member[P.ROLE], type: conversation[C.TYPE], status: conversation[C.STATUS] ?? CONVERSATION_STATUS.ACTIVE,
      joinedAt: clearedAt && clearedAt > joinedAt ? clearedAt : joinedAt,
      memberIds: active.map((participant) => participant[P.USER_ID]),
    }
  }

  /** Match the viewer's history boundary and hidden-message exclusions. */
  async visibleMessage(input: UtilityActor, joinedAt: Date, transaction?: TransactionContext): Promise<boolean> {
    return await Message.exists({ [M.ID]: input.messageId, [M.CONVERSATION_ID]: input.conversationId, [M.CREATED_AT]: { $gte: joinedAt }, [M.HIDDEN_BY]: { $ne: input.actorId } }).session(transaction?.session ?? null) !== null
  }

  /** Enforce the existing direct-chat friendship requirement. */
  async areFriends(memberIds: UtilityMembership["memberIds"], transaction?: TransactionContext): Promise<boolean> {
    const [first, second] = memberIds
    return memberIds.length === 2 && first !== undefined && second !== undefined && this.messages.areFriends(first, second, transaction)
  }

  /** Conflict with membership changes made concurrently with a utility write. */
  async fence(input: UtilityActor, transaction: TransactionContext): Promise<void> {
    await Conversation.updateOne({ [C.ID]: input.conversationId }, { $inc: { [UTILITY_FIELDS.REVISION]: 1 } }, { session: transaction.session })
  }
}
