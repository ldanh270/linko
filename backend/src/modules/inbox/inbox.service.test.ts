import {
    CONVERSATION_KIND,
    CONVERSATION_STATUS,
    CONVERSATION_TYPE,
    GROUP_FIELDS,
    ROLE,
} from "@linko/contracts"
import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import Conversation from "../../models/Conversation"
import User from "../../models/User"
import { CONVERSATION_FIELDS, LAST_MESSAGE_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import { MongooseInboxRepository } from "./inbox.repository"
import { InboxService } from "./inbox.service"

const TEST_WIRED_TIGER_CACHE_SIZE_GB = "0.25"

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger",
            args: [`--wiredTigerCacheSizeGB=${TEST_WIRED_TIGER_CACHE_SIZE_GB}`],
        },
    })
    await mongoose.connect(replicaSet.getUri(), { dbName: "inbox-service-test" })
    await Promise.all([Conversation.init(), User.init()])
})

beforeEach(async () => {
    await Promise.all([Conversation.collection.deleteMany({}), User.collection.deleteMany({})])
})

afterAll(async () => {
    await mongoose.disconnect()
    await replicaSet?.stop()
})

describe("inbox service", () => {
    it("should_hide_a_group_after_the_requesting_member_leaves", async () => {
        const ownerId = await createAccount("left-owner")
        const memberId = await createAccount("left-member")
        const leftConversationId = await createGroup(ownerId, memberId)
        const currentConversationId = await createGroup(ownerId, memberId)
        await Conversation.updateOne(
            { [CONVERSATION_FIELDS.ID]: leftConversationId },
            {
                $set: {
                    [`${CONVERSATION_FIELDS.PARTICIPANTS}.1.${PARTICIPANT_FIELDS.DEL_FLAG}`]: true,
                    [`${CONVERSATION_FIELDS.PARTICIPANTS}.1.${PARTICIPANT_FIELDS.LEFT_AT}`]: new Date(),
                },
            },
        )

        const page = await createService().list({
            userId: memberId,
            kind: CONVERSATION_KIND.ALL,
            limit: 20,
        })

        expect(page.items.map((item) => item.id.toString())).toContain(currentConversationId.toString())
        expect(page.items.map((item) => item.id.toString())).not.toContain(leftConversationId.toString())
    })

    it("should_hide_a_pre_join_last_message_from_the_inbox_preview", async () => {
        const ownerId = await createAccount("prejoin-owner")
        const memberId = await createAccount("prejoin-member")
        const oldMessageAt = new Date(Date.now() - 60_000)
        const joinedAt = new Date(Date.now() - 30_000)
        const conversationId = await createGroup(ownerId, memberId, {
            joinedAt,
            lastMessageAt: oldMessageAt,
        })

        const page = await createService().list({
            userId: memberId,
            kind: CONVERSATION_KIND.ALL,
            limit: 20,
        })
        const memberConversation = page.items.find((item) => item.id.toString() === conversationId.toString())

        expect(memberConversation?.lastMessage).toBeNull()
    })

    it("should_sort_by_visible_activity_and_use_creation_time_for_empty_conversations", async () => {
        const ownerId = await createAccount("sort-owner")
        const recentEmpty = await createGroup(ownerId, undefined, {
            createdAt: new Date(Date.now() - 15_000),
        })
        const olderActivity = await createGroup(ownerId, undefined, {
            createdAt: new Date(Date.now() - 120_000),
            lastMessageAt: new Date(Date.now() - 90_000),
        })

        const page = await createService().list({
            userId: ownerId,
            kind: CONVERSATION_KIND.ALL,
            limit: 20,
        })

        expect(page.items.map((item) => item.id.toString())).toEqual([
            recentEmpty.toString(),
            olderActivity.toString(),
        ])
    })

    it("should_return_only_the_requesting_members_unread_count", async () => {
        const ownerId = await createAccount("unread-owner")
        const memberId = await createAccount("unread-member")
        const conversationId = await createGroup(ownerId, memberId, {
            unreadCounts: { [ownerId.toString()]: 3, [memberId.toString()]: 7 },
        })

        const page = await createService().list({
            userId: memberId,
            kind: CONVERSATION_KIND.ALL,
            limit: 20,
        })
        const memberConversation = page.items.find((item) => item.id === conversationId.toString())

        expect(memberConversation?.unreadCount).toBe(7)
    })

    it("should_keep_a_closed_group_visible_to_its_current_members", async () => {
        const ownerId = await createAccount("closed-owner")
        const conversationId = await createGroup(ownerId, undefined, {
            status: CONVERSATION_STATUS.CLOSED,
        })

        const page = await createService().list({
            userId: ownerId,
            kind: CONVERSATION_KIND.ALL,
            limit: 20,
        })

        expect(page.items).toMatchObject([{ id: conversationId.toString(), status: CONVERSATION_STATUS.CLOSED }])
    })

    it("should_page_same_timestamp_activity_by_id_without_repeating_items", async () => {
        const ownerId = await createAccount("tie-owner")
        const activityAt = new Date(Date.now() - 30_000)
        const earlierId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439101")
        const laterId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439102")
        await Promise.all([
            createGroup(ownerId, undefined, { id: earlierId, createdAt: activityAt }),
            createGroup(ownerId, undefined, { id: laterId, createdAt: activityAt }),
        ])

        const service = createService()
        const firstPage = await service.list({
            userId: ownerId,
            kind: CONVERSATION_KIND.ALL,
            limit: 1,
        })
        const secondPage = await service.list({
            userId: ownerId,
            kind: CONVERSATION_KIND.ALL,
            cursor: firstPage.nextCursor ?? undefined,
            limit: 1,
        })

        expect(firstPage.items.map((item) => item.id)).toEqual([laterId.toString()])
        expect(firstPage.nextCursor).toEqual(expect.any(String))
        expect(secondPage.items.map((item) => item.id)).toEqual([earlierId.toString()])
        expect(secondPage.nextCursor).toBeNull()
    })
})

