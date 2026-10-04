import {
    CONVERSATION_STATUS,
    CONVERSATION_TYPE,
    ERROR_CODES,
    GROUP_FIELDS,
    ROLE,
} from "@linko/contracts"
import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import Conversation from "../../models/Conversation"
import User from "../../models/User"
import { withTransaction } from "../../shared/persistence/withTransaction"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import { MongooseMessageRepository } from "../message/message.repository"
import type { MessageRecord } from "../message/message.types"
import { MongooseNotificationRepository } from "./notification.repository"
import { NotificationPreferenceService } from "./notification.service"

const TEST_WIRED_TIGER_CACHE_SIZE_GB = "0.25"
const CURRENT_TIME = new Date("2026-10-04T14:00:00.000Z")
const LEGACY_MUTE_EXPIRY = new Date("2026-10-04T15:00:00.000Z")

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger",
            args: [`--wiredTigerCacheSizeGB=${TEST_WIRED_TIGER_CACHE_SIZE_GB}`],
        },
    })
    await mongoose.connect(replicaSet.getUri(), { dbName: "notification-preference-test" })
    await Promise.all([Conversation.init(), User.init()])
})

beforeEach(async () => {
    await Promise.all([Conversation.collection.deleteMany({}), User.collection.deleteMany({})])
})

afterAll(async () => {
    await mongoose.disconnect()
    await replicaSet?.stop()
})

describe("NotificationPreferenceService", () => {
    it("should_mute_only_the_current_member_in_the_selected_group", async () => {
        const ownerId = await createAccount("scope-owner")
        const memberId = await createAccount("scope-member")
        const otherMemberId = await createAccount("scope-other")
        const firstGroupId = await createGroup(ownerId, [memberId, otherMemberId], "scope-first")
        const secondGroupId = await createGroup(ownerId, [memberId], "scope-second")
        const service = createService()

        await expect(service.setMuted({ conversationId: firstGroupId, userId: memberId, isMuted: true }))
            .resolves.toEqual({ conversationId: firstGroupId.toString(), isMuted: true })

        await expect(service.get(memberId, firstGroupId))
            .resolves.toEqual({ conversationId: firstGroupId.toString(), isMuted: true })
        await expect(service.get(otherMemberId, firstGroupId))
            .resolves.toEqual({ conversationId: firstGroupId.toString(), isMuted: false })
        await expect(service.get(memberId, secondGroupId))
            .resolves.toEqual({ conversationId: secondGroupId.toString(), isMuted: false })
    })

    it("should_keep_incrementing_unread_count_after_a_member_mutes_the_group", async () => {
        const ownerId = await createAccount("unread-owner")
        const memberId = await createAccount("unread-member")
        const conversationId = await createGroup(ownerId, [memberId], "unread")
        const messageRepository = new MongooseMessageRepository()

        await createService().setMuted({ conversationId, userId: memberId, isMuted: true })
        await withTransaction((transaction) => messageRepository.updateConversationAfterMessage(
            createMessageRecord(conversationId, ownerId),
            transaction,
        ))

        const conversation = await Conversation.findById(conversationId)
        expect(conversation?.[CONVERSATION_FIELDS.UNREAD_COUNT].get(memberId.toString())).toBe(1)
    })

    it("should_continue_to_read_a_legacy_mute_until_that_has_not_expired", async () => {
        const ownerId = await createAccount("legacy-owner")
        const memberId = await createAccount("legacy-member")
        const conversationId = await createGroup(ownerId, [memberId], "legacy")
        await Conversation.collection.updateOne(
            { [CONVERSATION_FIELDS.ID]: conversationId },
            {
                $set: {
                    [`${CONVERSATION_FIELDS.PARTICIPANTS}.1.${PARTICIPANT_FIELDS.MUTED_UNTIL}`]: LEGACY_MUTE_EXPIRY,
                },
                $unset: {
                    [`${CONVERSATION_FIELDS.PARTICIPANTS}.1.${PARTICIPANT_FIELDS.IS_MUTED}`]: "",
                },
            },
        )

        await expect(createService().get(memberId, conversationId))
            .resolves.toEqual({ conversationId: conversationId.toString(), isMuted: true })
    })

    it("should_reject_a_nonmember_preference_read", async () => {
        const ownerId = await createAccount("private-owner")
        const outsiderId = await createAccount("private-outsider")
        const conversationId = await createGroup(ownerId, [], "private")

        await expect(createService().get(outsiderId, conversationId))
            .rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND })
    })
})

function createService(): NotificationPreferenceService {
    return new NotificationPreferenceService({
        repository: new MongooseNotificationRepository(),
        transactionRunner: { run: withTransaction },
        clock: { now: () => new Date(CURRENT_TIME) },
    })
}

async function createAccount(suffix: string): Promise<mongoose.Types.ObjectId> {
    const user = await User.create({
        username: `mute_${suffix}`,
        email: `mute_${suffix}@example.com`,
        displayName: `Mute ${suffix}`,
        hashedPassword: "mute-test-hash",
    })
    return user._id
}

async function createGroup(
    ownerId: mongoose.Types.ObjectId,
    memberIds: readonly mongoose.Types.ObjectId[],
    suffix: string,
): Promise<mongoose.Types.ObjectId> {
    const conversation = await Conversation.create({
        [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
        [CONVERSATION_FIELDS.STATUS]: CONVERSATION_STATUS.ACTIVE,
        [CONVERSATION_FIELDS.PARTICIPANTS]: [
            { [PARTICIPANT_FIELDS.USER_ID]: ownerId, [PARTICIPANT_FIELDS.ROLE]: ROLE.OWNER },
            ...memberIds.map((userId) => ({
                [PARTICIPANT_FIELDS.USER_ID]: userId,
                [PARTICIPANT_FIELDS.ROLE]: ROLE.MEMBER,
            })),
        ],
        [CONVERSATION_FIELDS.GROUP]: {
            [GROUP_FIELDS.NAME]: `Mute ${suffix}`,
            [GROUP_FIELDS.OWNER_ID]: ownerId,
        },
        [CONVERSATION_FIELDS.UNREAD_COUNT]: {},
    })
    return conversation._id
}

function createMessageRecord(conversationId: mongoose.Types.ObjectId, senderId: mongoose.Types.ObjectId): MessageRecord {
    const now = new Date(CURRENT_TIME)
    return {
        id: new mongoose.Types.ObjectId(),
        conversationId,
        senderId,
        clientMessageId: "mute-unread-message",
        content: "Unread still increments",
        replyToId: null,
        mentions: [],
        attachments: [],
        createdAt: now,
        updatedAt: now,
    }
}
