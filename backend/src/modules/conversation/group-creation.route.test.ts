import {
    API_ROUTES,
    CONVERSATION_KIND,
    CONVERSATION_PARAMS,
    CONVERSATION_QUERY_PARAMS,
    CONVERSATION_ROUTE_PATHS,
    CONVERSATION_TYPE,
    ERROR_CODES,
    GROUP_FIELDS,
    GROUP_LIMITS,
    ROLE,
} from "@linko/contracts"
import cookieParser from "cookie-parser"
import express, { type Express } from "express"
import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { AuthTokenService } from "../../modules/auth/auth.security"
import { createAuthenticate } from "../../middlewares/route.middleware"
import Conversation from "../../models/Conversation"
import User from "../../models/User"
import { createGlobalErrorHandler } from "../../shared/middlewares/globalErrorHandler"
import { createLogger } from "../../shared/logger/logger"
import { withTransaction } from "../../shared/persistence/withTransaction"
import { R2GroupAvatarStorage } from "./group-avatar.storage"
import { ConversationController } from "./conversation.controller"
import { MongooseConversationRepository } from "./conversation.repository"
import { createConversationRouter } from "./conversation.route"
import { ConversationService } from "./conversation.service"
import type { ConversationRepository, GroupAvatarRecord, GroupAvatarStorage } from "./conversation.types"
import { GROUP_USER_FIELDS, CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "./conversation.constants"

const TEST_TOKEN_SECRET = "group-route-tests-use-a-sufficiently-long-secret"
const TEST_WIRED_TIGER_CACHE_SIZE_GB = "0.25"
const OWNER_AVATAR: GroupAvatarRecord = {
    url: "https://media.example/groups/owner-avatar.jpg",
    id: "r2:groups/owner-avatar.jpg",
}

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger",
            args: [`--wiredTigerCacheSizeGB=${TEST_WIRED_TIGER_CACHE_SIZE_GB}`],
        },
    })
    await mongoose.connect(replicaSet.getUri(), { dbName: "group-creation-route-test" })
    await Promise.all([User.init(), Conversation.init()])
})

beforeEach(async () => {
    await Promise.all([User.collection.deleteMany({}), Conversation.collection.deleteMany({})])
})

afterAll(async () => {
    await mongoose.disconnect()
    await replicaSet?.stop()
})

/** Build an avatar storage double whose object lifecycle can be observed at the HTTP boundary. */
function createAvatarStorage(overrides: Partial<GroupAvatarStorage> = {}): GroupAvatarStorage {
    return {
        upload: vi.fn().mockResolvedValue(OWNER_AVATAR),
        delete: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    }
}

/** Build the authenticated API with real MongoDB persistence and replaceable avatar storage. */
function createTestApp(options: {
    readonly repository?: ConversationRepository
    readonly avatarStorage?: GroupAvatarStorage
} = {}): { readonly app: Express; readonly avatarStorage: GroupAvatarStorage } {
    const avatarStorage = options.avatarStorage ?? createAvatarStorage()
    const service = new ConversationService({
        repository: options.repository ?? new MongooseConversationRepository(),
        transactionRunner: { run: withTransaction },
        avatarStorage,
    })
    const app = express()
    app.use(express.json())
    app.use(cookieParser())
    app.use(createAuthenticate(TEST_TOKEN_SECRET))
    app.use(API_ROUTES.CONVERSATIONS, createConversationRouter(new ConversationController(service)))
    app.use(createGlobalErrorHandler(createLogger(() => undefined)))
    return { app, avatarStorage }
}

/** Create a persisted account and matching bearer token for one route scenario. */
async function createAccount(suffix: string): Promise<{ readonly id: string; readonly token: string }> {
    const user = await User.create({
        username: `group_member_${suffix}`,
        email: `group_member_${suffix}@example.com`,
        displayName: `Group member ${suffix}`,
        hashedPassword: "route-test-hash",
    })
    const token = new AuthTokenService(TEST_TOKEN_SECRET).createAccessToken(user._id.toString())
    return { id: user._id.toString(), token }
}

/** Create one group through the public JSON route and return its response. */
function postGroup(app: Express, token: string, name: string) {
    return request(app)
        .post(API_ROUTES.CONVERSATIONS)
        .set("Authorization", `Bearer ${token}`)
        .send({ [GROUP_FIELDS.NAME]: name })
}

/** Build the path for one group metadata PATCH request. */
function groupPath(groupId: string): string {
    return `${API_ROUTES.CONVERSATIONS}${CONVERSATION_ROUTE_PATHS.BY_ID.replace(`:${CONVERSATION_PARAMS.ID}`, groupId)}`
}

