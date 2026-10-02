import mongoose from "mongoose"
import { CONVERSATION_STATUS, ERROR_CODES, ROLE } from "@linko/contracts"
import { describe, expect, it, vi } from "vitest"

import { ForbiddenException } from "../../shared/errors/ForbiddenException"
import { MembershipService } from "./membership.service"
import type { MembershipGroupRecord, MembershipRepository, MembershipTransactionRunner } from "./membership.types"

const CONVERSATION_ID = new mongoose.Types.ObjectId()
const OWNER_ID = new mongoose.Types.ObjectId()
const ADMIN_ID = new mongoose.Types.ObjectId()
const MEMBER_ID = new mongoose.Types.ObjectId()
const JOINED_AT = new Date("2026-10-01T00:00:00.000Z")

const GROUP: MembershipGroupRecord = {
    conversationId: CONVERSATION_ID,
    ownerId: OWNER_ID,
    status: CONVERSATION_STATUS.ACTIVE,
    members: [
        { userId: OWNER_ID, role: ROLE.OWNER, displayName: "Owner", avatarUrl: null, joinedAt: JOINED_AT },
        { userId: ADMIN_ID, role: ROLE.ADMIN, displayName: "Admin", avatarUrl: null, joinedAt: JOINED_AT },
        { userId: MEMBER_ID, role: ROLE.MEMBER, displayName: "Member", avatarUrl: null, joinedAt: JOINED_AT },
    ],
}

function createMembershipService(overrides: {
    readonly repository?: Partial<MembershipRepository>
    readonly transactionRunner?: Partial<MembershipTransactionRunner>
} = {}) {
    const repository: MembershipRepository = {
        findGroup: vi.fn().mockResolvedValue(GROUP),
        changeRole: vi.fn().mockResolvedValue(GROUP.members[2]),
        removeMember: vi.fn().mockResolvedValue(true),
        addMember: vi.fn().mockResolvedValue(GROUP.members[2]),
        transferOwner: vi.fn().mockResolvedValue(true),
        ...overrides.repository,
    }
    const transactionRunner: MembershipTransactionRunner = {
        run: vi.fn(async (operation) => operation({ session: {} as never })),
        ...overrides.transactionRunner,
    }
    return { service: new MembershipService({ repository, transactionRunner, clock: { now: () => JOINED_AT } }), repository, transactionRunner }
}

describe("membership role service", () => {
    it("should_forbid_admin_removing_owner", async () => {
        const { service, repository } = createMembershipService()

        await expect(service.remove({
            conversationId: CONVERSATION_ID,
            actorId: ADMIN_ID,
            targetUserId: OWNER_ID,
        })).rejects.toMatchObject({
            constructor: ForbiddenException,
            code: ERROR_CODES.INSUFFICIENT_ROLE,
        })
        expect(repository.removeMember).not.toHaveBeenCalled()
    })

    it("should_forbid_member_promoting_self", async () => {
        const { service, repository } = createMembershipService()

        await expect(service.changeRole({
            conversationId: CONVERSATION_ID,
            actorId: MEMBER_ID,
            targetUserId: MEMBER_ID,
            role: ROLE.ADMIN,
        })).rejects.toMatchObject({
            constructor: ForbiddenException,
            code: ERROR_CODES.INSUFFICIENT_ROLE,
        })
        expect(repository.changeRole).not.toHaveBeenCalled()
    })

    it("should_transfer_owner_inside_one_transaction", async () => {
        const { service, repository, transactionRunner } = createMembershipService()

        await service.transferOwner({
            conversationId: CONVERSATION_ID,
            actorId: OWNER_ID,
            newOwnerId: ADMIN_ID,
        })

        expect(transactionRunner.run).toHaveBeenCalledOnce()
        expect(repository.transferOwner).toHaveBeenCalledWith(
            {
                conversationId: CONVERSATION_ID,
                actorId: OWNER_ID,
                newOwnerId: ADMIN_ID,
                newOwnerRole: ROLE.ADMIN,
            },
            expect.objectContaining({ session: expect.anything() }),
        )
    })
})
