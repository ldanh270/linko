import type { PipelineStage, Types } from "mongoose"
import Conversation from "../../models/Conversation"
import Message from "../../models/Message"
import { CONVERSATION_FIELDS as C, PARTICIPANT_FIELDS as P } from "../conversation/conversation.constants"
import { MESSAGE_MODEL_FIELDS as M } from "../message/message.constants"
import { REMINDER_FIELDS as F, REMINDER_STATUS as S } from "./reminder.constants"

/** Aggregation-only names avoid persisting authorization snapshots on reminder jobs. */
const INBOX_LOOKUP = { CONVERSATION: "inboxConversation", SOURCE: "inboxSource", MEMBER: "inboxMember", BOUNDARY: "inboxBoundary" } as const

/** Filter reminder rows by current owner membership and visible source before paging or counting. */
export function visibleReminderPipeline(ownerId: Types.ObjectId): PipelineStage[] {
  return [
    { $match: { [F.OWNER]: ownerId, [F.DELETED]: false, [F.STATUS]: { $in: [S.PENDING, S.CLAIMED, S.DELIVERED] } } },
    { $lookup: {
      from: Conversation.collection.name, let: { conversationId: `$${F.CONVERSATION}` }, as: INBOX_LOOKUP.CONVERSATION,
      pipeline: [
        { $match: { [C.DEL_FLAG]: false, $expr: { $eq: [`$${C.ID}`, "$$conversationId"] } } },
        { $set: { [INBOX_LOOKUP.MEMBER]: { $arrayElemAt: [{ $filter: { input: `$${C.PARTICIPANTS}`, as: "member", cond: { $and: [
          { $eq: [`$$member.${P.USER_ID}`, ownerId] }, { $ne: [`$$member.${P.DEL_FLAG}`, true] }, { $eq: [{ $ifNull: [`$$member.${P.LEFT_AT}`, null] }, null] },
        ] } } }, 0] } } },
        { $match: { [`${INBOX_LOOKUP.MEMBER}.${P.USER_ID}`]: ownerId } },
        { $project: { [INBOX_LOOKUP.BOUNDARY]: { $max: [{ $ifNull: [`$${INBOX_LOOKUP.MEMBER}.${P.JOINED_AT}`, `$${C.CREATED_AT}`] }, `$${INBOX_LOOKUP.MEMBER}.${P.CLEARED_HISTORY_AT}`] } } },
      ],
    } },
    { $unwind: `$${INBOX_LOOKUP.CONVERSATION}` },
    { $lookup: {
      from: Message.collection.name, let: { messageId: `$${F.MESSAGE}`, conversationId: `$${F.CONVERSATION}`, boundary: `$${INBOX_LOOKUP.CONVERSATION}.${INBOX_LOOKUP.BOUNDARY}` }, as: INBOX_LOOKUP.SOURCE,
      pipeline: [
        { $match: { [M.DEL_FLAG]: false, $expr: { $and: [
          { $eq: [`$${M.ID}`, "$$messageId"] }, { $eq: [`$${M.CONVERSATION_ID}`, "$$conversationId"] },
          { $gte: [`$${M.CREATED_AT}`, "$$boundary"] }, { $not: [{ $in: [ownerId, { $ifNull: [`$${M.HIDDEN_BY}`, []] }] }] },
        ] } } },
        { $project: { [M.ID]: 1 } },
      ],
    } },
    { $match: { [`${INBOX_LOOKUP.SOURCE}.0`]: { $exists: true } } },
    { $unset: [INBOX_LOOKUP.CONVERSATION, INBOX_LOOKUP.SOURCE] },
  ]
}
