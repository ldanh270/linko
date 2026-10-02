import {
    API_ROUTES,
    CONVERSATION_KIND,
    CONVERSATION_QUERY_PARAMS,
    CONVERSATION_STATUS,
    CONVERSATION_TYPE,
    ERROR_CODES,
    GROUP_FIELDS,
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
import { AuthTokenService } from "../auth/auth.security"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import { createLogger } from "../../shared/logger/logger"

const TEST_TOKEN_SECRET = "inbox-route-tests-use-a-sufficiently-long-secret"
const TEST_WIRED_TIGER_CACHE_SIZE_GB = "0.25"
const MEMBERSHIP_START_TIME = new Date("2026-10-03T10:00:00.000Z")

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger",
            args: [`--wiredTigerCacheSizeGB=${TEST_WIRED_TIGER_CACHE_SIZE_GB}`],
        },
    })
    await mongoose.connect(replicaSet.getUri(), { dbName: "inbox-route-test" })
    await Promise.all([Conversation.init(), User.init()])
})

beforeEach(async () => {
    await Promise.all([Conversation.collection.deleteMany({}), User.collection.deleteMany({})])
})

afterAll(async () => {
    await mongoose.disconnect()
    await replicaSet?.stop()
})

describe("inbox HTTP routes", () => {
    it("should_require_an_authenticated_session", async () => {
        const response = await request(createTestApp()).get(API_ROUTES.CONVERSATIONS)

        expect(response.status).toBe(401)
        expect(response.body.error.code).toBe(ERROR_CODES.UNAUTHORIZED)
    })

    it("should_validate_kind_cursor_and_maximum_page_size", async () => {
        const account = await createAccount("validation")
        const app = createTestApp()

        const invalidKind = await request(app)
            .get(API_ROUTES.CONVERSATIONS)
            .query({ [CONVERSATION_QUERY_PARAMS.KIND]: "private" })
            .set("Authorization", `Bearer ${account.token}`)
        const invalidCursor = await request(app)
            .get(API_ROUTES.CONVERSATIONS)
            .query({
                [CONVERSATION_QUERY_PARAMS.KIND]: CONVERSATION_KIND.GROUP,
                [CONVERSATION_QUERY_PARAMS.CURSOR]: "not-a-cursor",
            })
            .set("Authorization", `Bearer ${account.token}`)
        const oversizedPage = await request(app)
            .get(API_ROUTES.CONVERSATIONS)
            .query({
                [CONVERSATION_QUERY_PARAMS.KIND]: CONVERSATION_KIND.GROUP,
                [CONVERSATION_QUERY_PARAMS.LIMIT]: "51",
            })
            .set("Authorization", `Bearer ${account.token}`)

        expect(invalidKind.status).toBe(400)
        expect(invalidKind.body.error.code).toBe(ERROR_CODES.VALIDATION)
        expect(invalidCursor.status).toBe(400)
        expect(invalidCursor.body.error.code).toBe(ERROR_CODES.VALIDATION)
        expect(oversizedPage.status).toBe(400)
        expect(oversizedPage.body.error.code).toBe(ERROR_CODES.VALIDATION)
    })

    it("should_return_an_empty_page_when_the_user_has_no_current_membership", async () => {
        const owner = await createAccount("nonmember-owner")
        const outsider = await createAccount("nonmember-outsider")
        await createGroup(owner._id)

        const response = await request(createTestApp())
            .get(API_ROUTES.CONVERSATIONS)
            .set("Authorization", `Bearer ${outsider.token}`)

        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
            success: true,
            data: { items: [], nextCursor: null },
            error: null,
        })
    })

    it("should_return_cursor_pages_with_only_the_callers_unread_count", async () => {
        const owner = await createAccount("page-owner")
        const otherMember = await createAccount("page-other")
        await createGroup(owner._id, {
            memberId: otherMember._id,
            unreadCounts: { [owner._id.toString()]: 4, [otherMember._id.toString()]: 9 },
            createdAt: new Date(Date.now() - 90_000),
        })
        await createGroup(owner._id, {
            createdAt: new Date(Date.now() - 30_000),
            unreadCounts: { [owner._id.toString()]: 2 },
        })

        const response = await request(createTestApp())
            .get(API_ROUTES.CONVERSATIONS)
            .query({
                [CONVERSATION_QUERY_PARAMS.KIND]: CONVERSATION_KIND.GROUP,
                [CONVERSATION_QUERY_PARAMS.LIMIT]: "1",
            })
            .set("Authorization", `Bearer ${owner.token}`)

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data.items).toHaveLength(1)
        expect(response.body.data.items[0].unreadCount).toBe(2)
        expect(response.body.data.nextCursor).toEqual(expect.any(String))
    })

    it("should_filter_direct_conversations_and_keep_closed_groups_visible", async () => {
        const owner = await createAccount("kind-owner")
        const peer = await createAccount("kind-peer")
        const closedGroupId = await createGroup(owner._id, { status: CONVERSATION_STATUS.CLOSED })
        await createDirectConversation(owner._id, peer._id)
        const app = createTestApp()

        const groupPage = await request(app)
            .get(API_ROUTES.CONVERSATIONS)
            .query({ [CONVERSATION_QUERY_PARAMS.KIND]: CONVERSATION_KIND.GROUP })
            .set("Authorization", `Bearer ${owner.token}`)
        const directPage = await request(app)
            .get(API_ROUTES.CONVERSATIONS)
            .query({ [CONVERSATION_QUERY_PARAMS.KIND]: CONVERSATION_KIND.DIRECT })
            .set("Authorization", `Bearer ${owner.token}`)

        expect(groupPage.status).toBe(200)
        expect(groupPage.body.data.items).toMatchObject([{
            id: closedGroupId.toString(),
            status: CONVERSATION_STATUS.CLOSED,
            type: CONVERSATION_TYPE.GROUP,
        }])
        expect(directPage.status).toBe(200)
        expect(directPage.body.data.items).toHaveLength(1)
        expect(directPage.body.data.items[0].type).toBe(CONVERSATION_TYPE.DIRECT)
    })
})

