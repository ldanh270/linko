import {
    API_ROUTES,
    ERROR_CODES,
    FRIEND_REQUEST_BODY_FIELDS,
    FRIEND_REQUEST_FIELDS,
    FRIEND_ROUTE_PATHS,
    USER_PROFILE_FIELDS,
    USER_ROUTE_PATHS,
    USER_SEARCH_MODE,
    USER_SEARCH_QUERY_PARAMS,
} from "@linko/contracts"
import express from "express"
import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { createApp } from "../../app"
import Conversation from "../../models/Conversation"
import FriendRequest from "../../models/FriendRequest"
import Friendship from "../../models/Friendship"
import User from "../../models/User"
import { AuthTokenService } from "../auth/auth.security"
import { CONVERSATION_FIELDS } from "../conversation/conversation.constants"
import { createLogger } from "../../shared/logger/logger"
import { FRIEND_REQUEST_MODEL_FIELDS } from "./friend.constants"

const TEST_TOKEN_SECRET = "direct-friends-route-tests-use-a-long-enough-secret"
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
    await mongoose.connect(replicaSet.getUri(), { dbName: "direct-friends-route-test" })
    await Promise.all([Conversation.init(), FriendRequest.init(), Friendship.init(), User.init()])
})

beforeEach(async () => {
    await Promise.all([
        Conversation.collection.deleteMany({}),
        FriendRequest.collection.deleteMany({}),
        Friendship.collection.deleteMany({}),
        User.collection.deleteMany({}),
    ])
})

afterAll(async () => {
    await mongoose.disconnect()
    await replicaSet?.stop()
})

