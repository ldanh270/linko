import { CONVERSATION_TYPE, GROUP_FIELDS, ROLE } from "@linko/contracts"
import { createHash } from "node:crypto"
import mongoose from "mongoose"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import Conversation from "../../models/Conversation"
import User from "../../models/User"
import { withTransaction } from "../../shared/persistence/withTransaction"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import Invitation from "./Invitation"
import { INVITATION_MODEL_FIELDS } from "./invitation.constants"
import { MongooseInvitationRepository } from "./invitation.repository"
import { InvitationService } from "./invitation.service"
import { MongoMemoryReplSet } from "mongodb-memory-server"

const TEST_WIRED_TIGER_CACHE_SIZE_GB = "0.25"
const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger",
            args: [`--wiredTigerCacheSizeGB=${TEST_WIRED_TIGER_CACHE_SIZE_GB}`],
        },
    })
    await mongoose.connect(replicaSet.getUri(), { dbName: "invitation-issue-service-test" })
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

describe("InvitationService issue and revoke rules", () => {
    it("should_store_only_sha256_token_hash", async () => {
        const { service, ownerId, conversationId } = await createService()

        const issued = await service.issue({ conversationId, actorId: ownerId })
        const persisted = await Invitation.findById(issued.id).lean()

        expect(persisted?.[INVITATION_MODEL_FIELDS.TOKEN_HASH]).toMatch(/^[a-f\d]{64}$/)
        expect(persisted).not.toHaveProperty("token")
        expect(persisted).not.toHaveProperty("url")
        expect(issued.url).toMatch(/^https:\/\/linko\.example\/invite\/[A-Za-z0-9_-]{43}$/)
    })

    it("should_expire_after_7_days", async () => {
        const { service, ownerId, conversationId } = await createService()

        const issued = await service.issue({ conversationId, actorId: ownerId })
        const persisted = await Invitation.findById(issued.id).lean()
        if (!persisted) throw new Error("Issued invitation was not persisted")

        expect(persisted[INVITATION_MODEL_FIELDS.EXPIRES_AT].getTime()
            - persisted[INVITATION_MODEL_FIELDS.CREATED_AT].getTime()).toBe(INVITATION_LIFETIME_MS)
        expect(persisted[INVITATION_MODEL_FIELDS.MAX_USES]).toBe(25)
    })

    it("should_revoke_immediately", async () => {
        const { service, ownerId, conversationId } = await createService()
        const issued = await service.issue({ conversationId, actorId: ownerId })

        await service.revoke({
            conversationId,
            invitationId: new mongoose.Types.ObjectId(issued.id),
            actorId: ownerId,
        })
        const revoked = await Invitation.findById(issued.id).lean()

        expect(revoked?.[INVITATION_MODEL_FIELDS.REVOKED_AT]).not.toBeNull()
    })

    it("should_revoke_the_previous_link_when_a_new_link_is_issued", async () => {
        const { service, ownerId, conversationId } = await createService()
        const previous = await service.issue({ conversationId, actorId: ownerId })

        const current = await service.issue({ conversationId, actorId: ownerId })
        const previousToken = new URL(previous.url).pathname.split("/").at(-1)
        const currentToken = new URL(current.url).pathname.split("/").at(-1)
        if (!previousToken || !currentToken) throw new Error("Issued invitation URL did not contain a token")
        const previousHash = createHash("sha256").update(previousToken).digest("hex")
        const currentHash = createHash("sha256").update(currentToken).digest("hex")
        const revoked = await Invitation.findOne({ [INVITATION_MODEL_FIELDS.TOKEN_HASH]: previousHash }).lean()
        const active = await Invitation.findOne({ [INVITATION_MODEL_FIELDS.TOKEN_HASH]: currentHash }).lean()

        expect(revoked?.[INVITATION_MODEL_FIELDS.REVOKED_AT]).not.toBeNull()
        expect(active?.[INVITATION_MODEL_FIELDS.REVOKED_AT]).toBeNull()
    })
})

/** Create a real owner account, group, and invitation service backed by MongoDB. */
async function createService(): Promise<{
    readonly service: InvitationService
    readonly ownerId: mongoose.Types.ObjectId
    readonly conversationId: mongoose.Types.ObjectId
}> {
    const owner = await User.create({
        username: "invitation_owner",
        email: "invitation_owner@example.com",
        displayName: "Invitation owner",
        hashedPassword: "route-test-hash",
    })
    const conversation = await Conversation.create({
        [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
        [CONVERSATION_FIELDS.PARTICIPANTS]: [{
            [PARTICIPANT_FIELDS.USER_ID]: owner._id,
            [PARTICIPANT_FIELDS.ROLE]: ROLE.OWNER,
        }],
        [CONVERSATION_FIELDS.GROUP]: { [GROUP_FIELDS.NAME]: "Invitation group", [GROUP_FIELDS.OWNER_ID]: owner._id },
    })
    return {
        service: new InvitationService({
            repository: new MongooseInvitationRepository(),
            transactionRunner: { run: withTransaction },
            clientOrigin: "https://linko.example",
        }),
        ownerId: owner._id,
        conversationId: conversation._id,
    }
}
