import { UTILITY_LIMITS, UTILITY_STATUS } from "@linko/contracts"
import { Types } from "mongoose"
import Poll from "../../models/Poll"
import PollVote from "../../models/PollVote"
import Conversation from "../../models/Conversation"
import Message from "../../models/Message"
import { MESSAGE_MODEL_FIELDS } from "../message/message.constants"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import { POLL_FIELDS as F } from "./poll.constants"
import type { PollActor, PollCreateInput, PollDocument, PollRepository, PollVoteInput, EligiblePollVote } from "./poll.types"
import type { UtilityActor } from "../utility/utility.types"

/** Isolate poll persistence and current-membership vote eligibility.
 * @pattern Repository
 * @layer Repository
 */
export class MongoosePollRepository implements PollRepository {
    /** Resolve a poll only inside the requested conversation. */
    async find(input: PollActor, transaction?: TransactionContext): Promise<PollDocument | null> {
        return Poll.findOne({ [F.ID]: input.resourceId, [F.CONVERSATION_ID]: input.conversationId }).session(transaction?.session ?? null)
    }
    /** Recover the unique sender command without creating a second card. */
    async findByCommand(input: PollCreateInput, transaction?: TransactionContext): Promise<PollDocument | null> {
        return Poll.findOne({ [F.CONVERSATION_ID]: input.conversationId, [F.CREATOR_ID]: input.actorId, [F.CLIENT_ID]: input.request.clientMessageId }).session(transaction?.session ?? null)
    }
    /** List a bounded newest-first snapshot after the viewer history boundary. */
    async list(input: UtilityActor, joinedAt: Date): Promise<readonly PollDocument[]> {
        const polls = await Poll.find({ [F.CONVERSATION_ID]: input.conversationId, [F.CREATED_AT]: { $gte: joinedAt } }).sort({ [F.CREATED_AT]: -1 }).limit(UTILITY_LIMITS.LIST)
        const visibleSources = await Message.find({ [F.ID]: { $in: polls.map((poll) => poll.messageId) },
            [F.CONVERSATION_ID]: input.conversationId, [F.CREATED_AT]: { $gte: joinedAt }, [MESSAGE_MODEL_FIELDS.HIDDEN_BY]: { $ne: input.actorId },
        }).select(F.ID)
        const visibleIds = new Set(visibleSources.map((message) => message._id.toString()))
        return polls.filter((poll) => visibleIds.has(poll.messageId.toString()))
    }
    /** Create a poll definition in its timeline-message transaction. */
    async create(input: PollCreateInput, resourceId: Types.ObjectId, messageId: Types.ObjectId, transaction: TransactionContext): Promise<PollDocument> {
        const [poll] = await Poll.create([{
            [F.ID]: resourceId, [F.CONVERSATION_ID]: input.conversationId, [F.MESSAGE_ID]: messageId, [F.CREATOR_ID]: input.actorId,
            [F.CLIENT_ID]: input.request.clientMessageId, [F.QUESTION]: input.request.question, [F.OPTIONS]: input.request.options.map((text) => ({ [F.TEXT]: text })),
            [F.MODE]: input.request.mode, [F.CLOSES_AT]: input.request.closesAt ? new Date(input.request.closesAt) : null,
        }], { session: transaction.session })
        if (!poll) throw new Error("Poll creation returned no document")
        return poll
    }
    /** Exclude departed members and votes cast before their current membership began. */
    async eligibleVotes(poll: PollDocument, transaction?: TransactionContext): Promise<readonly EligiblePollVote[]> {
        return (await this.eligibleVotesMany([poll], transaction)).get(poll._id.toString()) ?? []
    }
    /** Hydrate one conversation's named results using a constant number of queries. */
    async eligibleVotesMany(polls: readonly PollDocument[], transaction?: TransactionContext): Promise<ReadonlyMap<string, readonly EligiblePollVote[]>> {
        const results = new Map<string, EligiblePollVote[]>(polls.map((poll) => [poll._id.toString(), []]))
        if (polls.length === 0) return results
        const conversation = await Conversation.findById(polls[0]?.conversationId).session(transaction?.session ?? null)
        if (!conversation) return results
        const messages = await Message.find({ [F.ID]: { $in: polls.map((poll) => poll.messageId) } }).session(transaction?.session ?? null)
        const byPollId = new Map(polls.map((poll) => [poll._id.toString(), poll]))
        const byMessageId = new Map(messages.map((message) => [message._id.toString(), message]))
        const votes = await PollVote.find({ [F.POLL_ID]: { $in: polls.map((poll) => poll._id) } }).session(transaction?.session ?? null)
        const participants = conversation[CONVERSATION_FIELDS.PARTICIPANTS]
        for (const vote of votes) {
            const poll = byPollId.get(vote.pollId.toString())
            const message = poll ? byMessageId.get(poll.messageId.toString()) : undefined
            if (!message) continue
            const participant = participants.find((member) => member[PARTICIPANT_FIELDS.USER_ID].equals(vote.userId)
                && member[PARTICIPANT_FIELDS.DEL_FLAG] !== true && !member[PARTICIPANT_FIELDS.LEFT_AT])
            if (!participant) continue
            const boundary = participant[PARTICIPANT_FIELDS.JOINED_AT] ?? conversation[CONVERSATION_FIELDS.CREATED_AT]
            const clearedAt = participant[PARTICIPANT_FIELDS.CLEARED_HISTORY_AT]
            const historyBoundary = clearedAt && clearedAt > boundary ? clearedAt : boundary
            const hidden = message[MESSAGE_MODEL_FIELDS.HIDDEN_BY].some((userId) => userId.equals(vote.userId))
            if (vote.votedAt >= boundary && message.createdAt >= historyBoundary && !hidden) {
                results.get(vote.pollId.toString())?.push({ userId: vote.userId.toString(), optionIds: vote.optionIds.map(String) })
            }
        }
        return results
    }
    /** Replace rather than increment a user's vote so retries and tabs cannot double count. */
    async replaceVote(input: PollVoteInput, now: Date, transaction: TransactionContext): Promise<void> {
        const filter = { [F.POLL_ID]: input.resourceId, [F.USER_ID]: input.actorId, [F.DELETED]: { $ne: true } }
        if (input.optionIds.length === 0) {
            await PollVote.updateOne(filter, { $set: { [F.DELETED]: true } }, { session: transaction.session })
            return
        }
        await PollVote.findOneAndUpdate(filter, { $set: {
            [F.OPTION_IDS]: input.optionIds.map((id) => new Types.ObjectId(id)), [F.VOTED_AT]: now,
        } }, { upsert: true, session: transaction.session })
    }
    /** Serialize close/vote races by writing the poll revision before changing a vote. */
    async bumpRevision(poll: PollDocument, now: Date, close: boolean, transaction: TransactionContext): Promise<boolean> {
        const result = await Poll.updateOne({ [F.ID]: poll._id, [F.REVISION]: poll.revision, [F.STATUS]: UTILITY_STATUS.ACTIVE,
            $or: [{ [F.CLOSES_AT]: null }, { [F.CLOSES_AT]: { $gt: now } }],
        }, { $inc: { [F.REVISION]: 1 }, ...(close ? { $set: { [F.STATUS]: UTILITY_STATUS.CLOSED } } : {}) }, { session: transaction.session })
        return result.modifiedCount === 1
    }
}
