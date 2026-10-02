import {
    CONVERSATION_KIND,
    CONVERSATION_STATUS,
    CONVERSATION_TYPE,
    GROUP_FIELDS,
    type ConversationType,
} from "@linko/contracts"
import type { PipelineStage } from "mongoose"

import Conversation from "../../models/Conversation"
import User from "../../models/User"
import {
    CONVERSATION_FIELDS,
    CONVERSATION_USER_PROFILE_FIELDS,
    GROUP_AVATAR_FIELDS,
    LAST_MESSAGE_FIELDS,
    PARTICIPANT_FIELDS,
} from "../conversation/conversation.constants"
import { INBOX_ERROR_MESSAGES, INBOX_MODEL_FIELDS } from "./inbox.constants"
import type {
    InboxCursor,
    InboxItemRecord,
    InboxPageQuery,
    InboxPageRecord,
    InboxParticipantRecord,
    InboxRepository,
    ObjectId,
} from "./inbox.types"

/** Query current memberships, visible previews, and requester-only unread counts.
 *
 * @pattern Repository
 * @layer Repository
 */
export class MongooseInboxRepository implements InboxRepository {
    /** Load one bounded inbox page in stable visible-activity order. */
    async findPage(input: InboxPageQuery): Promise<InboxPageRecord> {
        const documents = await Conversation.aggregate<InboxConversationDocument>(
            createInboxPipeline(input),
        ).exec()
        const hasMore = documents.length > input.limit
        const pageDocuments = documents.slice(0, input.limit)
        const userProfiles = await this.findUserProfiles(pageDocuments)
        return {
            items: pageDocuments.map((conversation) => this.toInboxItemRecord(conversation, userProfiles, input.userId)),
            hasMore,
        }
    }

    private async findUserProfiles(
        conversations: readonly InboxConversationDocument[],
    ): Promise<ReadonlyMap<string, InboxUserProfile>> {
        const referencedUsers = conversations.flatMap((conversation) => {
            const currentUserIds = conversation[CONVERSATION_FIELDS.PARTICIPANTS]
                .filter((participant) => participant[PARTICIPANT_FIELDS.DEL_FLAG] !== true)
                .map((participant) => participant[PARTICIPANT_FIELDS.USER_ID])
            const senderId = conversation[CONVERSATION_FIELDS.LAST_MESSAGE]?.[LAST_MESSAGE_FIELDS.SENDER_ID]
            return senderId ? [...currentUserIds, senderId] : currentUserIds
        })
        const uniqueUserIds = Array.from(new Map(referencedUsers.map((id) => [id.toString(), id])).values())
        if (uniqueUserIds.length === 0) return new Map()

        const users = await User.find({ [CONVERSATION_USER_PROFILE_FIELDS.ID]: { $in: uniqueUserIds } })
            .select({
                [CONVERSATION_USER_PROFILE_FIELDS.DISPLAY_NAME]: 1,
                [`${CONVERSATION_USER_PROFILE_FIELDS.AVATAR}.${CONVERSATION_USER_PROFILE_FIELDS.AVATAR_URL}`]: 1,
            })
            .lean()
            .exec()
        return new Map(users.map((user) => [user._id.toString(), {
            id: user._id,
            displayName: user[CONVERSATION_USER_PROFILE_FIELDS.DISPLAY_NAME],
            avatarUrl: user[CONVERSATION_USER_PROFILE_FIELDS.AVATAR]?.[CONVERSATION_USER_PROFILE_FIELDS.AVATAR_URL] ?? null,
        }]))
    }

