import { createHash, randomBytes } from "node:crypto"

import {
    API_ROUTES,
    CONVERSATION_TYPE,
    ERROR_CODES,
    GROUP_FIELDS,
    GROUP_LIMITS,
    INVITATION_PREVIEW_FIELDS,
    INVITATION_PREVIEW_ROUTE_PATHS,
    INVITATION_PARAMS,
    ROLE,
    type GroupMemberRole,
} from "@linko/contracts"
import express, { type Express } from "express"
import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { createAuthenticate } from "../../middlewares/route.middleware"
import Conversation from "../../models/Conversation"
import Invitation from "./Invitation"
import User from "../../models/User"
import { AuthTokenService } from "../auth/auth.security"
import { MongooseConversationRepository } from "../conversation/conversation.repository"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import { MongooseMembershipRepository } from "../membership/membership.repository"
import { MembershipService } from "../membership/membership.service"
import { InvitationController } from "./invitation.controller"
import { INVITATION_MODEL_FIELDS } from "./invitation.constants"
import { MongooseInvitationRepository } from "./invitation.repository"
import { createInvitationAcceptRouter, createInvitationPreviewRouter } from "./invitation.route"
import { InvitationService } from "./invitation.service"
import { createGlobalErrorHandler } from "../../shared/middlewares/globalErrorHandler"
import { withRequestContext } from "../../shared/middlewares/requestContext"
import { withTransaction } from "../../shared/persistence/withTransaction"
import { createLogger } from "../../shared/logger/logger"

const TEST_TOKEN_SECRET = "invitation-join-route-tests-use-a-sufficiently-long-secret"
const TEST_WIRED_TIGER_CACHE_SIZE_GB = "0.25"
const TEST_NOW = new Date("2026-10-04T12:30:00.000Z")

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger",
            args: [`--wiredTigerCacheSizeGB=${TEST_WIRED_TIGER_CACHE_SIZE_GB}`],
        },
    })
    await mongoose.connect(replicaSet.getUri(), { dbName: "invitation-join-route-test" })
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

