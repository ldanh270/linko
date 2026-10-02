import { API_ROUTES, CONVERSATION_PARAMS, CONVERSATION_TYPE, ERROR_CODES, GROUP_FIELDS, MEMBERSHIP_FIELDS, MEMBERSHIP_PARAMS, MEMBERSHIP_REQUEST_FIELDS, MEMBERSHIP_ROUTE_PATHS, ROLE, type GroupMemberRole } from "@linko/contracts"
import cookieParser from "cookie-parser"
import express, { type Express } from "express"
import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import User from "../../models/User"
import Conversation from "../../models/Conversation"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import { AuthTokenService } from "../auth/auth.security"
import { createAuthenticate } from "../../middlewares/route.middleware"
import { createLogger } from "../../shared/logger/logger"
import { createGlobalErrorHandler } from "../../shared/middlewares/globalErrorHandler"
import { withRequestContext } from "../../shared/middlewares/requestContext"
import { withTransaction } from "../../shared/persistence/withTransaction"
import { MembershipController } from "./membership.controller"
import { createMembershipRouter } from "./membership.route"
import { MongooseMembershipRepository } from "./membership.repository"
import { MembershipService } from "./membership.service"

const TEST_TOKEN_SECRET = "membership-route-tests-use-a-sufficiently-long-secret"
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
    await mongoose.connect(replicaSet.getUri(), { dbName: "membership-route-test" })
    await User.init()
    await Conversation.init()
})

beforeEach(async () => {
    await Conversation.collection.deleteMany({})
    await User.collection.deleteMany({})
})

afterAll(async () => {
    await mongoose.disconnect()
    await replicaSet?.stop()
})

/** Build the authenticated membership API against isolated MongoDB persistence. */
function createTestApp(): Express {
    const logger = createLogger(() => undefined)
    const service = new MembershipService({
        repository: new MongooseMembershipRepository(),
        transactionRunner: { run: withTransaction },
        clock: { now: () => new Date("2026-10-04T00:00:00.000Z") },
    })
    const app = express()
    app.use(withRequestContext)
    app.use(express.json())
    app.use(cookieParser())
    app.use(createAuthenticate(TEST_TOKEN_SECRET))
    app.use(API_ROUTES.CONVERSATIONS, createMembershipRouter(new MembershipController(service)))
    app.use(createGlobalErrorHandler(logger))
    return app
}

/** Create an account and the access token used by authenticated route tests. */
async function createAccount(suffix: string): Promise<{ readonly id: string; readonly token: string }> {
    const user = await User.create({
        username: `member_${suffix}`,
        email: `member_${suffix}@example.com`,
        displayName: `Member ${suffix}`,
        hashedPassword: "membership-test-hash",
    })
    const token = new AuthTokenService(TEST_TOKEN_SECRET).createAccessToken(user._id.toString())
    return { id: user._id.toString(), token }
}

/** Persist a private group with an owner and the supplied current member roles. */
async function createGroup(
    ownerId: string,
    members: readonly { readonly userId: string; readonly role: GroupMemberRole }[] = [],
): Promise<string> {
    const conversation = await Conversation.create({
        conversationType: CONVERSATION_TYPE.GROUP,
        participants: [
            { userId: new mongoose.Types.ObjectId(ownerId), role: ROLE.OWNER },
            ...members.map((member) => ({ userId: new mongoose.Types.ObjectId(member.userId), role: member.role })),
        ],
        group: { [GROUP_FIELDS.OWNER_ID]: new mongoose.Types.ObjectId(ownerId), name: "Membership test" },
    })
    return conversation._id.toString()
}

/** Build the group member-list route for one conversation. */
function memberListPath(conversationId: string): string {
    return `${API_ROUTES.CONVERSATIONS}${MEMBERSHIP_ROUTE_PATHS.PARTICIPANTS.replace(`:${CONVERSATION_PARAMS.ID}`, conversationId)}`
}

/** Build one group member mutation route. */
function memberPath(conversationId: string, userId: string): string {
    const route = MEMBERSHIP_ROUTE_PATHS.MEMBER
        .replace(`:${CONVERSATION_PARAMS.ID}`, conversationId)
        .replace(`:${MEMBERSHIP_PARAMS.USER_ID}`, userId)
    return `${API_ROUTES.CONVERSATIONS}${route}`
}

