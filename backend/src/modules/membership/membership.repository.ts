import {
    CONVERSATION_STATUS,
    CONVERSATION_TYPE,
    GROUP_FIELDS,
    GROUP_LIMITS,
    ROLE,
    type GroupMemberRole,
} from "@linko/contracts"
import type { HydratedDocument } from "mongoose"

import Conversation, { type ConversationType } from "../../models/Conversation"
import User from "../../models/User"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import {
    CONVERSATION_FIELDS,
    CONVERSATION_USER_PROFILE_FIELDS,
    PARTICIPANT_FIELDS,
} from "../conversation/conversation.constants"
import { MEMBERSHIP_ADD_OUTCOMES, MEMBERSHIP_MESSAGES } from "./membership.constants"
import type {
    AddMemberRecordInput,
    AddMemberResult,
    ChangeRoleRecordInput,
    MembershipGroupRecord,
    MembershipMemberRecord,
    MembershipRepository,
    ObjectId,
    RemoveMemberRecordInput,
    TransferOwnerRecordInput,
} from "./membership.types"

type ParticipantDocument = HydratedDocument<ConversationType>["participants"][number]

interface UserProfile {
    readonly displayName: string | null
    readonly avatarUrl: string | null
}

/** Isolate group participant persistence and translate stored member profile fields.
 *
 * @pattern Repository
 * @layer Repository
 */
export class MongooseMembershipRepository implements MembershipRepository {
    /** Read an active group and safe member profile fields within an optional transaction. */
    async findGroup(conversationId: ObjectId, transaction?: TransactionContext): Promise<MembershipGroupRecord | null> {
        const document = await this.findGroupDocument(conversationId, transaction)
        return document ? this.toGroupRecord(document, transaction) : null
    }

    /** Add one invitation member without allowing duplicate participants or exceeding capacity. */
    async addMember(input: AddMemberRecordInput, transaction: TransactionContext): Promise<AddMemberResult> {
        const document = await this.findGroupDocument(input.conversationId, transaction)
        if (!document) return { outcome: MEMBERSHIP_ADD_OUTCOMES.MISSING }
        if (document[CONVERSATION_FIELDS.STATUS] === CONVERSATION_STATUS.CLOSED) {
            return { outcome: MEMBERSHIP_ADD_OUTCOMES.CLOSED }
        }
        const existing = document[CONVERSATION_FIELDS.PARTICIPANTS].find((participant) =>
            participant[PARTICIPANT_FIELDS.DEL_FLAG] !== true
                && participant[PARTICIPANT_FIELDS.USER_ID].equals(input.userId),
        )
        if (existing) {
            const group = await this.toGroupRecord(document, transaction)
            const member = group.members.find(({ userId }) => userId.equals(input.userId))
            return member
                ? { outcome: MEMBERSHIP_ADD_OUTCOMES.EXISTING, member }
                : { outcome: MEMBERSHIP_ADD_OUTCOMES.STALE }
        }
        const activeMemberCount = document[CONVERSATION_FIELDS.PARTICIPANTS]
            .filter((participant) => participant[PARTICIPANT_FIELDS.DEL_FLAG] !== true).length
        if (activeMemberCount >= GROUP_LIMITS.MAX_MEMBERS_PER_GROUP) {
            return { outcome: MEMBERSHIP_ADD_OUTCOMES.LIMIT }
        }

        document[CONVERSATION_FIELDS.PARTICIPANTS].push({
            [PARTICIPANT_FIELDS.USER_ID]: input.userId,
            [PARTICIPANT_FIELDS.ROLE]: ROLE.MEMBER,
            [PARTICIPANT_FIELDS.JOINED_AT]: input.joinedAt,
        })
        await document.save({ session: transaction.session })
        const group = await this.toGroupRecord(document, transaction)
        const member = group.members.find(({ userId }) => userId.equals(input.userId))
        return member
            ? { outcome: MEMBERSHIP_ADD_OUTCOMES.ADDED, member }
            : { outcome: MEMBERSHIP_ADD_OUTCOMES.STALE }
    }

