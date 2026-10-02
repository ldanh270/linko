import { createHash, randomUUID } from "node:crypto"

import {
    CONVERSATION_STATUS,
    CONVERSATION_DTO_FIELDS,
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
import { MongooseConversationRepository } from "./conversation.repository"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "./conversation.constants"
import { MongooseConversationLifecycleRepository } from "./conversationLifecycle.repository"
import { ConversationLifecycleService } from "./conversationLifecycle.service"
import { MongooseInvitationRepository } from "../invitation/invitation.repository"
import Invitation from "../invitation/Invitation"
import { INVITATION_MODEL_FIELDS } from "../invitation/invitation.constants"
import { InvitationService } from "../invitation/invitation.service"
import { MongooseMembershipRepository } from "../membership/membership.repository"
import { MembershipService } from "../membership/membership.service"
import { NotFoundException } from "../../shared/errors/NotFoundException"

const TEST_WIRED_TIGER_CACHE_SIZE_GB = "0.25"
const DEPARTED_AT = new Date("2026-10-04T12:00:00.000Z")
const REJOINED_AT = new Date("2026-10-04T13:00:00.000Z")

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger",
            args: [`--wiredTigerCacheSizeGB=${TEST_WIRED_TIGER_CACHE_SIZE_GB}`],
        },
    })
    await mongoose.connect(replicaSet.getUri(), { dbName: "group-lifecycle-service-test" })
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

describe("ConversationLifecycleService", () => {
    it("should_require_owner_transfer_before_leave", async () => {
        const owner = await createAccount("owner-transfer")
        const member = await createAccount("owner-transfer-member")
        const conversationId = await createGroup(owner._id, [member._id])
        const service = createLifecycleService()

        await expect(service.leave({ conversationId, actorId: owner._id })).rejects.toMatchObject({
            code: ERROR_CODES.OWNER_TRANSFER_REQUIRED,
        })

        const group = await Conversation.findById(conversationId)
        expect(group?.[CONVERSATION_FIELDS.PARTICIPANTS]).toHaveLength(2)
    })

    it("should_revoke_invites_on_close", async () => {
        const owner = await createAccount("close-owner")
        const conversationId = await createGroup(owner._id)
        const invitation = await createInvitation(conversationId)
        const service = createLifecycleService()

        const closed = await service.close({ conversationId, actorId: owner._id })

        const storedInvitation = await Invitation.findOne({ [INVITATION_MODEL_FIELDS.ID]: invitation.id })
        expect(closed[CONVERSATION_DTO_FIELDS.STATUS]).toBe(CONVERSATION_STATUS.CLOSED)
        expect(storedInvitation?.[INVITATION_MODEL_FIELDS.REVOKED_AT]).toBeInstanceOf(Date)
    })

    it("should_close_and_revoke_invites_when_the_last_owner_leaves", async () => {
        const owner = await createAccount("solo-owner")
        const conversationId = await createGroup(owner._id)
        const invitation = await createInvitation(conversationId)
        const service = createLifecycleService()

        await service.leave({ conversationId, actorId: owner._id })

        const group = await Conversation.findById(conversationId)
        const storedInvitation = await Invitation.findById(invitation.id)
        expect(group?.[CONVERSATION_FIELDS.STATUS]).toBe(CONVERSATION_STATUS.CLOSED)
        expect(group?.[CONVERSATION_FIELDS.PARTICIPANTS][0]?.[PARTICIPANT_FIELDS.DEL_FLAG]).toBe(true)
        expect(storedInvitation?.[INVITATION_MODEL_FIELDS.REVOKED_AT]).toBeInstanceOf(Date)
    })

    it("should_remove_group_access_after_leave", async () => {
        const owner = await createAccount("leave-owner")
        const member = await createAccount("leave-member")
        const conversationId = await createGroup(owner._id, [member._id])
        const service = createLifecycleService()
        const membershipService = createMembershipService()

        await service.leave({ conversationId, actorId: member._id })

        await expect(membershipService.list(conversationId, member._id)).rejects.toBeInstanceOf(NotFoundException)
        const conversations = await new MongooseConversationRepository().findConversationsByParticipant(member._id)
        const group = await Conversation.findById(conversationId)
        const departed = group?.[CONVERSATION_FIELDS.PARTICIPANTS].find((participant) =>
            participant[PARTICIPANT_FIELDS.USER_ID].equals(member._id),
        )
        expect(conversations).toHaveLength(0)
        expect(departed?.[PARTICIPANT_FIELDS.DEL_FLAG]).toBe(true)
        expect(departed?.[PARTICIPANT_FIELDS.LEFT_AT]?.toISOString()).toBe(DEPARTED_AT.toISOString())
    })

    it("should_create_a_new_membership_record_when_a_user_rejoins", async () => {
        const owner = await createAccount("rejoin-owner")
        const member = await createAccount("rejoin-member")
        const conversationId = await createGroup(owner._id, [member._id])
        const invitation = await createInvitation(conversationId)
        const lifecycleService = createLifecycleService()
        const membershipService = createMembershipService()
        const invitationService = new InvitationService({
            repository: new MongooseInvitationRepository(),
            transactionRunner: { run: withTransaction },
            clientOrigin: "https://linko.example",
            membershipService,
            groupReader: new MongooseConversationRepository(),
            clock: { now: () => REJOINED_AT },
        })

        await lifecycleService.leave({ conversationId, actorId: member._id })
        await invitationService.accept({ rawToken: invitation.rawToken, userId: member._id })

        const group = await Conversation.findById(conversationId)
        const memberships = group?.[CONVERSATION_FIELDS.PARTICIPANTS].filter((participant) =>
            participant[PARTICIPANT_FIELDS.USER_ID].equals(member._id),
        ) ?? []
        expect(memberships).toHaveLength(2)
        expect(memberships[0]?.[PARTICIPANT_FIELDS.DEL_FLAG]).toBe(true)
        expect(memberships[0]?.[PARTICIPANT_FIELDS.LEFT_AT]?.toISOString()).toBe(DEPARTED_AT.toISOString())
        expect(memberships[1]?.[PARTICIPANT_FIELDS.DEL_FLAG]).toBe(false)
        expect(memberships[1]?.[PARTICIPANT_FIELDS.JOINED_AT]?.toISOString()).toBe(REJOINED_AT.toISOString())
    })
})