/** Compose the production application with isolated auth and logging settings. */
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

/** Create an authenticated user for inbox visibility assertions. */
async function createAccount(suffix: string): Promise<{
    readonly _id: mongoose.Types.ObjectId
    readonly token: string
}> {
    const user = await User.create({
        username: `inbox_route_${suffix}`,
        email: `inbox_route_${suffix}@example.com`,
        displayName: `Inbox ${suffix}`,
        hashedPassword: "inbox-route-test-hash",
    })
    return {
        _id: user._id,
        token: new AuthTokenService(TEST_TOKEN_SECRET).createAccessToken(user._id.toString()),
    }
}

/** Persist a current group membership and optional inbox metadata. */
async function createGroup(
    ownerId: mongoose.Types.ObjectId,
    options: {
        readonly memberId?: mongoose.Types.ObjectId
        readonly status?: (typeof CONVERSATION_STATUS)[keyof typeof CONVERSATION_STATUS]
        readonly unreadCounts?: Readonly<Record<string, number>>
        readonly createdAt?: Date
    } = {},
): Promise<mongoose.Types.ObjectId> {
    const createdAt = options.createdAt ?? new Date()
    const conversation = await Conversation.create({
        [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
        [CONVERSATION_FIELDS.STATUS]: options.status,
        [CONVERSATION_FIELDS.PARTICIPANTS]: [
            {
                [PARTICIPANT_FIELDS.USER_ID]: ownerId,
                [PARTICIPANT_FIELDS.ROLE]: ROLE.OWNER,
                [PARTICIPANT_FIELDS.JOINED_AT]: MEMBERSHIP_START_TIME,
            },
            ...(options.memberId ? [{
                [PARTICIPANT_FIELDS.USER_ID]: options.memberId,
                [PARTICIPANT_FIELDS.ROLE]: ROLE.MEMBER,
                [PARTICIPANT_FIELDS.JOINED_AT]: MEMBERSHIP_START_TIME,
            }] : []),
        ],
        [CONVERSATION_FIELDS.GROUP]: {
            [GROUP_FIELDS.NAME]: "Inbox route test",
            [GROUP_FIELDS.OWNER_ID]: ownerId,
        },
        [CONVERSATION_FIELDS.UNREAD_COUNT]: options.unreadCounts ?? {},
        [CONVERSATION_FIELDS.CREATED_AT]: createdAt,
        [CONVERSATION_FIELDS.UPDATED_AT]: createdAt,
    })
    return conversation._id
}

/** Persist one direct conversation for type-filter coverage. */
async function createDirectConversation(
    firstUserId: mongoose.Types.ObjectId,
    secondUserId: mongoose.Types.ObjectId,
): Promise<mongoose.Types.ObjectId> {
    const conversation = await Conversation.create({
        [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.DIRECT,
        [CONVERSATION_FIELDS.PARTICIPANTS]: [firstUserId, secondUserId].map((userId) => ({
            [PARTICIPANT_FIELDS.USER_ID]: userId,
            [PARTICIPANT_FIELDS.ROLE]: ROLE.DIRECT,
        })),
    })
    return conversation._id
}