    private toInboxItemRecord(
        conversation: InboxConversationDocument,
        userProfiles: ReadonlyMap<string, InboxUserProfile>,
        requestingUserId: ObjectId,
    ): InboxItemRecord {
        const participant = conversation[CONVERSATION_FIELDS.PARTICIPANTS].find((entry) =>
            entry[PARTICIPANT_FIELDS.DEL_FLAG] !== true
                && entry[PARTICIPANT_FIELDS.USER_ID].equals(requestingUserId),
        )
        if (!participant) throw new Error(INBOX_ERROR_MESSAGES.INVALID_RECORD)

        const lastMessage = conversation[CONVERSATION_FIELDS.LAST_MESSAGE]
        const lastMessageCreatedAt = lastMessage?.[LAST_MESSAGE_FIELDS.CREATED_AT] ?? null
        const isLastMessageVisible = isMessageVisibleToParticipant(
            conversation[CONVERSATION_FIELDS.TYPE],
            lastMessageCreatedAt,
            participant[PARTICIPANT_FIELDS.JOINED_AT] ?? null,
        )
        const visibleLastMessage = lastMessage && isLastMessageVisible
            ? this.toLastMessageRecord(lastMessage, userProfiles)
            : null
        const group = conversation[CONVERSATION_FIELDS.GROUP]
        return {
            id: conversation[CONVERSATION_FIELDS.ID],
            type: conversation[CONVERSATION_FIELDS.TYPE],
            status: conversation[CONVERSATION_FIELDS.STATUS] ?? CONVERSATION_STATUS.ACTIVE,
            participants: conversation[CONVERSATION_FIELDS.PARTICIPANTS]
                .filter((entry) => entry[PARTICIPANT_FIELDS.DEL_FLAG] !== true)
                .map((entry) => toParticipantRecord(entry, userProfiles)),
            unreadCount: readUnreadCount(
                conversation[CONVERSATION_FIELDS.UNREAD_COUNT],
                requestingUserId.toString(),
            ),
            lastMessage: visibleLastMessage,
            group: group
                ? {
                    name: group[GROUP_FIELDS.NAME],
                    description: group[GROUP_FIELDS.DESCRIPTION] ?? null,
                    avatarUrl: group[GROUP_FIELDS.AVATAR]?.[GROUP_AVATAR_FIELDS.URL] ?? null,
                }
                : null,
            createdAt: conversation[CONVERSATION_FIELDS.CREATED_AT],
            updatedAt: conversation[CONVERSATION_FIELDS.UPDATED_AT],
            activityAt: conversation[INBOX_MODEL_FIELDS.ACTIVITY_AT],
        }
    }

    private toLastMessageRecord(
        message: InboxConversationDocument[typeof CONVERSATION_FIELDS.LAST_MESSAGE],
        userProfiles: ReadonlyMap<string, InboxUserProfile>,
    ): InboxItemRecord["lastMessage"] {
        if (!message) return null
        const senderId = message[LAST_MESSAGE_FIELDS.SENDER_ID]
        const sender = senderId ? userProfiles.get(senderId.toString()) : undefined
        return {
            id: message[LAST_MESSAGE_FIELDS.MESSAGE_ID] ?? null,
            sender: sender
                ? {
                    id: sender.id,
                    displayName: sender.displayName,
                    avatarUrl: sender.avatarUrl,
                }
                : null,
            content: message[LAST_MESSAGE_FIELDS.CONTENT] ?? null,
            createdAt: message[LAST_MESSAGE_FIELDS.CREATED_AT] ?? null,
        }
    }
}

interface InboxUserProfile {
    readonly id: ObjectId
    readonly displayName: string
    readonly avatarUrl: string | null
}

interface InboxConversationParticipantDocument {
    readonly [PARTICIPANT_FIELDS.USER_ID]: ObjectId
    readonly [PARTICIPANT_FIELDS.JOINED_AT]?: Date | null
    readonly [PARTICIPANT_FIELDS.DEL_FLAG]?: boolean
}

interface InboxConversationDocument {
    readonly [CONVERSATION_FIELDS.ID]: ObjectId
    readonly [CONVERSATION_FIELDS.TYPE]: ConversationType
    readonly [CONVERSATION_FIELDS.STATUS]?: InboxItemRecord["status"]
    readonly [CONVERSATION_FIELDS.PARTICIPANTS]: readonly InboxConversationParticipantDocument[]
    readonly [CONVERSATION_FIELDS.UNREAD_COUNT]?: Readonly<Record<string, unknown>> | ReadonlyMap<string, unknown>
    readonly [CONVERSATION_FIELDS.LAST_MESSAGE]?: {
        readonly [LAST_MESSAGE_FIELDS.MESSAGE_ID]?: ObjectId | null
        readonly [LAST_MESSAGE_FIELDS.SENDER_ID]?: ObjectId | null
        readonly [LAST_MESSAGE_FIELDS.CONTENT]?: string | null
        readonly [LAST_MESSAGE_FIELDS.CREATED_AT]?: Date | null
    } | null
    readonly [CONVERSATION_FIELDS.GROUP]?: {
        readonly [GROUP_FIELDS.NAME]: string
        readonly [GROUP_FIELDS.DESCRIPTION]?: string | null
        readonly [GROUP_FIELDS.AVATAR]?: {
            readonly [GROUP_AVATAR_FIELDS.URL]?: string | null
        } | null
    } | null
    readonly [CONVERSATION_FIELDS.CREATED_AT]: Date
    readonly [CONVERSATION_FIELDS.UPDATED_AT]: Date
    readonly [INBOX_MODEL_FIELDS.ACTIVITY_AT]: Date
}

