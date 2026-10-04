import {
    API_ROUTES,
    CONVERSATION_PARAMS,
    CONVERSATION_STATUS,
    CONVERSATION_TYPE,
    ERROR_CODES,
    GROUP_FIELDS,
    NOTIFICATION_PREFERENCE_FIELDS,
    NOTIFICATION_PREFERENCE_REQUEST_FIELDS,
    NOTIFICATION_PREFERENCE_ROUTE_PATHS,
    ROLE,
} from "@linko/contracts"
import express from "express"
import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { createApp } from "../../app"
import Conversation from "../../models/Conversation"
import User from "../../models/User"
import { createLogger } from "../../shared/logger/logger"
import { AuthTokenService } from "../auth/auth.security"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"

const TEST_TOKEN_SECRET = "notification-route-tests-use-a-sufficiently-long-secret"
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
    await mongoose.connect(replicaSet.getUri(), { dbName: "notification-route-test" })
    await Promise.all([Conversation.init(), User.init()])
})

beforeEach(async () => {
    await Promise.all([Conversation.collection.deleteMany({}), User.collection.deleteMany({})])
})

afterAll(async () => {
    await mongoose.disconnect()
    await replicaSet?.stop()
})

describe("notification preference HTTP routes", () => {
    it("should_update_and_restore_only_the_authenticated_members_group_preference", async () => {
        const owner = await createAccount("scope-owner")
        const member = await createAccount("scope-member")
        const otherMember = await createAccount("scope-other")
        const firstGroupId = await createGroup(owner.id, [member.id, otherMember.id], "scope-first")
        const secondGroupId = await createGroup(owner.id, [member.id], "scope-second")
        const app = createTestApp()

        const muted = await request(app)
            .put(preferencePath(firstGroupId.toString()))
            .set("Authorization", `Bearer ${member.token}`)
            .send({ [NOTIFICATION_PREFERENCE_REQUEST_FIELDS.IS_MUTED]: true })
        const readBack = await request(app)
            .get(preferencePath(firstGroupId.toString()))
            .set("Authorization", `Bearer ${member.token}`)
        const restored = await request(app)
            .put(preferencePath(firstGroupId.toString()))
            .set("Authorization", `Bearer ${member.token}`)
            .send({ [NOTIFICATION_PREFERENCE_REQUEST_FIELDS.IS_MUTED]: false })
        const otherConversation = await request(app)
            .get(preferencePath(secondGroupId.toString()))
            .set("Authorization", `Bearer ${member.token}`)
        const otherParticipant = await request(app)
            .get(preferencePath(firstGroupId.toString()))
            .set("Authorization", `Bearer ${otherMember.token}`)

        expect(muted.status).toBe(200)
        expect(muted.body).toMatchObject({
            success: true,
            data: {
                [NOTIFICATION_PREFERENCE_FIELDS.CONVERSATION_ID]: firstGroupId.toString(),
                [NOTIFICATION_PREFERENCE_FIELDS.IS_MUTED]: true,
            },
        })
        expect(readBack.body.data[NOTIFICATION_PREFERENCE_FIELDS.IS_MUTED]).toBe(true)
        expect(restored.body.data[NOTIFICATION_PREFERENCE_FIELDS.IS_MUTED]).toBe(false)
        expect(otherConversation.body.data[NOTIFICATION_PREFERENCE_FIELDS.IS_MUTED]).toBe(false)
        expect(otherParticipant.body.data[NOTIFICATION_PREFERENCE_FIELDS.IS_MUTED]).toBe(false)
    })

    it("should_return_not_found_for_a_nonmember_preference_read", async () => {
        const owner = await createAccount("private-owner")
        const outsider = await createAccount("private-outsider")
        const conversationId = await createGroup(owner.id, [], "private")

        const response = await request(createTestApp())
            .get(preferencePath(conversationId.toString()))
            .set("Authorization", `Bearer ${outsider.token}`)

        expect(response.status).toBe(404)
        expect(response.body.error.code).toBe(ERROR_CODES.NOT_FOUND)
    })

    it("should_reject_a_preference_read_after_the_member_leaves", async () => {
        const owner = await createAccount("left-owner")
        const member = await createAccount("left-member")
        const groupId = await createGroup(owner.id, [member.id], "left")
        await Conversation.updateOne(
            {
                [CONVERSATION_FIELDS.ID]: groupId,
                [CONVERSATION_FIELDS.PARTICIPANTS]: { $elemMatch: { [PARTICIPANT_FIELDS.USER_ID]: member.id } },
            },
            {
                $set: {
                    [`${CONVERSATION_FIELDS.PARTICIPANTS}.$.${PARTICIPANT_FIELDS.DEL_FLAG}`]: true,
                    [`${CONVERSATION_FIELDS.PARTICIPANTS}.$.${PARTICIPANT_FIELDS.LEFT_AT}`]: new Date(),
                },
            },
        )

        const response = await request(createTestApp())
            .get(preferencePath(groupId.toString()))
            .set("Authorization", `Bearer ${member.token}`)

        expect(response.status).toBe(404)
        expect(response.body.error.code).toBe(ERROR_CODES.NOT_FOUND)
    })

    it("should_reject_changing_a_direct_conversation_preference", async () => {
        const owner = await createAccount("direct-owner")
        const member = await createAccount("direct-member")
        const conversation = await Conversation.create({
            [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.DIRECT,
            [CONVERSATION_FIELDS.PARTICIPANTS]: [
                { [PARTICIPANT_FIELDS.USER_ID]: owner.id, [PARTICIPANT_FIELDS.ROLE]: ROLE.DIRECT },
                { [PARTICIPANT_FIELDS.USER_ID]: member.id, [PARTICIPANT_FIELDS.ROLE]: ROLE.DIRECT },
            ],
        })

        const response = await request(createTestApp())
            .put(preferencePath(conversation._id.toString()))
            .set("Authorization", `Bearer ${owner.token}`)
            .send({ [NOTIFICATION_PREFERENCE_REQUEST_FIELDS.IS_MUTED]: true })

        expect(response.status).toBe(403)
        expect(response.body.error.code).toBe(ERROR_CODES.FORBIDDEN)
    })
})

function createTestApp() {
    return createApp({
        publicRoutes: express.Router(),
        privateRoutes: express.Router(),
        logger: createLogger(() => undefined),
        authConfig: {
            accessTokenSecret: TEST_TOKEN_SECRET,
            clientOrigin: "https://linko.example",
            refreshCookie: { path: "/", secure: false, sameSite: "lax" },
        },
    })
}

async function createAccount(suffix: string): Promise<{
    readonly id: mongoose.Types.ObjectId
    readonly token: string
}> {
    const user = await User.create({
        username: `notification_${suffix}`,
        email: `notification_${suffix}@example.com`,
        displayName: `Notification ${suffix}`,
        hashedPassword: "notification-route-test-hash",
    })
    return { id: user._id, token: new AuthTokenService(TEST_TOKEN_SECRET).createAccessToken(user._id.toString()) }
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
            [GROUP_FIELDS.NAME]: `Notification ${suffix}`,
            [GROUP_FIELDS.OWNER_ID]: ownerId,
        },
    })
    return conversation._id
}

function preferencePath(conversationId: string): string {
    return `${API_ROUTES.CONVERSATIONS}${NOTIFICATION_PREFERENCE_ROUTE_PATHS.BY_CONVERSATION.replace(
        `:${CONVERSATION_PARAMS.ID}`,
        conversationId,
    )}`
}