describe("membership role HTTP routes", () => {
    it("should_list_safe_member_dtos_only_to_a_current_participant", async () => {
        const owner = await createAccount("list-owner")
        const member = await createAccount("list-member")
        const conversationId = await createGroup(owner.id, [{ userId: member.id, role: ROLE.MEMBER }])

        const response = await request(createTestApp())
            .get(memberListPath(conversationId))
            .set("Authorization", `Bearer ${owner.token}`)

        expect(response.status).toBe(200)
        expect(response.body.data).toHaveLength(2)
        expect(response.body.data[1]).toMatchObject({ [MEMBERSHIP_FIELDS.USER_ID]: member.id, [MEMBERSHIP_FIELDS.ROLE]: ROLE.MEMBER, [MEMBERSHIP_FIELDS.DISPLAY_NAME]: "Member list-member" })
        expect(response.body.data[1]).not.toHaveProperty("email")
        expect(response.body.data[1]).not.toHaveProperty("hashedPassword")
    })

    it("should_hide_membership_from_nonparticipants", async () => {
        const owner = await createAccount("private-owner")
        const stranger = await createAccount("stranger")
        const conversationId = await createGroup(owner.id)

        const response = await request(createTestApp())
            .get(memberListPath(conversationId))
            .set("Authorization", `Bearer ${stranger.token}`)

        expect(response.status).toBe(404)
        expect(response.body.error.code).toBe(ERROR_CODES.NOT_FOUND)
        expect(JSON.stringify(response.body)).not.toContain(owner.id)
    })

    it("should_enforce_owner_admin_and_member_role_rules", async () => {
        const owner = await createAccount("roles-owner")
        const admin = await createAccount("roles-admin")
        const member = await createAccount("roles-member")
        const conversationId = await createGroup(owner.id, [
            { userId: admin.id, role: ROLE.ADMIN },
            { userId: member.id, role: ROLE.MEMBER },
        ])
        const app = createTestApp()

        const adminCannotChangeOwner = await request(app)
            .patch(memberPath(conversationId, owner.id))
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ [MEMBERSHIP_REQUEST_FIELDS.ROLE]: ROLE.MEMBER })
        const memberCannotPromoteSelf = await request(app)
            .patch(memberPath(conversationId, member.id))
            .set("Authorization", `Bearer ${member.token}`)
            .send({ [MEMBERSHIP_REQUEST_FIELDS.ROLE]: ROLE.ADMIN })
        const adminCannotPromoteMember = await request(app)
            .patch(memberPath(conversationId, member.id))
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ [MEMBERSHIP_REQUEST_FIELDS.ROLE]: ROLE.ADMIN })
        const ownerCanPromoteMember = await request(app)
            .patch(memberPath(conversationId, member.id))
            .set("Authorization", `Bearer ${owner.token}`)
            .send({ [MEMBERSHIP_REQUEST_FIELDS.ROLE]: ROLE.ADMIN })

        expect(adminCannotChangeOwner.status).toBe(403)
        expect(adminCannotChangeOwner.body.error.code).toBe(ERROR_CODES.INSUFFICIENT_ROLE)
        expect(memberCannotPromoteSelf.status).toBe(403)
        expect(memberCannotPromoteSelf.body.error.code).toBe(ERROR_CODES.INSUFFICIENT_ROLE)
        expect(adminCannotPromoteMember.status).toBe(403)
        expect(adminCannotPromoteMember.body.error.code).toBe(ERROR_CODES.INSUFFICIENT_ROLE)
        expect(ownerCanPromoteMember.status).toBe(200)
        expect(ownerCanPromoteMember.body.data[MEMBERSHIP_FIELDS.ROLE]).toBe(ROLE.ADMIN)
    })

    it("should_recheck_role_after_an_actor_loses_admin_access", async () => {
        const owner = await createAccount("stale-owner")
        const admin = await createAccount("stale-admin")
        const member = await createAccount("stale-member")
        const conversationId = await createGroup(owner.id, [
            { userId: admin.id, role: ROLE.ADMIN },
            { userId: member.id, role: ROLE.MEMBER },
        ])
        await Conversation.updateOne(
            { [CONVERSATION_FIELDS.ID]: conversationId, [`${CONVERSATION_FIELDS.PARTICIPANTS}.${PARTICIPANT_FIELDS.USER_ID}`]: new mongoose.Types.ObjectId(admin.id) },
            { $set: { [`${CONVERSATION_FIELDS.PARTICIPANTS}.$.${PARTICIPANT_FIELDS.ROLE}`]: ROLE.MEMBER } },
        )

        const response = await request(createTestApp())
            .patch(memberPath(conversationId, member.id))
            .set("Authorization", `Bearer ${admin.token}`)
            .send({ [MEMBERSHIP_REQUEST_FIELDS.ROLE]: ROLE.ADMIN })

        expect(response.status).toBe(403)
        expect(response.body.error.code).toBe(ERROR_CODES.INSUFFICIENT_ROLE)
    })

    it("should_transfer_owner_with_exactly_one_owner_role", async () => {
        const owner = await createAccount("transfer-owner")
        const admin = await createAccount("transfer-admin")
        const conversationId = await createGroup(owner.id, [{ userId: admin.id, role: ROLE.ADMIN }])

        const response = await request(createTestApp())
            .post(transferOwnerPath(conversationId))
            .set("Authorization", `Bearer ${owner.token}`)
            .send({ [MEMBERSHIP_REQUEST_FIELDS.NEW_OWNER_ID]: admin.id })
        const conversation = await Conversation.findById(conversationId)

        expect(response.status).toBe(200)
        expect(response.body.data).toBeNull()
        expect(conversation?.group?.ownerId.toString()).toBe(admin.id)
        expect(conversation?.[CONVERSATION_FIELDS.PARTICIPANTS].filter((participant) => participant[PARTICIPANT_FIELDS.ROLE] === ROLE.OWNER)).toHaveLength(1)
        expect(conversation?.[CONVERSATION_FIELDS.PARTICIPANTS].find((participant) => participant[PARTICIPANT_FIELDS.USER_ID].toString() === owner.id)?.[PARTICIPANT_FIELDS.ROLE]).toBe(ROLE.ADMIN)
        expect(conversation?.[CONVERSATION_FIELDS.PARTICIPANTS].find((participant) => participant[PARTICIPANT_FIELDS.USER_ID].toString() === admin.id)?.[PARTICIPANT_FIELDS.ROLE]).toBe(ROLE.OWNER)
    })

    it("should_keep_one_owner_when_transfers_race", async () => {
        const owner = await createAccount("race-owner")
        const firstTarget = await createAccount("race-first-target")
        const secondTarget = await createAccount("race-second-target")
        const conversationId = await createGroup(owner.id, [
            { userId: firstTarget.id, role: ROLE.MEMBER },
            { userId: secondTarget.id, role: ROLE.MEMBER },
        ])
        const app = createTestApp()
        const responses = await Promise.all([
            request(app)
                .post(transferOwnerPath(conversationId))
                .set("Authorization", `Bearer ${owner.token}`)
                .send({ [MEMBERSHIP_REQUEST_FIELDS.NEW_OWNER_ID]: firstTarget.id }),
            request(app)
                .post(transferOwnerPath(conversationId))
                .set("Authorization", `Bearer ${owner.token}`)
                .send({ [MEMBERSHIP_REQUEST_FIELDS.NEW_OWNER_ID]: secondTarget.id }),
        ])
        const conversation = await Conversation.findById(conversationId)
        const expectedOwnerId = responses[0]?.status === 200 ? firstTarget.id : secondTarget.id

        expect(responses.filter((response) => response.status === 200)).toHaveLength(1)
        expect(responses.some((response) => response.status === 403 || response.status === 409)).toBe(true)
        expect(conversation?.[CONVERSATION_FIELDS.PARTICIPANTS].filter((participant) => participant[PARTICIPANT_FIELDS.ROLE] === ROLE.OWNER)).toHaveLength(1)
        expect(conversation?.[CONVERSATION_FIELDS.GROUP]?.[GROUP_FIELDS.OWNER_ID].toString()).toBe(expectedOwnerId)
    })
    it("should_not_duplicate_an_invitation_member_on_repeat", async () => {
        const owner = await createAccount("duplicate-owner")
        const invitee = await createAccount("duplicate-invitee")
        const conversationId = await createGroup(owner.id)
        const service = new MembershipService({
            repository: new MongooseMembershipRepository(),
            transactionRunner: { run: withTransaction },
            clock: { now: () => new Date("2026-10-04T00:00:00.000Z") },
        })

        const first = await withTransaction((transaction) => service.addFromInvitation({
            conversationId: new mongoose.Types.ObjectId(conversationId),
            userId: new mongoose.Types.ObjectId(invitee.id),
        }, transaction))
        const repeated = await withTransaction((transaction) => service.addFromInvitation({
            conversationId: new mongoose.Types.ObjectId(conversationId),
            userId: new mongoose.Types.ObjectId(invitee.id),
        }, transaction))
        const conversation = await Conversation.findById(conversationId)

        expect(first).toEqual(repeated)
        expect(conversation?.[CONVERSATION_FIELDS.PARTICIPANTS].filter((participant) => participant[PARTICIPANT_FIELDS.USER_ID].toString() === invitee.id)).toHaveLength(1)
    })

    it("should_remove_a_member_and_revoke_their_membership_access", async () => {
        const owner = await createAccount("remove-owner")
        const member = await createAccount("remove-member")
        const conversationId = await createGroup(owner.id, [{ userId: member.id, role: ROLE.MEMBER }])
        const app = createTestApp()

        const removed = await request(app)
            .delete(memberPath(conversationId, member.id))
            .set("Authorization", `Bearer ${owner.token}`)
        const listedByFormerMember = await request(app)
            .get(memberListPath(conversationId))
            .set("Authorization", `Bearer ${member.token}`)

        expect(removed.status).toBe(200)
        expect(removed.body.data).toBeNull()
        expect(listedByFormerMember.status).toBe(404)
    })

    it("should_reject_unauthenticated_member_requests", async () => {
        const owner = await createAccount("unauth-owner")
        const conversationId = await createGroup(owner.id)

        const response = await request(createTestApp()).get(memberListPath(conversationId))

        expect(response.status).toBe(401)
        expect(response.body.error.code).toBe(ERROR_CODES.UNAUTHORIZED)
    })
})

function transferOwnerPath(conversationId: string): string {
    return `${API_ROUTES.CONVERSATIONS}${MEMBERSHIP_ROUTE_PATHS.TRANSFER_OWNER.replace(`:${CONVERSATION_PARAMS.ID}`, conversationId)}`
}