describe("friend and people HTTP routes", () => {
    it("should_accept_a_pending_request_on_the_accept_path", async () => {
        const requester = await createAccount("decision-requester")
        const recipient = await createAccount("decision-recipient")
        const app = createTestApp()
        const sent = await request(app)
            .post(API_ROUTES.FRIENDS)
            .set("Authorization", `Bearer ${requester.token}`)
            .send({ [FRIEND_REQUEST_BODY_FIELDS.RECIPIENT_ID]: recipient._id.toString() })
        expect(sent.status).toBe(201)
        const requestId = sent.body.data.id as string

        const accepted = await request(app)
            .post(friendPath(FRIEND_ROUTE_PATHS.ACCEPT, requestId))
            .set("Authorization", `Bearer ${recipient.token}`)
        expect(accepted.status).toBe(200)
        expect(accepted.body.data[USER_PROFILE_FIELDS.ID]).toBe(requester._id.toString())
        expect(FRIEND_ROUTE_PATHS.ACCEPT).not.toBe(FRIEND_ROUTE_PATHS.DECLINE)
    })

    it("should_decline_the_pending_request_on_the_decline_route", async () => {
        const requester = await createAccount("decline-sender")
        const recipient = await createAccount("decline-target")
        const app = createTestApp()
        const sent = await request(app)
            .post(API_ROUTES.FRIENDS)
            .set("Authorization", `Bearer ${requester.token}`)
            .send({ [FRIEND_REQUEST_BODY_FIELDS.RECIPIENT_ID]: recipient._id.toString() })

        const declined = await request(app)
            .post(friendPath(FRIEND_ROUTE_PATHS.DECLINE, sent.body.data.id as string))
            .set("Authorization", `Bearer ${recipient.token}`)

        expect(declined.status).toBe(200)
        expect(await Friendship.countDocuments({})).toBe(0)
        expect(await FriendRequest.countDocuments({ [FRIEND_REQUEST_MODEL_FIELDS.DEL_FLAG]: false })).toBe(0)
    })

    it("should_search_public_people_from_query_and_redact_private_fields", async () => {
        const viewer = await createAccount("search-viewer")
        const person = await createAccount("search-target")
        const response = await request(createTestApp())
            .get(`${API_ROUTES.USERS}${USER_ROUTE_PATHS.SEARCH}?${USER_SEARCH_QUERY_PARAMS.KEYWORD}=search-target&${USER_SEARCH_QUERY_PARAMS.TYPE}=${USER_SEARCH_MODE.FULL}`)
            .set("Authorization", `Bearer ${viewer.token}`)

        expect(response.status).toBe(200)
        expect(response.body.data).toHaveLength(1)
        expect(response.body.data[0][USER_PROFILE_FIELDS.ID]).toBe(person._id.toString())
        expect(JSON.stringify(response.body)).not.toContain(person.email)
        expect(JSON.stringify(response.body)).not.toContain(person.phone ?? "private-phone")
    })

    it("should_reject_the_legacy_get_body_as_a_search_query", async () => {
        const viewer = await createAccount("legacy-search-viewer")
        const response = await request(createTestApp())
            .get(`${API_ROUTES.USERS}${USER_ROUTE_PATHS.SEARCH}`)
            .set("Authorization", `Bearer ${viewer.token}`)
            .send({ [USER_SEARCH_QUERY_PARAMS.KEYWORD]: "legacy", [USER_SEARCH_QUERY_PARAMS.TYPE]: USER_SEARCH_MODE.FULL })

        expect(response.status).toBe(400)
        expect(response.body.error.code).toBe(ERROR_CODES.VALIDATION)
    })

    it("should_reject_an_unfriended_account_from_opening_a_direct_conversation", async () => {
        const actor = await createAccount("nonfriend-actor")
        const other = await createAccount("nonfriend-other")
        const response = await request(createTestApp())
            .post(friendPath(FRIEND_ROUTE_PATHS.DIRECT_CONVERSATION, other._id.toString()))
            .set("Authorization", `Bearer ${actor.token}`)

        expect(response.status).toBe(403)
        expect(response.body.error.code).toBe(ERROR_CODES.NOT_FRIENDS)
        expect(await Conversation.countDocuments({ [CONVERSATION_FIELDS.TYPE]: "DIRECT" })).toBe(0)
    })

    it("should_return_a_safe_direct_conversation_for_active_friends", async () => {
        const requester = await createAccount("direct-requester")
        const recipient = await createAccount("direct-recipient")
        const app = createTestApp()
        const sent = await request(app)
            .post(API_ROUTES.FRIENDS)
            .set("Authorization", `Bearer ${requester.token}`)
            .send({ [FRIEND_REQUEST_BODY_FIELDS.RECIPIENT_ID]: recipient._id.toString() })
        await request(app)
            .post(friendPath(FRIEND_ROUTE_PATHS.ACCEPT, sent.body.data.id as string))
            .set("Authorization", `Bearer ${recipient.token}`)

        const response = await request(app)
            .post(friendPath(FRIEND_ROUTE_PATHS.DIRECT_CONVERSATION, recipient._id.toString()))
            .set("Authorization", `Bearer ${requester.token}`)

        expect(response.status).toBe(200)
        expect(response.body.data.type).toBe("DIRECT")
        expect(response.body.data.participants).toHaveLength(2)
        expect(JSON.stringify(response.body)).not.toContain(requester.email)
        expect(JSON.stringify(response.body)).not.toContain(recipient.email)
        expect(response.body.data).not.toHaveProperty("delFlag")
    })
})

/** Build the application with the real composition root and isolated auth settings. */
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

/** Create one account with a valid access token and intentionally private contact fields. */
async function createAccount(suffix: string): Promise<{
    readonly _id: mongoose.Types.ObjectId
    readonly token: string
    readonly email: string
    readonly phone: string
}> {
    const email = `${suffix}@example.com`
    const phone = `+1202555${suffix.length.toString().padStart(4, "0")}`
    const user = await User.create({
        username: `direct_friends_${suffix}`,
        email,
        phone,
        displayName: `Direct friends ${suffix}`,
        hashedPassword: "direct-friends-route-test-hash",
    })
    return {
        _id: user._id,
        token: new AuthTokenService(TEST_TOKEN_SECRET).createAccessToken(user._id.toString()),
        email,
        phone,
    }
}

/** Replace the named friend route parameter with its already-validated identifier. */
function friendPath(route: string, identifier: string): string {
    return `${API_ROUTES.FRIENDS}${route.replace(/:\w+/, identifier)}`
}
