import { createHash, randomBytes, randomUUID } from "node:crypto"

import {
    API_ROUTES,
    CONVERSATION_DTO_FIELDS,
    CONVERSATION_PARAMS,
    CONVERSATION_ROUTE_PATHS,
    CONVERSATION_STATUS,
    CONVERSATION_TYPE,
    ERROR_CODES,
    GROUP_FIELDS,
    INVITATION_PARAMS,
    INVITATION_PREVIEW_ROUTE_PATHS,
    MEMBERSHIP_ROUTE_PATHS,
    ROLE,
    type GroupMemberRole,
} from "@linko/contracts"
import express from "express"
import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { createApp } from "../../app"
import { AuthTokenService } from "../auth/auth.security"
import Conversation from "../../models/Conversation"
import Invitation from "../invitation/Invitation"
import { INVITATION_MODEL_FIELDS } from "../invitation/invitation.constants"
import User from "../../models/User"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "./conversation.constants"
import { createLogger } from "../../shared/logger/logger"

const TEST_TOKEN_SECRET = "group-lifecycle-route-tests-use-a-sufficiently-long-secret"
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
    await mongoose.connect(replicaSet.getUri(), { dbName: "group-lifecycle-route-test" })
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

describe("group lifecycle HTTP routes", () => {
    it("should_allow_a_member_to_leave_and_revoke_their_group_access", async () => {
        const owner = await createAccount("leave-owner")
        const member = await createAccount("leave-member")
        const conversationId = await createGroup(owner._id, [{ userId: member._id, role: ROLE.MEMBER }])
        const app = createTestApp()

        const leaveResponse = await request(app)
            .post(leavePath(conversationId.toString()))
            .set("Authorization", `Bearer ${member.token}`)
            .send({})
        const membersResponse = await request(app)
            .get(memberListPath(conversationId.toString()))
            .set("Authorization", `Bearer ${member.token}`)
        const group = await Conversation.findById(conversationId)
        const departed = group?.[CONVERSATION_FIELDS.PARTICIPANTS].find((participant) =>
            participant[PARTICIPANT_FIELDS.USER_ID].equals(member._id),
        )

        expect(leaveResponse.status).toBe(200)
        expect(leaveResponse.body).toMatchObject({ success: true, data: null, error: null })
        expect(membersResponse.status).toBe(404)
        expect(departed?.[PARTICIPANT_FIELDS.DEL_FLAG]).toBe(true)
        expect(departed?.[PARTICIPANT_FIELDS.LEFT_AT]).toBeInstanceOf(Date)
    })

    it("should_close_a_group_for_its_owner_and_revoke_open_invitations", async () => {
        const owner = await createAccount("close-owner")
        const conversationId = await createGroup(owner._id)
        const invitation = await createInvitation(conversationId)

        const response = await request(createTestApp())
            .post(closePath(conversationId.toString()))
            .set("Authorization", `Bearer ${owner.token}`)
            .send({})
        const group = await Conversation.findById(conversationId)
        const storedInvitation = await Invitation.findById(invitation.id)

        expect(response.status).toBe(200)
        expect(response.body.data[CONVERSATION_DTO_FIELDS.STATUS]).toBe(CONVERSATION_STATUS.CLOSED)
        expect(group?.[CONVERSATION_FIELDS.STATUS]).toBe(CONVERSATION_STATUS.CLOSED)
        expect(storedInvitation?.[INVITATION_MODEL_FIELDS.REVOKED_AT]).toBeInstanceOf(Date)
    })

    it("should_forbid_a_member_from_closing_a_group", async () => {
        const owner = await createAccount("member-close-owner")
        const member = await createAccount("member-close-member")
        const conversationId = await createGroup(owner._id, [{ userId: member._id, role: ROLE.MEMBER }])

        const response = await request(createTestApp())
            .post(closePath(conversationId.toString()))
            .set("Authorization", `Bearer ${member.token}`)
            .send({})
        const group = await Conversation.findById(conversationId)

        expect(response.status).toBe(403)
        expect(response.body.error.code).toBe(ERROR_CODES.INSUFFICIENT_ROLE)
        expect(group?.[CONVERSATION_FIELDS.STATUS]).toBe(CONVERSATION_STATUS.ACTIVE)
    })

    it("should_require_owner_transfer_before_owner_leave", async () => {
        const owner = await createAccount("owner-leave-owner")
        const member = await createAccount("owner-leave-member")
        const conversationId = await createGroup(owner._id, [{ userId: member._id, role: ROLE.MEMBER }])

        const response = await request(createTestApp())
            .post(leavePath(conversationId.toString()))
            .set("Authorization", `Bearer ${owner.token}`)
            .send({})

        expect(response.status).toBe(403)
        expect(response.body.error.code).toBe(ERROR_CODES.OWNER_TRANSFER_REQUIRED)
    })

    it("should_reject_invitation_joins_after_group_closure", async () => {
        const owner = await createAccount("closed-join-owner")
        const invitee = await createAccount("closed-join-invitee")
        const conversationId = await createGroup(owner._id)
        const invitation = await createInvitation(conversationId)
        const app = createTestApp()
        const closed = await request(app)
            .post(closePath(conversationId.toString()))
            .set("Authorization", `Bearer ${owner.token}`)
            .send({})

        const response = await request(app)
            .post(acceptPath(invitation.rawToken))
            .set("Authorization", `Bearer ${invitee.token}`)
            .send({})
        const group = await Conversation.findById(conversationId)
        const storedInvitation = await Invitation.findById(invitation.id)

        expect(closed.status).toBe(200)
        expect(response.status).toBe(410)
        expect(response.body.error.code).toBe(ERROR_CODES.INVITATION_UNAVAILABLE)
        expect(group?.[CONVERSATION_FIELDS.PARTICIPANTS]).toHaveLength(1)
        expect(storedInvitation?.[INVITATION_MODEL_FIELDS.USE_COUNT]).toBe(0)
    })

    it("should_require_authentication_for_lifecycle_actions", async () => {
        const owner = await createAccount("unauth-owner")
        const conversationId = await createGroup(owner._id)

        const response = await request(createTestApp())
            .post(leavePath(conversationId.toString()))
            .send({})

        expect(response.status).toBe(401)
        expect(response.body.error.code).toBe(ERROR_CODES.UNAUTHORIZED)
    })
})