/** Build the lifecycle service with MongoDB transaction-backed collaborators. */
function createLifecycleService(): ConversationLifecycleService {
    return new ConversationLifecycleService({
        repository: new MongooseConversationLifecycleRepository(),
        groupReader: new MongooseConversationRepository(),
        transactionRunner: { run: withTransaction },
        invitationRevoker: new MongooseInvitationRepository(),
        clock: { now: () => DEPARTED_AT },
    })
}

/** Build membership use cases with a deterministic timestamp for invitation re-entry. */
function createMembershipService(): MembershipService {
    return new MembershipService({
        repository: new MongooseMembershipRepository(),
        transactionRunner: { run: withTransaction },
        clock: { now: () => REJOINED_AT },
    })
}

/** Persist a user record for one lifecycle test. */
async function createAccount(suffix: string): Promise<{ readonly _id: mongoose.Types.ObjectId }> {
    return User.create({
        username: `lifecycle_${suffix}`,
        email: `lifecycle_${suffix}@example.com`,
        displayName: `Lifecycle ${suffix}`,
        hashedPassword: "group-lifecycle-test-hash",
    })
}

/** Persist a private group with its owner and optional active members. */
async function createGroup(
    ownerId: mongoose.Types.ObjectId,
    memberIds: readonly mongoose.Types.ObjectId[] = [],
): Promise<mongoose.Types.ObjectId> {
    const conversation = await Conversation.create({
        [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
        [CONVERSATION_FIELDS.PARTICIPANTS]: [
            { [PARTICIPANT_FIELDS.USER_ID]: ownerId, [PARTICIPANT_FIELDS.ROLE]: ROLE.OWNER },
            ...memberIds.map((userId) => ({ [PARTICIPANT_FIELDS.USER_ID]: userId, [PARTICIPANT_FIELDS.ROLE]: ROLE.MEMBER })),
        ],
        [CONVERSATION_FIELDS.GROUP]: {
            [GROUP_FIELDS.NAME]: "Group lifecycle test",
            [GROUP_FIELDS.OWNER_ID]: ownerId,
        },
    })
    return conversation._id
}

/** Persist a valid single-use invitation for a group. */
async function createInvitation(conversationId: mongoose.Types.ObjectId): Promise<{
    readonly id: mongoose.Types.ObjectId
    readonly rawToken: string
}> {
    const rawToken = randomUUID()
    const tokenHash = createHash("sha256").update(rawToken).digest("hex")
    const [invitation] = await Invitation.create([{
        [INVITATION_MODEL_FIELDS.CONVERSATION_ID]: conversationId,
        [INVITATION_MODEL_FIELDS.TOKEN_HASH]: tokenHash,
        [INVITATION_MODEL_FIELDS.IDEMPOTENCY_KEY_HASH]: createHash("sha256").update(randomUUID()).digest("hex"),
    }])
    if (!invitation) throw new Error("Lifecycle test invitation was not created")
    return { id: invitation._id, rawToken }
}
