import {
    API_ROUTES,
    CONVERSATION_TYPE,
    ERROR_CODES,
    GROUP_FIELDS,
    INVITATION_FIELDS,
    INVITATION_HEADERS,
    INVITATION_PARAMS,
    INVITATION_PREVIEW_FIELDS,
    INVITATION_PREVIEW_ROUTE_PATHS,
    INVITATION_ROUTE_PATHS,
    ROLE,
    type Role,
} from "@linko/contracts"
import express, { type Express } from "express"
import mongoose from "mongoose"
import { randomUUID } from "node:crypto"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { createAuthenticate } from "../../middlewares/route.middleware"
import { createApp } from "../../app"
import { AuthTokenService } from "../auth/auth.security"
import Conversation from "../../models/Conversation"
import Invitation from "./Invitation"
import User from "../../models/User"
import { createGlobalErrorHandler } from "../../shared/middlewares/globalErrorHandler"
import { withRequestContext } from "../../shared/middlewares/requestContext"
import { withTransaction } from "../../shared/persistence/withTransaction"
import { createLogger, type LogRecord } from "../../shared/logger/logger"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import { InvitationController } from "./invitation.controller"
import { MongooseInvitationRepository } from "./invitation.repository"
import { createInvitationPreviewRouter, createInvitationRouter } from "./invitation.route"
import { InvitationService } from "./invitation.service"
import type { InvitationRepository } from "./invitation.types"

const TEST_TOKEN_SECRET = "invitation-route-tests-use-a-sufficiently-long-secret"
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
    await mongoose.connect(replicaSet.getUri(), { dbName: "invitation-issue-route-test" })
    await Promise.all([Conversation.init(), Invitation.init(), User.init()])
})

beforeEach(async () => {
    await Promise.all([
        Conversation.collection.deleteMany({}),
        Invitation.collection.deleteMany({}),
        User.collection.deleteMany({}),
    ])
})

afterAll(async () => {
    await mongoose.disconnect()
    await replicaSet?.stop()
})