describe("conversation group HTTP routes", () => {
    it("should_create_group_with_owner_only_and_return_group_dto", async () => {
        const account = await createAccount("owner")
        const { app } = createTestApp()

        const response = await postGroup(app, account.token, "Weekend readers")

        expect(response.status).toBe(201)
        expect(response.body).toMatchObject({
            success: true,
            data: {
                id: expect.any(String),
                [GROUP_FIELDS.OWNER_ID]: account.id,
                [GROUP_FIELDS.NAME]: "Weekend readers",
                [GROUP_FIELDS.DESCRIPTION]: null,
                [GROUP_FIELDS.AVATAR_URL]: null,
                [GROUP_FIELDS.PARTICIPANTS]: [{
                    [GROUP_FIELDS.USER_ID]: account.id,
                    [GROUP_FIELDS.ROLE]: ROLE.OWNER,
                }],
                [GROUP_FIELDS.CREATED_AT]: expect.any(String),
            },
            error: null,
            meta: null,
        })
        expect(response.body.data).not.toHaveProperty("delFlag")
        expect(response.body.data).not.toHaveProperty("createdBy")
    })

    it("should_list_only_groups_the_authenticated_user_participates_in", async () => {
        const owner = await createAccount("list-owner")
        const otherOwner = await createAccount("list-other")
        const { app } = createTestApp()
        const ownGroup = await postGroup(app, owner.token, "My group")
        await postGroup(app, otherOwner.token, "Another group")

        const response = await request(app)
            .get(API_ROUTES.CONVERSATIONS)
            .query({ [CONVERSATION_QUERY_PARAMS.KIND]: CONVERSATION_KIND.GROUP })
            .set("Authorization", `Bearer ${owner.token}`)

        expect(response.status).toBe(200)
        expect(response.body.data.map((group: { readonly id: string }) => group.id))
            .toEqual([ownGroup.body.data.id])
    })

    it("should_allow_an_admin_to_update_group_details", async () => {
        const owner = await createAccount("admin-owner")
        const admin = await createAccount("admin-editor")
        const { app } = createTestApp()
        const created = await postGroup(app, owner.token, "Old title")
        const group = await Conversation.findById(created.body.data.id)
        group?.participants.push({ userId: new mongoose.Types.ObjectId(admin.id), role: ROLE.ADMIN })
        await group?.save()

        const response = await request(app)
            .patch(groupPath(created.body.data.id))
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ [GROUP_FIELDS.NAME]: "New title" })

        expect(response.status).toBe(200)
        expect(response.body.data[GROUP_FIELDS.NAME]).toBe("New title")
    })

    it("should_reject_a_member_who_tries_to_update_group_details", async () => {
        const owner = await createAccount("member-owner")
        const member = await createAccount("member-editor")
        const { app } = createTestApp()
        const created = await postGroup(app, owner.token, "Original title")
        const group = await Conversation.findById(created.body.data.id)
        group?.participants.push({ userId: new mongoose.Types.ObjectId(member.id), role: ROLE.MEMBER })
        await group?.save()

        const response = await request(app)
            .patch(groupPath(created.body.data.id))
            .set("Authorization", `Bearer ${member.token}`)
            .send({ [GROUP_FIELDS.NAME]: "Unauthorized title" })

        expect(response.status).toBe(403)
        expect(response.body.error.code).toBe(ERROR_CODES.FORBIDDEN)
    })

    it.each([
        { label: "a blank name", body: { [GROUP_FIELDS.NAME]: "  " } },
        { label: "an 81-character name", body: { [GROUP_FIELDS.NAME]: "g".repeat(GROUP_LIMITS.MAX_NAME_LENGTH + 1) } },
        { label: "a 501-character description", body: { [GROUP_FIELDS.NAME]: "Readers", [GROUP_FIELDS.DESCRIPTION]: "d".repeat(GROUP_LIMITS.MAX_DESCRIPTION_LENGTH + 1) } },
    ])("should_return_validation_error_for $label", async ({ body }) => {
        const account = await createAccount(`invalid-${body[GROUP_FIELDS.NAME].length}`)
        const { app } = createTestApp()

        const response = await request(app)
            .post(API_ROUTES.CONVERSATIONS)
            .set("Authorization", `Bearer ${account.token}`)
            .send(body)

        expect(response.status).toBe(400)
        expect(response.body).toMatchObject({ success: false, error: { code: ERROR_CODES.VALIDATION }, data: null })
    })

    it("should_reject_a_request_without_an_authenticated_session", async () => {
        const { app } = createTestApp()

        const response = await request(app)
            .get(API_ROUTES.CONVERSATIONS)
            .query({ [CONVERSATION_QUERY_PARAMS.KIND]: CONVERSATION_KIND.GROUP })

        expect(response.status).toBe(401)
        expect(response.body.error.code).toBe(ERROR_CODES.UNAUTHORIZED)
    })

    it("should_reject_an_avatar_with_an_unsupported_media_type", async () => {
        const account = await createAccount("invalid-avatar-type")
        const storage = createAvatarStorage()
        const { app } = createTestApp({ avatarStorage: storage })

        const response = await request(app)
            .post(API_ROUTES.CONVERSATIONS)
            .set("Authorization", `Bearer ${account.token}`)
            .field(GROUP_FIELDS.NAME, "Readers")
            .attach(GROUP_FIELDS.AVATAR, Buffer.from("not an image"), {
                filename: "avatar.gif",
                contentType: "image/gif",
            })

        expect(response.status).toBe(400)
        expect(response.body.error.code).toBe(ERROR_CODES.VALIDATION)
        expect(storage.upload).not.toHaveBeenCalled()
    })

    it("should_reject_an_avatar_whose_bytes_do_not_match_its_image_type", async () => {
        const account = await createAccount("invalid-avatar-bytes")
        const { app } = createTestApp({ avatarStorage: new R2GroupAvatarStorage() })

        const response = await request(app)
            .post(API_ROUTES.CONVERSATIONS)
            .set("Authorization", `Bearer ${account.token}`)
            .field(GROUP_FIELDS.NAME, "Readers")
            .attach(GROUP_FIELDS.AVATAR, Buffer.from("not a PNG"), {
                filename: "avatar.png",
                contentType: "image/png",
            })

        expect(response.status).toBe(400)
        expect(response.body.error.code).toBe(ERROR_CODES.VALIDATION)
    })

    it("should_remove_an_uploaded_avatar_when_the_mongo_write_fails", async () => {
        const account = await createAccount("failed-write")
        const storage = createAvatarStorage()
        const repository = createRepository({
            createGroup: vi.fn().mockRejectedValue(new Error("private Mongo write detail")),
        })
        const { app } = createTestApp({ avatarStorage: storage, repository })

        const response = await request(app)
            .post(API_ROUTES.CONVERSATIONS)
            .set("Authorization", `Bearer ${account.token}`)
            .field(GROUP_FIELDS.NAME, "Readers")
            .attach(GROUP_FIELDS.AVATAR, Buffer.from("valid image bytes for test storage"), {
                filename: "avatar.png",
                contentType: "image/png",
            })

        expect(response.status).toBe(500)
        expect(response.body.error.message).toBe("Internal server error")
        expect(JSON.stringify(response.body)).not.toContain("private Mongo write detail")
        expect(storage.delete).toHaveBeenCalledWith(OWNER_AVATAR)
    })

    it("should_allow_the_100th_group_and_reject_the_concurrent_101st", async () => {
        const account = await createAccount("concurrent-limit")
        const existingGroups = Array.from({ length: GROUP_LIMITS.MAX_GROUPS_PER_USER - 1 }, (_, index) => ({
            conversationType: CONVERSATION_TYPE.GROUP,
            participants: [{ userId: new mongoose.Types.ObjectId(account.id), role: ROLE.OWNER }],
            group: { name: `Existing ${index}`, ownerId: new mongoose.Types.ObjectId(account.id) },
        }))
        await Conversation.collection.insertMany(existingGroups)
        const { app } = createTestApp()

        const [first, second] = await Promise.all([
            postGroup(app, account.token, "Concurrent group A"),
            postGroup(app, account.token, "Concurrent group B"),
        ])
        const responses = [first, second]
        const created = responses.filter((response) => response.status === 201)
        const rejected = responses.filter((response) => response.status === 409)
        const groupCount = await Conversation.countDocuments({
            [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
            [`${CONVERSATION_FIELDS.PARTICIPANTS}.${PARTICIPANT_FIELDS.USER_ID}`]: new mongoose.Types.ObjectId(account.id),
        })
        const owner = await User.findById(account.id)
            .select(`+${GROUP_USER_FIELDS.GROUP_CONVERSATION_COUNT}`)
            .lean()

        expect(created).toHaveLength(1)
        expect(rejected).toHaveLength(1)
        expect(rejected[0]?.body.error.code).toBe(ERROR_CODES.GROUP_LIMIT)
        expect(groupCount).toBe(GROUP_LIMITS.MAX_GROUPS_PER_USER)
        expect(owner?.[GROUP_USER_FIELDS.GROUP_CONVERSATION_COUNT]).toBe(GROUP_LIMITS.MAX_GROUPS_PER_USER)
    })
})

/** Build a repository double whose transaction and persistence results are explicit. */
function createRepository(overrides: Partial<ConversationRepository> = {}): ConversationRepository {
    return {
        reserveGroupSlot: vi.fn().mockResolvedValue("reserved"),
        createGroup: vi.fn(),
        findGroupsByParticipant: vi.fn().mockResolvedValue([]),
        findGroupById: vi.fn().mockResolvedValue(null),
        updateGroup: vi.fn().mockResolvedValue(null),
        ...overrides,
    }
}
