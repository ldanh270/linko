import { CONVERSATION_STATUS, CONVERSATION_TYPE, GROUP_FIELDS, ROLE } from "@linko/contracts"
import type { HydratedDocument, UpdateQuery } from "mongoose"

import Conversation, { type ConversationType } from "../../models/Conversation"
import User from "../../models/User"
import {
    CONVERSATION_FIELDS,
    CONVERSATION_USER_PROFILE_FIELDS,
    GROUP_AVATAR_FIELDS,
    GROUP_MESSAGES,
    GROUP_USER_FIELDS,
    LAST_MESSAGE_FIELDS,
    PARTICIPANT_FIELDS,
} from "./conversation.constants"
import type {
    ConversationRepository,
    CreateGroupRecord,
    GroupAvatarRecord,
    GroupRecord,
    GroupSlotReservation,
    GroupSummaryRecord,
    ObjectId,
    ConversationSummaryRecord,
    UpdateGroupRecord,
} from "./conversation.types"
import type { TransactionContext } from "../../shared/persistence/withTransaction"

/** Isolate MongoDB operations for group creation, listing, and metadata updates.
 *
 * User group counts are initialized from active memberships on first use, then incremented
 * atomically with group creation so parallel requests cannot exceed the product cap.
 *
 * @pattern Repository
 * @layer Repository
 */