function createInboxPipeline(input: InboxPageQuery): PipelineStage[] {
    const stages: PipelineStage[] = [
        {
            $match: {
                [CONVERSATION_FIELDS.PARTICIPANTS]: {
                    $elemMatch: {
                        [PARTICIPANT_FIELDS.USER_ID]: input.userId,
                        [PARTICIPANT_FIELDS.DEL_FLAG]: { $ne: true },
                    },
                },
            },
        },
    ]
    if (input.kind !== CONVERSATION_KIND.ALL) {
        stages.push({
            $match: {
                [CONVERSATION_FIELDS.TYPE]: input.kind === CONVERSATION_KIND.GROUP
                    ? CONVERSATION_TYPE.GROUP
                    : CONVERSATION_TYPE.DIRECT,
            },
        })
    }
    stages.push({
        $addFields: {
            [INBOX_MODEL_FIELDS.CURRENT_PARTICIPANT]: {
                $arrayElemAt: [{
                    $filter: {
                        input: `$${CONVERSATION_FIELDS.PARTICIPANTS}`,
                        as: INBOX_MODEL_FIELDS.PARTICIPANT_VARIABLE,
                        cond: {
                            $and: [
                                { $eq: ["$$participant.userId", input.userId] },
                                { $ne: ["$$participant.delFlag", true] },
                            ],
                        },
                    },
                }, 0],
            },
        },
    })
    stages.push({
        $addFields: {
            [INBOX_MODEL_FIELDS.ACTIVITY_AT]: {
                $cond: [
                    {
                        $and: [
                            { $ne: [{ $ifNull: [`$${CONVERSATION_FIELDS.LAST_MESSAGE}.${LAST_MESSAGE_FIELDS.CREATED_AT}`, null] }, null] },
                            {
                                $or: [
                                    { $ne: [`$${CONVERSATION_FIELDS.TYPE}`, CONVERSATION_TYPE.GROUP] },
                                    {
                                        $gte: [
                                            `$${CONVERSATION_FIELDS.LAST_MESSAGE}.${LAST_MESSAGE_FIELDS.CREATED_AT}`,
                                            `$${INBOX_MODEL_FIELDS.CURRENT_PARTICIPANT}.${PARTICIPANT_FIELDS.JOINED_AT}`,
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                    `$${CONVERSATION_FIELDS.LAST_MESSAGE}.${LAST_MESSAGE_FIELDS.CREATED_AT}`,
                    `$${CONVERSATION_FIELDS.CREATED_AT}`,
                ],
            },
        },
    })
    if (input.cursor) stages.push({ $match: createCursorMatch(input.cursor) })
    stages.push(
        { $sort: { [INBOX_MODEL_FIELDS.ACTIVITY_AT]: -1, [CONVERSATION_FIELDS.ID]: -1 } },
        { $limit: input.limit + 1 },
    )
    return stages
}

function createCursorMatch(cursor: InboxCursor): Record<string, unknown> {
    return {
        $or: [
            { [INBOX_MODEL_FIELDS.ACTIVITY_AT]: { $lt: cursor.activityAt } },
            {
                [INBOX_MODEL_FIELDS.ACTIVITY_AT]: cursor.activityAt,
                [CONVERSATION_FIELDS.ID]: { $lt: cursor.id },
            },
        ],
    }
}

function toParticipantRecord(
    participant: InboxConversationParticipantDocument,
    userProfiles: ReadonlyMap<string, InboxUserProfile>,
): InboxParticipantRecord {
    const userId = participant[PARTICIPANT_FIELDS.USER_ID]
    const profile = userProfiles.get(userId.toString())
    return {
        id: userId,
        displayName: profile?.displayName ?? null,
        avatarUrl: profile?.avatarUrl ?? null,
        joinedAt: participant[PARTICIPANT_FIELDS.JOINED_AT] ?? null,
    }
}

function isMessageVisibleToParticipant(
    type: ConversationType,
    messageCreatedAt: Date | null,
    joinedAt: Date | null,
): boolean {
    if (!messageCreatedAt) return false
    if (type !== CONVERSATION_TYPE.GROUP) return true
    return joinedAt !== null && messageCreatedAt >= joinedAt
}

function readUnreadCount(
    unreadCounts: InboxConversationDocument[typeof CONVERSATION_FIELDS.UNREAD_COUNT],
    userId: string,
): number {
    if (!unreadCounts) return 0
    const value = unreadCounts instanceof Map
        ? unreadCounts.get(userId)
        : Object.getOwnPropertyDescriptor(unreadCounts, userId)?.value
    return typeof value === "number" && Number.isFinite(value) ? value : 0
}
