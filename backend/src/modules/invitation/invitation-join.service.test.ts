import { createHash, randomUUID } from "node:crypto"

import { CONVERSATION_TYPE, GROUP_FIELDS, ROLE } from "@linko/contracts"
import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import Conversation from "../../models/Conversation"
import User from "../../models/User"
import { withTransaction } from "../../shared/persistence/withTransaction"
import { MongooseConversationRepository } from "../conversation/conversation.repository"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import { MongooseMembershipRepository } from "../membership/membership.repository"
import { MembershipService } from "../membership/membership.service"
import Invitation from "./Invitation"
import { INVITATION_MODEL_FIELDS } from "./invitation.constants"
import { MongooseInvitationRepository } from "./invitation.repository"
import { InvitationService } from "./invitation.service"

const TEST_WIRED_TIGER_CACHE_SIZE_GB = "0.25"
const RAW_TOKEN = "A".repeat(43)
const TOKEN_HASH = createHash("sha256").update(RAW_TOKEN).digest("hex")
const ACCEPTANCE_TIME = new Date("2026-10-04T12:30:00.000Z")

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger",
            args: [`--wiredTigerCacheSizeGB=${TEST_WIRED_TIGER_CACHE_SIZE_GB}`],
        },
    })
    await mongoose.connect(replicaSet.getUri(), { dbName: "invitation-join-service-test" })
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

describe("InvitationService accept rules", () => {
    it("should_not_increment_use_count_for_existing_member", async () => {
        const owner = await createAccount("existing-owner")
        const conversationId = await createGroup(owner._id)
        await createInvitation(conversationId)
        const service = createService()

        await service.accept({ rawToken: RAW_TOKEN, userId: owner._id })

        const invitation = await Invitation.findOne({ [INVITATION_MODEL_FIELDS.TOKEN_HASH]: TOKEN_HASH })
        expect(invitation?.[INVITATION_MODEL_FIELDS.USE_COUNT]).toBe(0)
    })

    it("should_allow_one_of_two_competing_final_uses", async () => {
        const owner = await createAccount("race-owner")
        const firstInvitee = await createAccount("race-first")
        const secondInvitee = await createAccount("race-second")
        const conversationId = await createGroup(owner._id)
        await createInvitation(conversationId, 24)
        const service = createService()

        const results = await Promise.allSettled([
            service.accept({ rawToken: RAW_TOKEN, userId: firstInvitee._id }),
            service.accept({ rawToken: RAW_TOKEN, userId: secondInvitee._id }),
        ])
        const invitation = await Invitation.findOne({ [INVITATION_MODEL_FIELDS.TOKEN_HASH]: TOKEN_HASH })

        expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
        expect(invitation?.[INVITATION_MODEL_FIELDS.USE_COUNT]).toBe(25)
    })

    it("should_set_joinedAt_to_acceptance_time", async () => {
        const owner = await createAccount("joined-owner")
        const invitee = await createAccount("joined-invitee")
        const conversationId = await createGroup(owner._id)
        await createInvitation(conversationId)
        const service = createService()

        await service.accept({ rawToken: RAW_TOKEN, userId: invitee._id })

        const conversation = await Conversation.findById(conversationId)
        const joinedMember = conversation?.[CONVERSATION_FIELDS.PARTICIPANTS].find((participant) =>
            participant[PARTICIPANT_FIELDS.USER_ID].equals(invitee._id),
        )
        expect(joinedMember?.[PARTICIPANT_FIELDS.JOINED_AT]?.toISOString()).toBe(ACCEPTANCE_TIME.toISOString())
    })
})

/** Create a persistence-backed invitation service with a deterministic join timestamp. */
function createService(): InvitationService {
    const conversationRepository = new MongooseConversationRepository()
    const membershipService = new MembershipService({
        repository: new MongooseMembershipRepository(),
        transactionRunner: { run: withTransaction },
        clock: { now: () => ACCEPTANCE_TIME },
    })
    return new InvitationService({
        repository: new MongooseInvitationRepository(),
        transactionRunner: { run: withTransaction },
        clientOrigin: "https://linko.example",
        membershipService,
        groupReader: conversationRepository,
        clock: { now: () => ACCEPTANCE_TIME },
    })
}

/** Persist a user account whose ObjectId can participate in a group. */
async function createAccount(suffix: string): Promise<{ readonly _id: mongoose.Types.ObjectId }> {
    return User.create({
        username: `join_${suffix}`,
        email: `join_${suffix}@example.com`,
        displayName: `Join ${suffix}`,
        hashedPassword: "invitation-join-test-hash",
    })
}

/** Persist a private group with one owner participant. */
async function createGroup(ownerId: mongoose.Types.ObjectId): Promise<mongoose.Types.ObjectId> {
    const conversation = await Conversation.create({
        [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
        [CONVERSATION_FIELDS.PARTICIPANTS]: [{
            [PARTICIPANT_FIELDS.USER_ID]: ownerId,
            [PARTICIPANT_FIELDS.ROLE]: ROLE.OWNER,
        }],
        [CONVERSATION_FIELDS.GROUP]: {
            [GROUP_FIELDS.NAME]: "Invitation join group",
            [GROUP_FIELDS.OWNER_ID]: ownerId,
        },
    })
    return conversation._id
}

/** Persist one invitation link with an optionally nearly exhausted use counter. */
async function createInvitation(conversationId: mongoose.Types.ObjectId, useCount = 0): Promise<void> {
    await Invitation.create({
        [INVITATION_MODEL_FIELDS.CONVERSATION_ID]: conversationId,
        [INVITATION_MODEL_FIELDS.TOKEN_HASH]: TOKEN_HASH,
        [INVITATION_MODEL_FIELDS.IDEMPOTENCY_KEY_HASH]: createHash("sha256").update(randomUUID()).digest("hex"),
        [INVITATION_MODEL_FIELDS.USE_COUNT]: useCount,
    })
}