export class MongooseConversationRepository implements ConversationRepository {
    /** Reserve one group slot while serializing creations for this account. */
    async reserveGroupSlot(
        ownerId: ObjectId,
        limit: number,
        transaction: TransactionContext,
    ): Promise<GroupSlotReservation> {
        const user = await User.findById(ownerId)
            .select(`+${GROUP_USER_FIELDS.GROUP_CONVERSATION_COUNT}`)
            .session(transaction.session)
            .lean()
        if (!user) return "missing"

        let groupCount = user[GROUP_USER_FIELDS.GROUP_CONVERSATION_COUNT]
        if (typeof groupCount !== "number") {
            groupCount = await Conversation.countDocuments({
                [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
                [`${CONVERSATION_FIELDS.PARTICIPANTS}.${PARTICIPANT_FIELDS.USER_ID}`]: ownerId,
            }).session(transaction.session)
            await User.updateOne(
                { _id: ownerId, [GROUP_USER_FIELDS.GROUP_CONVERSATION_COUNT]: { $exists: false } },
                { $set: { [GROUP_USER_FIELDS.GROUP_CONVERSATION_COUNT]: groupCount } },
                { session: transaction.session },
            )
        }

        const reservation = await User.updateOne(
            { _id: ownerId, [GROUP_USER_FIELDS.GROUP_CONVERSATION_COUNT]: { $lt: limit } },
            { $inc: { [GROUP_USER_FIELDS.GROUP_CONVERSATION_COUNT]: 1 } },
            { session: transaction.session },
        )
        return reservation.modifiedCount === 1 ? "reserved" : "limit"
    }

    /** Persist a private group with its creator as its sole initial participant. */
    async createGroup(input: CreateGroupRecord, transaction: TransactionContext): Promise<GroupRecord> {
        const [conversation] = await Conversation.create([{
            [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
            [CONVERSATION_FIELDS.PARTICIPANTS]: [{
                [PARTICIPANT_FIELDS.USER_ID]: input.ownerId,
                [PARTICIPANT_FIELDS.ROLE]: ROLE.OWNER,
            }],
            [CONVERSATION_FIELDS.GROUP]: {
                [GROUP_FIELDS.OWNER_ID]: input.ownerId,
                [GROUP_FIELDS.NAME]: input.name,
                [GROUP_FIELDS.DESCRIPTION]: input.description,
                ...(input.avatar ? {
                    [GROUP_FIELDS.AVATAR]: {
                        [GROUP_AVATAR_FIELDS.URL]: input.avatar.url,
                        [GROUP_AVATAR_FIELDS.ID]: input.avatar.id,
                    },
                } : {}),
            },
        }], { session: transaction.session })

        if (!conversation) throw new Error(GROUP_MESSAGES.INVALID_RECORD)
        return this.toGroupRecord(conversation)
    }

    /** Find active groups where the user is a current participant. */
    async findGroupsByParticipant(userId: ObjectId): Promise<readonly GroupSummaryRecord[]> {
        const conversations = await Conversation.find({
            [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
            [CONVERSATION_FIELDS.PARTICIPANTS]: {
                $elemMatch: {
                    [PARTICIPANT_FIELDS.USER_ID]: userId,
                    [PARTICIPANT_FIELDS.DEL_FLAG]: { $ne: true },
                },
            },
        }).sort({
            [`${CONVERSATION_FIELDS.LAST_MESSAGE}.${CONVERSATION_FIELDS.CREATED_AT}`]: -1,
            [CONVERSATION_FIELDS.UPDATED_AT]: -1,
        })

        return conversations.map((conversation) => ({
            ...this.toGroupRecord(conversation),
            memberCount: conversation[CONVERSATION_FIELDS.PARTICIPANTS]
                .filter((participant) => participant[PARTICIPANT_FIELDS.DEL_FLAG] !== true).length,
        }))
    }

    /** Find active direct and group conversations visible to one inbox owner. */
    async findConversationsByParticipant(userId: ObjectId): Promise<readonly ConversationSummaryRecord[]> {
        const conversations = await Conversation.find({
            [CONVERSATION_FIELDS.PARTICIPANTS]: {
                $elemMatch: {
                    [PARTICIPANT_FIELDS.USER_ID]: userId,
                    [PARTICIPANT_FIELDS.DEL_FLAG]: { $ne: true },
                },
            },
        }).sort({
            [`${CONVERSATION_FIELDS.LAST_MESSAGE}.${LAST_MESSAGE_FIELDS.CREATED_AT}`]: -1,
            [CONVERSATION_FIELDS.UPDATED_AT]: -1,
        })

        const userIds = conversations.flatMap((conversation) => {
            const participantIds = conversation[CONVERSATION_FIELDS.PARTICIPANTS]
                .filter((participant) => participant[PARTICIPANT_FIELDS.DEL_FLAG] !== true)
                .flatMap((participant) => {
                const participantId = participant[PARTICIPANT_FIELDS.USER_ID]
                return participantId ? [participantId] : []
            })
            const senderId = conversation[CONVERSATION_FIELDS.LAST_MESSAGE]?.[LAST_MESSAGE_FIELDS.SENDER_ID]
            return senderId ? [...participantIds, senderId] : participantIds
        })
        const uniqueUserIds = Array.from(new Map(userIds.map((id) => [id.toString(), id])).values())
        const users = await User.find({ [CONVERSATION_USER_PROFILE_FIELDS.ID]: { $in: uniqueUserIds } }).select({
            [CONVERSATION_USER_PROFILE_FIELDS.DISPLAY_NAME]: 1,
            [`${CONVERSATION_USER_PROFILE_FIELDS.AVATAR}.${CONVERSATION_USER_PROFILE_FIELDS.AVATAR_URL}`]: 1,
        })
        const userProfiles = new Map(users.map((user) => [user._id.toString(), {
            id: user._id,
            displayName: user[CONVERSATION_USER_PROFILE_FIELDS.DISPLAY_NAME],
            avatarUrl: user[CONVERSATION_USER_PROFILE_FIELDS.AVATAR]?.[CONVERSATION_USER_PROFILE_FIELDS.AVATAR_URL] ?? null,
        }]))

        return conversations.map((conversation) => this.toConversationSummaryRecord(conversation, userProfiles, userId))
    }

    /** Load a group by ID, optionally within the caller's transaction. */
    async findGroupById(conversationId: ObjectId, transaction?: TransactionContext): Promise<GroupRecord | null> {
        const query = Conversation.findOne({
            [CONVERSATION_FIELDS.ID]: conversationId,
            [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
        })
        if (transaction) query.session(transaction.session)
        const conversation = await query
        return conversation ? this.toGroupRecord(conversation) : null
    }

    /** Update selected group subdocument fields and return the committed record. */
    async updateGroup(
        conversationId: ObjectId,
        input: UpdateGroupRecord,
        transaction: TransactionContext,
    ): Promise<GroupRecord | null> {
        const changes: Record<string, unknown> = {}
        if (input.name !== undefined) changes[`${CONVERSATION_FIELDS.GROUP}.${GROUP_FIELDS.NAME}`] = input.name
        if (input.description !== undefined) {
            changes[`${CONVERSATION_FIELDS.GROUP}.${GROUP_FIELDS.DESCRIPTION}`] = input.description
        }
        if (input.avatar !== undefined) {
            changes[`${CONVERSATION_FIELDS.GROUP}.${GROUP_FIELDS.AVATAR}`] = {
                [GROUP_AVATAR_FIELDS.URL]: input.avatar.url,
                [GROUP_AVATAR_FIELDS.ID]: input.avatar.id,
            }
        }

        const update: UpdateQuery<ConversationType> = { $set: changes } as UpdateQuery<ConversationType>
        const conversation = await Conversation.findOneAndUpdate(
            {
                [CONVERSATION_FIELDS.ID]: conversationId,
                [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
            },
            update,
            { returnDocument: "after", session: transaction.session, runValidators: true },
        )
        return conversation ? this.toGroupRecord(conversation) : null
    }

    private toGroupRecord(conversation: HydratedDocument<ConversationType>): GroupRecord {
        const group = conversation[CONVERSATION_FIELDS.GROUP]
        if (!group?.[GROUP_FIELDS.OWNER_ID]) throw new Error(GROUP_MESSAGES.INVALID_RECORD)

        const avatarValue = group[GROUP_FIELDS.AVATAR]
        const avatarUrl = avatarValue?.[GROUP_AVATAR_FIELDS.URL]
        const avatarId = avatarValue?.[GROUP_AVATAR_FIELDS.ID]
        const avatar: GroupAvatarRecord | null = typeof avatarUrl === "string" && typeof avatarId === "string"
            ? {
                url: avatarUrl,
                id: avatarId,
            }
            : null
        return {
            id: conversation[CONVERSATION_FIELDS.ID],
            ownerId: group[GROUP_FIELDS.OWNER_ID],
            name: group[GROUP_FIELDS.NAME] ?? "",
            description: group[GROUP_FIELDS.DESCRIPTION] ?? null,
            avatar,
            status: conversation[CONVERSATION_FIELDS.STATUS] ?? CONVERSATION_STATUS.ACTIVE,
            participants: conversation[CONVERSATION_FIELDS.PARTICIPANTS]
                .filter((participant) => participant[PARTICIPANT_FIELDS.DEL_FLAG] !== true)
                .map((participant) => ({
                userId: participant[PARTICIPANT_FIELDS.USER_ID],
                role: participant[PARTICIPANT_FIELDS.ROLE] as GroupRecord["participants"][number]["role"],
            })),
            createdAt: conversation[CONVERSATION_FIELDS.CREATED_AT],
            updatedAt: conversation[CONVERSATION_FIELDS.UPDATED_AT],
            lastMessageAt: conversation[CONVERSATION_FIELDS.LAST_MESSAGE]?.[CONVERSATION_FIELDS.CREATED_AT] ?? null,
        }
    }

    private toConversationSummaryRecord(
        conversation: HydratedDocument<ConversationType>,
        userProfiles: ReadonlyMap<string, ConversationUserProfile>,
        requestingUserId: ObjectId,
    ): ConversationSummaryRecord {
        const group = conversation[CONVERSATION_FIELDS.GROUP]
        const lastMessage = conversation[CONVERSATION_FIELDS.LAST_MESSAGE]
        const lastMessageSenderId = lastMessage?.[LAST_MESSAGE_FIELDS.SENDER_ID]
        const sender = lastMessageSenderId
            ? userProfiles.get(lastMessageSenderId.toString()) ?? null
            : null
        const requestingParticipant = conversation[CONVERSATION_FIELDS.PARTICIPANTS].find(
            (participant) => participant[PARTICIPANT_FIELDS.DEL_FLAG] !== true
                && (participant[PARTICIPANT_FIELDS.USER_ID]?.equals(requestingUserId) ?? false),
        )
        const lastMessageCreatedAt = lastMessage?.[LAST_MESSAGE_FIELDS.CREATED_AT]
        const requesterJoinedAt = requestingParticipant?.[PARTICIPANT_FIELDS.JOINED_AT]
        const isLastMessageVisible = isLastMessageVisibleToUser(
            conversation[CONVERSATION_FIELDS.TYPE],
            lastMessageCreatedAt,
            requesterJoinedAt,
        )
        const avatar = group?.[GROUP_FIELDS.AVATAR]
        return {
            id: conversation[CONVERSATION_FIELDS.ID],
            type: conversation[CONVERSATION_FIELDS.TYPE],
            status: conversation[CONVERSATION_FIELDS.STATUS] ?? CONVERSATION_STATUS.ACTIVE,
            participants: conversation[CONVERSATION_FIELDS.PARTICIPANTS]
                .filter((participant) => participant[PARTICIPANT_FIELDS.DEL_FLAG] !== true)
                .flatMap((participant) => {
                const participantId = participant[PARTICIPANT_FIELDS.USER_ID]
                if (!participantId) return []
                const user = userProfiles.get(participantId.toString())
                return [{
                    userId: participantId,
                    displayName: user?.displayName ?? null,
                    avatarUrl: user?.avatarUrl ?? null,
                    joinedAt: participant[PARTICIPANT_FIELDS.JOINED_AT] ?? null,
                }]
            }),
            unreadCount: Object.fromEntries(conversation[CONVERSATION_FIELDS.UNREAD_COUNT].entries()),
            lastMessage: lastMessage && isLastMessageVisible
                ? {
                    id: lastMessage[LAST_MESSAGE_FIELDS.MESSAGE_ID] ?? null,
                    sender: sender
                        ? {
                            id: sender.id,
                            displayName: sender.displayName,
                            avatarUrl: sender.avatarUrl,
                        }
                        : null,
                    content: lastMessage[LAST_MESSAGE_FIELDS.CONTENT] ?? null,
                    createdAt: lastMessage[LAST_MESSAGE_FIELDS.CREATED_AT] ?? null,
                }
                : null,
            group: group
                ? {
                    name: group[GROUP_FIELDS.NAME],
                    description: group[GROUP_FIELDS.DESCRIPTION] ?? null,
                    avatarUrl: avatar?.[GROUP_AVATAR_FIELDS.URL] ?? null,
                }
                : null,
            createdAt: conversation[CONVERSATION_FIELDS.CREATED_AT],
            updatedAt: conversation[CONVERSATION_FIELDS.UPDATED_AT],
        }
    }
}

interface ConversationUserProfile {
    readonly id: ObjectId
    readonly displayName: string
    readonly avatarUrl: string | null
}

/** Hide group previews unless their timestamp proves the member had already joined. */
function isLastMessageVisibleToUser(
    conversationType: ConversationSummaryRecord["type"],
    messageCreatedAt: Date | null | undefined,
    memberJoinedAt: Date | null | undefined,
): boolean {
    if (conversationType !== CONVERSATION_TYPE.GROUP) return true
    return messageCreatedAt != null && memberJoinedAt != null && messageCreatedAt >= memberJoinedAt
}
