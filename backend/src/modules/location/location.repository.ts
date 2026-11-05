import { CONVERSATION_STATUS, UTILITY_LIMITS, UTILITY_STATUS } from "@linko/contracts"
import { Types } from "mongoose"
import Conversation from "../../models/Conversation"
import LocationShare from "../../models/LocationShare"
import Message from "../../models/Message"
import { MESSAGE_MODEL_FIELDS } from "../message/message.constants"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import type { UtilityActor } from "../utility/utility.types"
import { LOCATION_BOUNDS, LOCATION_FIELDS as F } from "./location.constants"
import { UTILITY_LIMITS as LIMITS } from "@linko/contracts"
import type { LocationActor, LocationCreateInput, LocationDocument, LocationRepository, LocationUpdateInput } from "./location.types"

const coordinateRemoval = { [F.LATITUDE]: 1, [F.LONGITUDE]: 1, [F.ACCURACY]: 1, [F.LAST_FIX_AT]: 1 } as const

/** Persist current fixes with atomic ownership/sequence/cadence/expiry checks.
 * @pattern Repository
 * @layer Repository
 */
export class MongooseLocationRepository implements LocationRepository {
    private cleanupCursor: Types.ObjectId | null = null
    /** Resolve a share inside one conversation without exposing the publisher token. */
    async find(input: LocationActor, transaction?: TransactionContext): Promise<LocationDocument | null> {
        return LocationShare.findOne({ [F.ID]: input.resourceId, [F.CONVERSATION_ID]: input.conversationId }).session(transaction?.session ?? null)
    }
    /** Recover an existing share for an idempotent create command. */
    async findByCommand(input: LocationCreateInput, transaction?: TransactionContext): Promise<LocationDocument | null> {
        return LocationShare.findOne({ [F.CONVERSATION_ID]: input.conversationId, [F.CREATOR_ID]: input.actorId, [F.CLIENT_ID]: input.request.clientMessageId }).session(transaction?.session ?? null)
    }
    /** List bounded visible-history sessions for conversation details. */
    async list(input: UtilityActor, joinedAt: Date): Promise<readonly LocationDocument[]> {
        const shares = await LocationShare.find({ [F.CONVERSATION_ID]: input.conversationId, [F.CREATED_AT]: { $gte: joinedAt } }).sort({ [F.CREATED_AT]: -1 }).limit(UTILITY_LIMITS.LIST)
        const sources = await Message.find({ [F.ID]: { $in: shares.map((share) => share.messageId) },
            [F.CONVERSATION_ID]: input.conversationId, [F.CREATED_AT]: { $gte: joinedAt }, [MESSAGE_MODEL_FIELDS.HIDDEN_BY]: { $ne: input.actorId },
        }).select(F.ID)
        const visibleIds = new Set(sources.map((message) => message._id.toString()))
        return shares.filter((share) => visibleIds.has(share.messageId.toString()))
    }
    /** Release a creator's expired unique slot before an explicit new sharing command. */
    async expireForCreator(input: UtilityActor, now: Date, transaction: TransactionContext): Promise<void> {
        await LocationShare.updateMany({ [F.CONVERSATION_ID]: input.conversationId, [F.CREATOR_ID]: input.actorId,
            [F.STATUS]: UTILITY_STATUS.ACTIVE, [F.EXPIRES_AT]: { $lte: now },
        }, { $set: { [F.STATUS]: UTILITY_STATUS.ENDED, [F.ENDED_AT]: now }, $unset: coordinateRemoval, $inc: { [F.REVISION]: 1 } }, { session: transaction.session })
    }
    /** Find an already active share instead of silently replacing its consent scope. */
    async findActive(input: UtilityActor, transaction: TransactionContext): Promise<LocationDocument | null> {
        return LocationShare.findOne({ [F.CONVERSATION_ID]: input.conversationId, [F.CREATOR_ID]: input.actorId, [F.STATUS]: UTILITY_STATUS.ACTIVE }).session(transaction.session)
    }
    /** Store initial coordinates in the same transaction as its timeline card. */
    async create(input: LocationCreateInput, resourceId: Types.ObjectId, messageId: Types.ObjectId, now: Date, transaction: TransactionContext): Promise<LocationDocument> {
        const [share] = await LocationShare.create([{
            [F.ID]: resourceId, [F.CONVERSATION_ID]: input.conversationId, [F.MESSAGE_ID]: messageId, [F.CREATOR_ID]: input.actorId,
            [F.CLIENT_ID]: input.request.clientMessageId, [F.PUBLISHER_ID]: input.request.publisherId,
            [F.LATITUDE]: input.request.latitude, [F.LONGITUDE]: input.request.longitude, [F.ACCURACY]: input.request.accuracy,
            [F.LAST_FIX_AT]: now, [F.EXPIRES_AT]: new Date(now.getTime() + input.request.durationMinutes * LOCATION_BOUNDS.MINUTE_MS),
        }], { session: transaction.session })
        if (!share) throw new Error("Location creation returned no document")
        return share
    }
    /** Reject stale sequence, a second publishing tab, expired consent and excessive update rate. */
    async acceptFix(input: LocationUpdateInput, now: Date, transaction: TransactionContext): Promise<boolean> {
        const fix = input.request
        const result = await LocationShare.updateOne({ [F.ID]: input.resourceId, [F.CONVERSATION_ID]: input.conversationId,
            [F.CREATOR_ID]: input.actorId, [F.PUBLISHER_ID]: fix.publisherId, [F.STATUS]: UTILITY_STATUS.ACTIVE,
            [F.EXPIRES_AT]: { $gt: now }, [F.SEQUENCE]: { $lt: fix.sequence }, [F.LAST_FIX_AT]: { $lte: new Date(now.getTime() - LIMITS.LOCATION_INTERVAL_MS) },
        }, { $set: { [F.LATITUDE]: fix.latitude, [F.LONGITUDE]: fix.longitude, [F.ACCURACY]: fix.accuracy,
            [F.LAST_FIX_AT]: now, [F.SEQUENCE]: fix.sequence }, $inc: { [F.REVISION]: 1 } }, { session: transaction.session })
        return result.modifiedCount === 1
    }
    /** End consent idempotently and remove stored precise coordinates immediately. */
    async end(input: LocationActor, now: Date, transaction?: TransactionContext): Promise<boolean> {
        const result = await LocationShare.updateOne({ [F.ID]: input.resourceId, [F.CONVERSATION_ID]: input.conversationId, [F.STATUS]: UTILITY_STATUS.ACTIVE }, {
            $set: { [F.STATUS]: UTILITY_STATUS.ENDED, [F.ENDED_AT]: now }, $unset: coordinateRemoval, $inc: { [F.REVISION]: 1 },
        }, { session: transaction?.session })
        return result.modifiedCount === 1
    }
    /** A departed/rejoined sender or closed conversation can never keep an older share live. */
    async ownerIsCurrent(share: LocationDocument, transaction?: TransactionContext): Promise<boolean> {
        return (await this.currentOwnerShareIds([share], transaction)).has(share._id.toString())
    }
    /** Resolve publisher membership in one query for a conversation's batch of cards. */
    async currentOwnerShareIds(shares: readonly LocationDocument[], transaction?: TransactionContext): Promise<ReadonlySet<string>> {
        const ids = new Set<string>()
        if (shares.length === 0) return ids
        const conversation = await Conversation.findById(shares[0]?.conversationId).session(transaction?.session ?? null)
        if (!conversation || conversation[CONVERSATION_FIELDS.STATUS] !== CONVERSATION_STATUS.ACTIVE) return ids
        const sources = await Message.find({ [F.ID]: { $in: shares.map((share) => share.messageId) } }).session(transaction?.session ?? null)
        const bySource = new Map(sources.map((message) => [message._id.toString(), message]))
        for (const share of shares) {
            const owner = conversation[CONVERSATION_FIELDS.PARTICIPANTS].find((member) => member[PARTICIPANT_FIELDS.USER_ID].equals(share.creatorId)
                && member[PARTICIPANT_FIELDS.DEL_FLAG] !== true && !member[PARTICIPANT_FIELDS.LEFT_AT])
            const source = bySource.get(share.messageId.toString())
            if (!owner || !source) continue
            const joinedAt = owner[PARTICIPANT_FIELDS.JOINED_AT] ?? conversation[CONVERSATION_FIELDS.CREATED_AT]
            const clearedAt = owner[PARTICIPANT_FIELDS.CLEARED_HISTORY_AT]
            const boundary = clearedAt && clearedAt > joinedAt ? clearedAt : joinedAt
            const hidden = source[MESSAGE_MODEL_FIELDS.HIDDEN_BY].some((userId) => userId.equals(share.creatorId))
            if (joinedAt <= share.createdAt && source.createdAt >= boundary && !hidden) ids.add(share._id.toString())
        }
        return ids
    }
    /** Scan a bounded oldest-expiring active batch; expiry checks never depend on cleanup timing. */
    async cleanupCandidates(): Promise<readonly LocationDocument[]> {
        const shares = await LocationShare.find({ [F.STATUS]: UTILITY_STATUS.ACTIVE,
            ...(this.cleanupCursor ? { [F.ID]: { $gt: this.cleanupCursor } } : {}),
        }).sort({ [F.ID]: 1 }).limit(LOCATION_BOUNDS.CLEANUP_BATCH)
        this.cleanupCursor = shares.length === LOCATION_BOUNDS.CLEANUP_BATCH ? shares[shares.length - 1]?._id ?? null : null
        return shares
    }
}