    /** Change one member role only while the transaction snapshot still matches its input roles. */
    async changeRole(input: ChangeRoleRecordInput, transaction: TransactionContext): Promise<MembershipMemberRecord | null> {
        const document = await this.findGroupDocument(input.conversationId, transaction)
        if (!document) return null
        const actor = document[CONVERSATION_FIELDS.PARTICIPANTS].find((participant) =>
            participant[PARTICIPANT_FIELDS.DEL_FLAG] !== true
                && participant[PARTICIPANT_FIELDS.USER_ID].equals(input.actorId),
        )
        const target = document[CONVERSATION_FIELDS.PARTICIPANTS].find((participant) =>
            participant[PARTICIPANT_FIELDS.DEL_FLAG] !== true
                && participant[PARTICIPANT_FIELDS.USER_ID].equals(input.targetUserId),
        )
        if (!actor || !target || actor[PARTICIPANT_FIELDS.ROLE] !== input.actorRole || target[PARTICIPANT_FIELDS.ROLE] !== input.targetRole) {
            return null
        }
        target[PARTICIPANT_FIELDS.ROLE] = input.role
        await document.save({ session: transaction.session })
        const group = await this.toGroupRecord(document, transaction)
        return group.members.find(({ userId }) => userId.equals(input.targetUserId)) ?? null
    }

    /** Remove one member only while the transaction snapshot still matches its input roles. */
    async removeMember(input: RemoveMemberRecordInput, transaction: TransactionContext): Promise<boolean> {
        const document = await this.findGroupDocument(input.conversationId, transaction)
        if (!document) return false
        const actor = document[CONVERSATION_FIELDS.PARTICIPANTS].find((participant) =>
            participant[PARTICIPANT_FIELDS.DEL_FLAG] !== true
                && participant[PARTICIPANT_FIELDS.USER_ID].equals(input.actorId),
        )
        const targetIndex = document[CONVERSATION_FIELDS.PARTICIPANTS].findIndex((participant) =>
            participant[PARTICIPANT_FIELDS.DEL_FLAG] !== true
                && participant[PARTICIPANT_FIELDS.USER_ID].equals(input.targetUserId),
        )
        const target = targetIndex >= 0 ? document[CONVERSATION_FIELDS.PARTICIPANTS][targetIndex] : undefined
        if (!actor || !target || actor[PARTICIPANT_FIELDS.ROLE] !== input.actorRole || target[PARTICIPANT_FIELDS.ROLE] !== input.targetRole) {
            return false
        }
        target[PARTICIPANT_FIELDS.LEFT_AT] = input.leftAt
        target[PARTICIPANT_FIELDS.DEL_FLAG] = true
        await document.save({ session: transaction.session })
        return true
    }

    /** Transfer the group owner and embedded roles with one atomic document save. */
    async transferOwner(input: TransferOwnerRecordInput, transaction: TransactionContext): Promise<boolean> {
        const document = await this.findGroupDocument(input.conversationId, transaction)
        if (!document) return false
        const group = document[CONVERSATION_FIELDS.GROUP]
        const oldOwner = document[CONVERSATION_FIELDS.PARTICIPANTS].find((participant) =>
            participant[PARTICIPANT_FIELDS.DEL_FLAG] !== true
                && participant[PARTICIPANT_FIELDS.USER_ID].equals(input.actorId),
        )
        const newOwner = document[CONVERSATION_FIELDS.PARTICIPANTS].find((participant) =>
            participant[PARTICIPANT_FIELDS.DEL_FLAG] !== true
                && participant[PARTICIPANT_FIELDS.USER_ID].equals(input.newOwnerId),
        )
        if (
            !group?.[GROUP_FIELDS.OWNER_ID]?.equals(input.actorId)
            || oldOwner?.[PARTICIPANT_FIELDS.ROLE] !== ROLE.OWNER
            || newOwner?.[PARTICIPANT_FIELDS.ROLE] !== input.newOwnerRole
        ) return false

        group[GROUP_FIELDS.OWNER_ID] = input.newOwnerId
        oldOwner[PARTICIPANT_FIELDS.ROLE] = ROLE.ADMIN
        newOwner[PARTICIPANT_FIELDS.ROLE] = ROLE.OWNER
        await document.save({ session: transaction.session })
        return true
    }