describe("invitation join HTTP routes", () => {
    it("should_return_only_the_minimal_public_group_preview", async () => {
        const owner = await createAccount("preview-owner")
        const conversationId = await createGroup(owner._id)
        const invitation = await createInvitation(conversationId)

        const response = await request(createTestApp()).get(previewPath(invitation.rawToken))

        expect(response.status).toBe(200)
        expect(response.body.data).toMatchObject({
            [INVITATION_PREVIEW_FIELDS.GROUP_NAME]: "Private invitation group",
            [INVITATION_PREVIEW_FIELDS.GROUP_DESCRIPTION]: "Safe public description",
            [INVITATION_PREVIEW_FIELDS.GROUP_AVATAR_URL]: null,
            [INVITATION_PREVIEW_FIELDS.MEMBER_COUNT]: 1,
        })
        expect(Object.keys(response.body.data).sort()).toEqual([
            INVITATION_PREVIEW_FIELDS.EXPIRES_AT,
            INVITATION_PREVIEW_FIELDS.GROUP_AVATAR_URL,
            INVITATION_PREVIEW_FIELDS.GROUP_DESCRIPTION,
            INVITATION_PREVIEW_FIELDS.GROUP_NAME,
            INVITATION_PREVIEW_FIELDS.MEMBER_COUNT,
        ].sort())
        expect(JSON.stringify(response.body)).not.toContain(invitation.rawToken)
    })

    it.each(["unknown", "expired", "revoked"] as const)("should_return_gone_for_a_%s_link", async (state) => {
        const owner = await createAccount(`unavailable-${state}`)
        const conversationId = await createGroup(owner._id)
        const invitation = await createInvitation(conversationId)
        if (state !== "unknown") {
            await Invitation.updateOne(
                { [INVITATION_MODEL_FIELDS.TOKEN_HASH]: invitation.tokenHash },
                state === "expired"
                    ? { $set: { [INVITATION_MODEL_FIELDS.EXPIRES_AT]: new Date(TEST_NOW.getTime() - 1) } }
                    : { $set: { [INVITATION_MODEL_FIELDS.REVOKED_AT]: TEST_NOW } },
            )
        }
        const token = state === "unknown" ? randomBytes(32).toString("base64url") : invitation.rawToken

        const response = await request(createTestApp()).get(previewPath(token))

        expect(response.status).toBe(410)
        expect(response.body.error.code).toBe(ERROR_CODES.INVITATION_UNAVAILABLE)
    })

    it("should_require_authentication_to_accept_a_link", async () => {
        const owner = await createAccount("auth-owner")
        const conversationId = await createGroup(owner._id)
        const invitation = await createInvitation(conversationId)

        const response = await request(createTestApp()).post(acceptPath(invitation.rawToken)).send({})

        expect(response.status).toBe(401)
        expect(response.body.error.code).toBe(ERROR_CODES.UNAUTHORIZED)
    })

    it("should_reject_acceptance_when_a_group_has_reached_its_member_limit", async () => {
        const owner = await createAccount("full-owner")
        const invitee = await createAccount("full-invitee")
        const fullParticipants = Array.from(
            { length: GROUP_LIMITS.MAX_MEMBERS_PER_GROUP - 1 },
            () => ({ userId: new mongoose.Types.ObjectId(), role: ROLE.MEMBER }),
        )
        const conversationId = await createGroup(owner._id, fullParticipants)
        const invitation = await createInvitation(conversationId)

        const response = await request(createTestApp())
            .post(acceptPath(invitation.rawToken))
            .set("Authorization", `Bearer ${invitee.token}`)
            .send({})

        expect(response.status).toBe(409)
        expect(response.body.error.code).toBe(ERROR_CODES.GROUP_LIMIT)
    })

    it("should_return_gone_when_revoked_after_preview_without_adding_the_invitee", async () => {
        const owner = await createAccount("revoke-owner")
        const invitee = await createAccount("revoke-invitee")
        const conversationId = await createGroup(owner._id)
        const invitation = await createInvitation(conversationId)
        const app = createTestApp()
        const preview = await request(app).get(previewPath(invitation.rawToken))
        await Invitation.updateOne(
            { [INVITATION_MODEL_FIELDS.TOKEN_HASH]: invitation.tokenHash },
            { $set: { [INVITATION_MODEL_FIELDS.REVOKED_AT]: TEST_NOW } },
        )

        const response = await request(app)
            .post(acceptPath(invitation.rawToken))
            .set("Authorization", `Bearer ${invitee.token}`)
            .send({})
        const conversation = await Conversation.findById(conversationId)
        const storedInvitation = await Invitation.findOne({ [INVITATION_MODEL_FIELDS.TOKEN_HASH]: invitation.tokenHash })

        expect(preview.status).toBe(200)
        expect(response.status).toBe(410)
        expect(response.body.error.code).toBe(ERROR_CODES.INVITATION_UNAVAILABLE)
        expect(conversation?.[CONVERSATION_FIELDS.PARTICIPANTS]).toHaveLength(1)
        expect(storedInvitation?.[INVITATION_MODEL_FIELDS.USE_COUNT]).toBe(0)
    })

    it("should_return_the_destination_group_after_acceptance", async () => {
        const owner = await createAccount("accept-owner")
        const invitee = await createAccount("accept-invitee")
        const conversationId = await createGroup(owner._id)
        const invitation = await createInvitation(conversationId)

        const response = await request(createTestApp())
            .post(acceptPath(invitation.rawToken))
            .set("Authorization", `Bearer ${invitee.token}`)
            .send({})

        expect(response.status).toBe(200)
        expect(response.body.data.id).toBe(conversationId.toString())
        expect(response.body.data.participants).toHaveLength(2)
        expect(response.body.data).not.toHaveProperty("tokenHash")
    })
})