describe("invitation HTTP routes", () => {
    it("should_register_invitation_routes_from_the_application_composition_root", async () => {
        const owner = await createAccount("composition-root-owner")
        const conversationId = await createGroup(owner.id)
        const app = createApp({
            publicRoutes: express.Router(),
            privateRoutes: express.Router(),
            logger: createLogger(() => undefined),
            authConfig: {
                accessTokenSecret: TEST_TOKEN_SECRET,
                clientOrigin: "https://linko.example",
                refreshCookie: { path: "/", secure: false, sameSite: "lax" },
            },
        })

        const response = await request(app)
            .post(collectionPath(conversationId))
            .set("Authorization", `Bearer ${owner.token}`)
            .set(INVITATION_HEADERS.IDEMPOTENCY_KEY, randomUUID())
            .send({})

        expect(response.status).toBe(201)
        expect(response.body.data[INVITATION_FIELDS.URL]).toMatch(/^https:\/\/linko\.example\/invite\//)
    })

    it.each([
        { label: "owner", role: ROLE.OWNER },
        { label: "admin", role: ROLE.ADMIN },
    ])("should_allow_owner_or_admin_to_issue_a_one_time_link", async ({ role }) => {
        const owner = await createAccount(`issue-${role}-owner`)
        const actor = role === ROLE.OWNER ? owner : await createAccount(`issue-${role}-admin`)
        const conversationId = role === ROLE.OWNER
            ? await createGroup(owner.id)
            : await createGroup(owner.id, actor.id, role)
        const { app } = createTestApp()

        const response = await request(app)
            .post(collectionPath(conversationId))
            .set("Authorization", `Bearer ${actor.token}`)
            .set(INVITATION_HEADERS.IDEMPOTENCY_KEY, randomUUID())
            .send({})

        expect(response.status).toBe(201)
        expect(response.body).toMatchObject({
            success: true,
            data: {
                id: expect.any(String),
                [INVITATION_FIELDS.URL]: expect.stringMatching(/^https:\/\/linko\.example\/invite\//),
                [INVITATION_FIELDS.MAX_USES]: 25,
                [INVITATION_FIELDS.USE_COUNT]: 0,
            },
            error: null,
            meta: null,
        })
        expect(response.body.data).not.toHaveProperty("tokenHash")
        expect(response.body.data).not.toHaveProperty("token")
    })

    it("should_reject_a_member_who_tries_to_issue_a_link", async () => {
        const owner = await createAccount("member-issue-owner")
        const member = await createAccount("member-issue-member")
        const conversationId = await createGroup(owner.id, member.id, ROLE.MEMBER)
        const { app } = createTestApp()

        const response = await request(app)
            .post(collectionPath(conversationId))
            .set("Authorization", `Bearer ${member.token}`)
            .set(INVITATION_HEADERS.IDEMPOTENCY_KEY, randomUUID())
            .send({})

        expect(response.status).toBe(403)
        expect(response.body.error.code).toBe(ERROR_CODES.FORBIDDEN)
    })

    it("should_require_an_idempotency_key_for_link_issuance", async () => {
        const owner = await createAccount("missing-idempotency-owner")
        const conversationId = await createGroup(owner.id)
        const { app } = createTestApp()

        const response = await request(app)
            .post(collectionPath(conversationId))
            .set("Authorization", `Bearer ${owner.token}`)
            .send({})

        expect(response.status).toBe(400)
        expect(response.body.error.code).toBe(ERROR_CODES.VALIDATION)
        expect(await Invitation.countDocuments()).toBe(0)
    })

    it("should_reject_a_repeated_issue_request_without_rotating_its_link", async () => {
        const owner = await createAccount("idempotent-issue-owner")
        const conversationId = await createGroup(owner.id)
        const { app } = createTestApp()
        const requestKey = "d7f88e11-9fa1-46b0-a1de-65aab4eefddb"
        const firstResponse = await request(app)
            .post(collectionPath(conversationId))
            .set("Authorization", `Bearer ${owner.token}`)
            .set(INVITATION_HEADERS.IDEMPOTENCY_KEY, requestKey)
            .send({})
        const repeatedResponse = await request(app)
            .post(collectionPath(conversationId))
            .set("Authorization", `Bearer ${owner.token}`)
            .set(INVITATION_HEADERS.IDEMPOTENCY_KEY, requestKey)
            .send({})
        const invitationCount = await Invitation.countDocuments()
        const token = extractToken(firstResponse.body.data[INVITATION_FIELDS.URL])
        const previewResponse = await request(app).get(previewPath(token))

        expect(firstResponse.status).toBe(201)
        expect(repeatedResponse.status).toBe(409)
        expect(repeatedResponse.body.error.code).toBe(ERROR_CODES.INVITATION_REQUEST_REPLAYED)
        expect(invitationCount).toBe(1)
        expect(previewResponse.status).toBe(200)
    })

    it("should_create_one_link_for_concurrent_requests_with_the_same_key", async () => {
        const owner = await createAccount("concurrent-idempotent-issue-owner")
        const conversationId = await createGroup(owner.id)
        const { app } = createTestApp()
        const requestKey = "d4e495dc-d516-4e7f-9ee6-d173e906ca76"

        const responses = await Promise.all([1, 2].map(() => request(app)
            .post(collectionPath(conversationId))
            .set("Authorization", `Bearer ${owner.token}`)
            .set(INVITATION_HEADERS.IDEMPOTENCY_KEY, requestKey)
            .send({})))

        expect(responses.map(({ status }) => status).sort()).toEqual([201, 409])
        expect(responses.find(({ status }) => status === 409)?.body.error.code)
            .toBe(ERROR_CODES.INVITATION_REQUEST_REPLAYED)
        expect(await Invitation.countDocuments()).toBe(1)
    })

    it("should_limit_link_issuance_per_owner", async () => {
        const owner = await createAccount("rate-limited-issue-owner")
        const conversationId = await createGroup(owner.id)
        const { app } = createTestApp()
        const allowedIssueCount = 5

        for (let issueNumber = 0; issueNumber < allowedIssueCount; issueNumber += 1) {
            const response = await issueInvitation(app, owner.token, conversationId)
            expect(response.id).toBeDefined()
        }
        const limitedResponse = await request(app)
            .post(collectionPath(conversationId))
            .set("Authorization", `Bearer ${owner.token}`)
            .set(INVITATION_HEADERS.IDEMPOTENCY_KEY, "37a42de8-8e78-4bd6-b7b1-ec3ad85c6571")
            .send({})

        expect(limitedResponse.status).toBe(429)
        expect(limitedResponse.body.error.code).toBe(ERROR_CODES.INVITATION_RATE_LIMITED)
        expect(await Invitation.countDocuments()).toBe(allowedIssueCount)
    })

    it("should_list_invitation_metadata_without_url_or_token_hash", async () => {
        const owner = await createAccount("list-owner")
        const conversationId = await createGroup(owner.id)
        const { app } = createTestApp()
        await issueInvitation(app, owner.token, conversationId)

        const response = await request(app)
            .get(collectionPath(conversationId))
            .set("Authorization", `Bearer ${owner.token}`)

        expect(response.status).toBe(200)
        expect(response.body.data).toHaveLength(1)
        expect(response.body.data[0]).toMatchObject({
            [INVITATION_FIELDS.ID]: expect.any(String),
            [INVITATION_FIELDS.MAX_USES]: 25,
            [INVITATION_FIELDS.USE_COUNT]: 0,
            [INVITATION_FIELDS.REVOKED_AT]: null,
        })
        expect(response.body.data[0]).not.toHaveProperty(INVITATION_FIELDS.URL)
        expect(response.body.data[0]).not.toHaveProperty("tokenHash")
    })

    it("should_revoke_a_link_and_return_success", async () => {
        const owner = await createAccount("revoke-owner")
        const conversationId = await createGroup(owner.id)
        const { app } = createTestApp()
        const issued = await issueInvitation(app, owner.token, conversationId)

        const response = await request(app)
            .delete(invitationPath(conversationId, issued.id))
            .set("Authorization", `Bearer ${owner.token}`)
        const invitation = await Invitation.findById(issued.id).lean()

        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({ success: true, data: null, error: null, meta: null })
        expect(invitation?.revokedAt).not.toBeNull()
    })

    it("should_show_only_minimal_group_metadata_for_a_valid_public_preview", async () => {
        const owner = await createAccount("preview-owner")
        const conversationId = await createGroup(owner.id)
        const { app } = createTestApp()
        const issued = await issueInvitation(app, owner.token, conversationId)
        const token = extractToken(issued.url)

        const response = await request(app).get(previewPath(token))

        expect(response.status).toBe(200)
        expect(response.body.data).toMatchObject({
            [INVITATION_PREVIEW_FIELDS.GROUP_NAME]: "Private readers",
            [INVITATION_PREVIEW_FIELDS.GROUP_DESCRIPTION]: "A private group",
            [INVITATION_PREVIEW_FIELDS.GROUP_AVATAR_URL]: null,
            [INVITATION_PREVIEW_FIELDS.MEMBER_COUNT]: 1,
        })
        expect(response.body.data).not.toHaveProperty("participants")
        expect(response.headers["referrer-policy"]).toBe("no-referrer")
        expect(response.headers["cache-control"]).toContain("no-store")
    })

    it("should_return_gone_for_an_expired_public_preview", async () => {
        const owner = await createAccount("expired-owner")
        const conversationId = await createGroup(owner.id)
        const { app } = createTestApp()
        const issued = await issueInvitation(app, owner.token, conversationId)
        const token = extractToken(issued.url)
        await Invitation.updateOne({ _id: issued.id }, { $set: { expiresAt: new Date("2000-01-01T00:00:00.000Z") } })

        const response = await request(app).get(previewPath(token))

        expect(response.status).toBe(410)
        expect(response.body.error.code).toBe(ERROR_CODES.INVITATION_UNAVAILABLE)
    })

    it("should_return_gone_for_a_revoked_public_preview", async () => {
        const owner = await createAccount("revoked-preview-owner")
        const conversationId = await createGroup(owner.id)
        const { app } = createTestApp()
        const issued = await issueInvitation(app, owner.token, conversationId)
        const token = extractToken(issued.url)
        await request(app)
            .delete(invitationPath(conversationId, issued.id))
            .set("Authorization", `Bearer ${owner.token}`)

        const revokedResponse = await request(app).get(previewPath(token))

        expect(revokedResponse.status).toBe(410)
        expect(revokedResponse.body.error.code).toBe(ERROR_CODES.INVITATION_UNAVAILABLE)
    })

    it("should_return_gone_for_an_unknown_public_preview", async () => {
        const { app } = createTestApp()
        const response = await request(app).get(previewPath("A".repeat(43)))

        expect(response.status).toBe(410)
        expect(response.body.error.code).toBe(ERROR_CODES.INVITATION_UNAVAILABLE)
    })

    it("should_reject_a_malformed_public_preview_token_at_the_boundary", async () => {
        const { app } = createTestApp()
        const response = await request(app).get(previewPath("not-valid!"))

        expect(response.status).toBe(400)
        expect(response.body.error.code).toBe(ERROR_CODES.VALIDATION)
    })

    it("should_not_leak_an_invitation_token_in_error_responses_or_logs", async () => {
        const owner = await createAccount("log-owner")
        const conversationId = await createGroup(owner.id)
        const issuingApp = createTestApp()
        const issued = await issueInvitation(issuingApp.app, owner.token, conversationId)
        const token = extractToken(issued.url)
        const records: LogRecord[] = []
        const repository = createRepository({
            findInvitationByTokenHash: vi.fn().mockRejectedValue(new Error(`failed invitation lookup ${token}`)),
        })
        const { app } = createTestApp({ repository, writeLog: (record) => records.push(record) })

        const response = await request(app).get(previewPath(token))
        const serializedLogs = JSON.stringify(records)

        expect(response.status).toBe(500)
        expect(JSON.stringify(response.body)).not.toContain(token)
        expect(serializedLogs).not.toContain(token)
    })
})

interface TestAppOptions {
    readonly repository?: InvitationRepository
    readonly writeLog?: (record: LogRecord) => void
}

/** Build authenticated management routes and the public preview route with real persistence. */
function createTestApp(options: TestAppOptions = {}): { readonly app: Express } {
    const logger = createLogger(options.writeLog ?? (() => undefined))
    const service = new InvitationService({
        repository: options.repository ?? new MongooseInvitationRepository(),
        transactionRunner: { run: withTransaction },
        clientOrigin: "https://linko.example",
    })
    const controller = new InvitationController(service)
    const app = express()
    app.use(withRequestContext)
    app.use(express.json())
    app.use(API_ROUTES.INVITATIONS, createInvitationPreviewRouter(controller))
    app.use(createAuthenticate(TEST_TOKEN_SECRET))
    app.use(API_ROUTES.CONVERSATIONS, createInvitationRouter(controller))
    app.use(createGlobalErrorHandler(logger))
    return { app }
}

/** Create an account and a matching access token for one route scenario. */
async function createAccount(suffix: string): Promise<{ readonly id: string; readonly token: string }> {
    const user = await User.create({
        username: `invitation_${suffix}`,
        email: `invitation_${suffix}@example.com`,
        displayName: `Invitation ${suffix}`,
        hashedPassword: "route-test-hash",
    })
    const token = new AuthTokenService(TEST_TOKEN_SECRET).createAccessToken(user._id.toString())
    return { id: user._id.toString(), token }
}

/** Create a private group with an optional additional participant. */
async function createGroup(
    ownerId: string,
    participantId?: string,
    participantRole?: Role,
): Promise<string> {
    const ownerObjectId = new mongoose.Types.ObjectId(ownerId)
    const participants: Array<{ userId: mongoose.Types.ObjectId; role: Role }> = [{
        [PARTICIPANT_FIELDS.USER_ID]: ownerObjectId,
        [PARTICIPANT_FIELDS.ROLE]: ROLE.OWNER,
    }]
    if (participantId && participantRole) {
        participants.push({
            [PARTICIPANT_FIELDS.USER_ID]: new mongoose.Types.ObjectId(participantId),
            [PARTICIPANT_FIELDS.ROLE]: participantRole,
        })
    }
    const conversation = await Conversation.create({
        [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
        [CONVERSATION_FIELDS.PARTICIPANTS]: participants,
        [CONVERSATION_FIELDS.GROUP]: {
            [GROUP_FIELDS.NAME]: "Private readers",
            [GROUP_FIELDS.DESCRIPTION]: "A private group",
            [GROUP_FIELDS.OWNER_ID]: ownerObjectId,
        },
    })
    return conversation._id.toString()
}

/** Issue an invitation through the HTTP boundary and return its one-time response. */
async function issueInvitation(app: Express, token: string, conversationId: string) {
    const response = await request(app)
        .post(collectionPath(conversationId))
        .set("Authorization", `Bearer ${token}`)
        .set(INVITATION_HEADERS.IDEMPOTENCY_KEY, randomUUID())
        .send({})
    if (response.status !== 201) throw new Error(`Invitation issue failed with HTTP ${response.status}`)
    return response.body.data as { readonly id: string; readonly url: string }
}

/** Build the collection endpoint for one conversation identifier. */
function collectionPath(conversationId: string): string {
    return `${API_ROUTES.CONVERSATIONS}${INVITATION_ROUTE_PATHS.COLLECTION.replace(
        `:${INVITATION_PARAMS.CONVERSATION_ID}`,
        conversationId,
    )}`
}

/** Build the endpoint for one invitation identifier. */
function invitationPath(conversationId: string, invitationId: string): string {
    return `${API_ROUTES.CONVERSATIONS}${INVITATION_ROUTE_PATHS.BY_ID
        .replace(`:${INVITATION_PARAMS.CONVERSATION_ID}`, conversationId)
        .replace(`:${INVITATION_PARAMS.INVITATION_ID}`, invitationId)}`
}

/** Build the public preview endpoint for one URL-safe invitation token. */
function previewPath(token: string): string {
    return `${API_ROUTES.INVITATIONS}${INVITATION_PREVIEW_ROUTE_PATHS.PREVIEW.replace(
        `:${INVITATION_PARAMS.TOKEN}`,
        token,
    )}`
}

/** Extract the one-time token from the invitation link returned at issue time. */
function extractToken(url: string): string {
    const token = new URL(url).pathname.split("/").at(-1)
    if (!token) throw new Error("Issued invitation URL did not contain a token")
    return token
}

/** Build default repository responses for tests that replace one persistence failure. */
function createRepository(overrides: Partial<InvitationRepository> = {}): InvitationRepository {
    return {
        findGroupAccess: vi.fn().mockResolvedValue(null),
        revokeUnrevokedInvitations: vi.fn().mockResolvedValue(undefined),
        createInvitation: vi.fn(),
        hasInvitationRequest: vi.fn().mockResolvedValue(false),
        findInvitation: vi.fn().mockResolvedValue(null),
        listInvitations: vi.fn().mockResolvedValue([]),
        revokeInvitation: vi.fn().mockResolvedValue(undefined),
        findInvitationByTokenHash: vi.fn().mockResolvedValue(null),
        findPublicGroupPreview: vi.fn().mockResolvedValue(null),
        ...overrides,
    }
}