/** Build the real application composition root with isolated test credentials. */
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

/** Create an account and access token for route authorization. */
async function createAccount(suffix: string): Promise<{ readonly _id: mongoose.Types.ObjectId; readonly token: string }> {
    const user = await User.create({
        username: `lifecycle_route_${suffix}`,
        email: `lifecycle_route_${suffix}@example.com`,
        displayName: `Lifecycle route ${suffix}`,
        hashedPassword: "group-lifecycle-route-test-hash",
    })
    return {
        _id: user._id,
        token: new AuthTokenService(TEST_TOKEN_SECRET).createAccessToken(user._id.toString()),
    }
}

/** Persist a group with one owner and optional active participants. */
async function createGroup(
    ownerId: mongoose.Types.ObjectId,
    members: readonly { readonly userId: mongoose.Types.ObjectId; readonly role: GroupMemberRole }[] = [],
): Promise<mongoose.Types.ObjectId> {
    const conversation = await Conversation.create({
        [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
        [CONVERSATION_FIELDS.PARTICIPANTS]: [
            { [PARTICIPANT_FIELDS.USER_ID]: ownerId, [PARTICIPANT_FIELDS.ROLE]: ROLE.OWNER },
            ...members.map(({ userId, role }) => ({
                [PARTICIPANT_FIELDS.USER_ID]: userId,
                [PARTICIPANT_FIELDS.ROLE]: role,
            })),
        ],
        [CONVERSATION_FIELDS.GROUP]: {
            [GROUP_FIELDS.NAME]: "Group lifecycle route",
            [GROUP_FIELDS.OWNER_ID]: ownerId,
        },
    })
    return conversation._id
}

/** Persist one valid invite link to verify close and join behavior. */
async function createInvitation(conversationId: mongoose.Types.ObjectId): Promise<{
    readonly id: mongoose.Types.ObjectId
    readonly rawToken: string
}> {
    const rawToken = randomBytes(32).toString("base64url")
    const tokenHash = createHash("sha256").update(rawToken).digest("hex")
    const [invitation] = await Invitation.create([{
        [INVITATION_MODEL_FIELDS.CONVERSATION_ID]: conversationId,
        [INVITATION_MODEL_FIELDS.TOKEN_HASH]: tokenHash,
        [INVITATION_MODEL_FIELDS.IDEMPOTENCY_KEY_HASH]: createHash("sha256").update(randomUUID()).digest("hex"),
    }])
    if (!invitation) throw new Error("Lifecycle route invitation was not created")
    return { id: invitation._id, rawToken }
}

/** Build the member list endpoint for one group. */
function memberListPath(conversationId: string): string {
    return `${API_ROUTES.CONVERSATIONS}${MEMBERSHIP_ROUTE_PATHS.PARTICIPANTS.replace(
        `:${CONVERSATION_PARAMS.ID}`,
        conversationId,
    )}`
}

/** Build the authenticated leave endpoint for one group. */
function leavePath(conversationId: string): string {
    return `${API_ROUTES.CONVERSATIONS}${CONVERSATION_ROUTE_PATHS.LEAVE.replace(
        `:${CONVERSATION_PARAMS.ID}`,
        conversationId,
    )}`
}

/** Build the authenticated close endpoint for one group. */
function closePath(conversationId: string): string {
    return `${API_ROUTES.CONVERSATIONS}${CONVERSATION_ROUTE_PATHS.CLOSE.replace(
        `:${CONVERSATION_PARAMS.ID}`,
        conversationId,
    )}`
}

/** Build the invitation acceptance endpoint for one URL token. */
function acceptPath(token: string): string {
    return `${API_ROUTES.INVITATIONS}${INVITATION_PREVIEW_ROUTE_PATHS.ACCEPT.replace(
        `:${INVITATION_PARAMS.TOKEN}`,
        token,
    )}`
}