/** Build the API boundary with the public preview route and authenticated routers. */
function createTestApp(): Express {
    const conversationRepository = new MongooseConversationRepository()
    const service = new InvitationService({
        repository: new MongooseInvitationRepository(),
        transactionRunner: { run: withTransaction },
        clientOrigin: "https://linko.example",
        membershipService: new MembershipService({
            repository: new MongooseMembershipRepository(),
            transactionRunner: { run: withTransaction },
            clock: { now: () => TEST_NOW },
        }),
        groupReader: conversationRepository,
        clock: { now: () => TEST_NOW },
    })
    const controller = new InvitationController(service)
    const app = express()
    app.use(withRequestContext)
    app.use(express.json())
    app.use(API_ROUTES.INVITATIONS, createInvitationPreviewRouter(controller))
    app.use(createAuthenticate(TEST_TOKEN_SECRET))
    app.use(API_ROUTES.INVITATIONS, createInvitationAcceptRouter(controller))
    app.use(createGlobalErrorHandler(createLogger(() => undefined)))
    return app
}

/** Create a user and signed access token for route tests. */
async function createAccount(suffix: string): Promise<{ readonly _id: mongoose.Types.ObjectId; readonly token: string }> {
    const user = await User.create({
        username: `join_route_${suffix}`,
        email: `join_route_${suffix}@example.com`,
        displayName: `Join route ${suffix}`,
        hashedPassword: "invitation-join-route-test-hash",
    })
    const token = new AuthTokenService(TEST_TOKEN_SECRET).createAccessToken(user._id.toString())
    return { _id: user._id, token }
}

/** Persist a private group for one owner and any existing member fixtures. */
async function createGroup(
    ownerId: mongoose.Types.ObjectId,
    otherParticipants: readonly { readonly userId: mongoose.Types.ObjectId; readonly role: GroupMemberRole }[] = [],
): Promise<mongoose.Types.ObjectId> {
    const conversation = await Conversation.create({
        [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
        [CONVERSATION_FIELDS.PARTICIPANTS]: [
            { [PARTICIPANT_FIELDS.USER_ID]: ownerId, [PARTICIPANT_FIELDS.ROLE]: ROLE.OWNER },
            ...otherParticipants,
        ],
        [CONVERSATION_FIELDS.GROUP]: {
            [GROUP_FIELDS.NAME]: "Private invitation group",
            [GROUP_FIELDS.DESCRIPTION]: "Safe public description",
            [GROUP_FIELDS.OWNER_ID]: ownerId,
        },
    })
    return conversation._id
}

/** Store a hashed invite link and return its URL-only token for the test client. */
async function createInvitation(
    conversationId: mongoose.Types.ObjectId,
): Promise<{ readonly rawToken: string; readonly tokenHash: string }> {
    const rawToken = randomBytes(32).toString("base64url")
    const tokenHash = createHash("sha256").update(rawToken).digest("hex")
    await Invitation.create({
        [INVITATION_MODEL_FIELDS.CONVERSATION_ID]: conversationId,
        [INVITATION_MODEL_FIELDS.TOKEN_HASH]: tokenHash,
        [INVITATION_MODEL_FIELDS.IDEMPOTENCY_KEY_HASH]: createHash("sha256").update(randomBytes(32)).digest("hex"),
    })
    return { rawToken, tokenHash }
}

/** Build the public preview endpoint path for one raw link token. */
function previewPath(token: string): string {
    return `${API_ROUTES.INVITATIONS}${INVITATION_PREVIEW_ROUTE_PATHS.PREVIEW.replace(
        `:${INVITATION_PARAMS.TOKEN}`,
        token,
    )}`
}

/** Build the authenticated acceptance endpoint path for one raw link token. */
function acceptPath(token: string): string {
    return `${API_ROUTES.INVITATIONS}${INVITATION_PREVIEW_ROUTE_PATHS.ACCEPT.replace(
        `:${INVITATION_PARAMS.TOKEN}`,
        token,
    )}`
}