function createService(): InboxService {
    return new InboxService({
        repository: new MongooseInboxRepository(),
    })
}

async function createAccount(suffix: string): Promise<mongoose.Types.ObjectId> {
    const user = await User.create({
        username: `inbox_service_${suffix}`,
        email: `inbox_service_${suffix}@example.com`,
        displayName: `Inbox ${suffix}`,
        hashedPassword: "inbox-service-test-hash",
    })
    return user._id
}

async function createGroup(
    ownerId: mongoose.Types.ObjectId,
    memberId?: mongoose.Types.ObjectId,
    options: {
        readonly joinedAt?: Date
        readonly createdAt?: Date
        readonly lastMessageAt?: Date
        readonly status?: (typeof CONVERSATION_STATUS)[keyof typeof CONVERSATION_STATUS]
        readonly id?: mongoose.Types.ObjectId
        readonly unreadCounts?: Readonly<Record<string, number>>
    } = {},
): Promise<mongoose.Types.ObjectId> {
    const messageId = new mongoose.Types.ObjectId()
    const createdAt = options.createdAt ?? new Date(Date.now() - 120_000)
    const conversation = await Conversation.create({
        ...(options.id ? { [CONVERSATION_FIELDS.ID]: options.id } : {}),
        [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
        [CONVERSATION_FIELDS.STATUS]: options.status,
        [CONVERSATION_FIELDS.PARTICIPANTS]: [
            {
                [PARTICIPANT_FIELDS.USER_ID]: ownerId,
                [PARTICIPANT_FIELDS.ROLE]: ROLE.OWNER,
                [PARTICIPANT_FIELDS.JOINED_AT]: options.joinedAt ?? createdAt,
            },
            ...(memberId ? [{
                [PARTICIPANT_FIELDS.USER_ID]: memberId,
                [PARTICIPANT_FIELDS.ROLE]: ROLE.MEMBER,
                [PARTICIPANT_FIELDS.JOINED_AT]: options.joinedAt ?? createdAt,
            }] : []),
        ],
        [CONVERSATION_FIELDS.GROUP]: {
            [GROUP_FIELDS.NAME]: "Inbox service test",
            [GROUP_FIELDS.OWNER_ID]: ownerId,
        },
        [CONVERSATION_FIELDS.LAST_MESSAGE]: options.lastMessageAt
            ? {
                [LAST_MESSAGE_FIELDS.MESSAGE_ID]: messageId,
                [LAST_MESSAGE_FIELDS.SENDER_ID]: ownerId,
                [LAST_MESSAGE_FIELDS.CONTENT]: "Older message",
                [LAST_MESSAGE_FIELDS.CREATED_AT]: options.lastMessageAt,
            }
            : null,
        [CONVERSATION_FIELDS.UNREAD_COUNT]: options.unreadCounts ?? { [ownerId.toString()]: 3 },
        [CONVERSATION_FIELDS.CREATED_AT]: createdAt,
        [CONVERSATION_FIELDS.UPDATED_AT]: createdAt,
    })
    return conversation._id
}