    private async findGroupDocument(
        conversationId: ObjectId,
        transaction?: TransactionContext,
    ): Promise<HydratedDocument<ConversationType> | null> {
        const query = Conversation.findOne({
            [CONVERSATION_FIELDS.ID]: conversationId,
            [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
        })
        if (transaction) query.session(transaction.session)
        return query.exec()
    }

    private async toGroupRecord(
        document: HydratedDocument<ConversationType>,
        transaction?: TransactionContext,
    ): Promise<MembershipGroupRecord> {
        const ownerId = document[CONVERSATION_FIELDS.GROUP]?.[GROUP_FIELDS.OWNER_ID]
        if (!ownerId) throw new Error(MEMBERSHIP_MESSAGES.INVALID_GROUP_RECORD)
        const userIds = document[CONVERSATION_FIELDS.PARTICIPANTS].map((participant) =>
            participant[PARTICIPANT_FIELDS.USER_ID],
        )
        const userQuery = User.find({ [CONVERSATION_USER_PROFILE_FIELDS.ID]: { $in: userIds } }).select({
            [CONVERSATION_USER_PROFILE_FIELDS.DISPLAY_NAME]: 1,
            [`${CONVERSATION_USER_PROFILE_FIELDS.AVATAR}.${CONVERSATION_USER_PROFILE_FIELDS.AVATAR_URL}`]: 1,
        })
        if (transaction) userQuery.session(transaction.session)
        const users = await userQuery.exec()
        const profiles = new Map<string, UserProfile>(users.map((user) => [user._id.toString(), {
            displayName: user[CONVERSATION_USER_PROFILE_FIELDS.DISPLAY_NAME] ?? null,
            avatarUrl: user[CONVERSATION_USER_PROFILE_FIELDS.AVATAR]?.[CONVERSATION_USER_PROFILE_FIELDS.AVATAR_URL] ?? null,
        }]))
        return {
            conversationId: document[CONVERSATION_FIELDS.ID],
            ownerId,
            status: document[CONVERSATION_FIELDS.STATUS] ?? CONVERSATION_STATUS.ACTIVE,
            members: document[CONVERSATION_FIELDS.PARTICIPANTS]
                .filter((participant) => participant[PARTICIPANT_FIELDS.DEL_FLAG] !== true)
                .map((participant) => this.toMemberRecord(participant, profiles)),
        }
    }

    private toMemberRecord(participant: ParticipantDocument, profiles: ReadonlyMap<string, UserProfile>): MembershipMemberRecord {
        const role = participant[PARTICIPANT_FIELDS.ROLE]
        if (!isGroupMemberRole(role)) throw new Error(MEMBERSHIP_MESSAGES.INVALID_GROUP_RECORD)
        const userId = participant[PARTICIPANT_FIELDS.USER_ID]
        const profile = profiles.get(userId.toString())
        return {
            userId,
            role,
            displayName: profile?.displayName ?? null,
            avatarUrl: profile?.avatarUrl ?? null,
            joinedAt: participant[PARTICIPANT_FIELDS.JOINED_AT] ?? null,
        }
    }
}

/** Recognize only roles valid for group participants. */
function isGroupMemberRole(role: string): role is GroupMemberRole {
    return role === ROLE.OWNER || role === ROLE.ADMIN || role === ROLE.MEMBER
}
