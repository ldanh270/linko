import { ERROR_CODES, ROLE, type GroupDto, type GroupSummaryDto } from "@linko/contracts"
import mongoose from "mongoose"
import { describe, expect, it, vi } from "vitest"

import { ConflictException } from "../../shared/errors/ConflictException"
import { ForbiddenException } from "../../shared/errors/ForbiddenException"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import { ConversationService } from "./conversation.service"
import type { ConversationRepository, GroupRecord, GroupSummaryRecord } from "./conversation.types"

const OWNER_ID = new mongoose.Types.ObjectId("64b000000000000000000001")
const ADMIN_ID = new mongoose.Types.ObjectId("64b000000000000000000002")
const GROUP_ID = new mongoose.Types.ObjectId("64b000000000000000000003")
const TEST_DATE = new Date("2026-10-03T00:00:00.000Z")

const OWNER_GROUP_RECORD: GroupRecord = {
    id: GROUP_ID,
    ownerId: OWNER_ID,
    name: "Weekend readers",
    description: "Books and tea",
    avatar: null,
    participants: [{ userId: OWNER_ID, role: ROLE.OWNER }],
    createdAt: TEST_DATE,
    updatedAt: TEST_DATE,
}

const OWNER_GROUP_DTO: GroupDto = {
    id: GROUP_ID.toString(),
    ownerId: OWNER_ID.toString(),
    name: OWNER_GROUP_RECORD.name,
    description: OWNER_GROUP_RECORD.description,
    avatarUrl: null,
    participants: [{ userId: OWNER_ID.toString(), role: ROLE.OWNER }],
    createdAt: TEST_DATE.toISOString(),
    updatedAt: TEST_DATE.toISOString(),
}

const OWNER_GROUP_SUMMARY: GroupSummaryRecord = {
    ...OWNER_GROUP_RECORD,
    memberCount: 1,
}

const OWNER_GROUP_SUMMARY_DTO: GroupSummaryDto = {
    id: OWNER_GROUP_DTO.id,
    ownerId: OWNER_GROUP_DTO.ownerId,
    name: OWNER_GROUP_DTO.name,
    description: OWNER_GROUP_DTO.description,
    avatarUrl: null,
    memberCount: 1,
    lastMessageAt: null,
    updatedAt: TEST_DATE.toISOString(),
}

/** Build service collaborators so each test exercises one group rule. */
function createService(repositoryOverrides: Partial<ConversationRepository> = {}) {
    const repository: ConversationRepository = {
        reserveGroupSlot: vi.fn().mockResolvedValue("reserved"),
        createGroup: vi.fn().mockResolvedValue(OWNER_GROUP_RECORD),
        findGroupsByParticipant: vi.fn().mockResolvedValue([OWNER_GROUP_SUMMARY]),
        findGroupById: vi.fn().mockResolvedValue(OWNER_GROUP_RECORD),
        updateGroup: vi.fn().mockResolvedValue(OWNER_GROUP_RECORD),
        ...repositoryOverrides,
    }
    const transactionRunner = {
        run: <T>(operation: (transaction: TransactionContext) => Promise<T>) =>
            operation({ session: {} } as TransactionContext),
    }
    const avatarStorage = {
        upload: vi.fn().mockResolvedValue({ url: "https://media.example/group.jpg", id: "r2:groups/group.jpg" }),
        delete: vi.fn().mockResolvedValue(undefined),
    }

    return {
        service: new ConversationService({ repository, transactionRunner, avatarStorage }),
        repository,
        avatarStorage,
    }
}

describe("ConversationService group rules", () => {
    it("should_create_group_with_owner_only", async () => {
        const { service } = createService()

        const group = await service.createGroup({ ownerId: OWNER_ID, name: "Weekend readers" })

        expect(group).toEqual(OWNER_GROUP_DTO)
        expect(group.participants).toEqual([{ userId: OWNER_ID.toString(), role: ROLE.OWNER }])
    })

    it("should_reject_101st_group", async () => {
        const { service, repository } = createService({
            reserveGroupSlot: vi.fn().mockResolvedValue("limit"),
        })

        const error = await service.createGroup({ ownerId: OWNER_ID, name: "Another group" }).catch((caught: unknown) => caught)

        expect(error).toBeInstanceOf(ConflictException)
        expect(error).toMatchObject({ code: ERROR_CODES.GROUP_LIMIT })
        expect(repository.createGroup).not.toHaveBeenCalled()
    })

    it("should_reject_name_over_80_chars", async () => {
        const { service, repository } = createService()

        await expect(service.createGroup({ ownerId: OWNER_ID, name: "g".repeat(81) }))
            .rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
        expect(repository.reserveGroupSlot).not.toHaveBeenCalled()
    })

    it("should_reject_name_with_only_whitespace", async () => {
        const { service, repository } = createService()

        await expect(service.createGroup({ ownerId: OWNER_ID, name: "   " }))
            .rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
        expect(repository.reserveGroupSlot).not.toHaveBeenCalled()
    })

    it("should_reject_description_over_500_chars", async () => {
        const { service, repository } = createService()

        await expect(service.createGroup({ ownerId: OWNER_ID, name: "Readers", description: "d".repeat(501) }))
            .rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
        expect(repository.reserveGroupSlot).not.toHaveBeenCalled()
    })

    it("should_list_only_my_groups", async () => {
        const { service, repository } = createService()

        await expect(service.listMyGroups(OWNER_ID)).resolves.toEqual([OWNER_GROUP_SUMMARY_DTO])
        expect(repository.findGroupsByParticipant).toHaveBeenCalledWith(OWNER_ID)
    })

    it("should_allow_admin_to_update_group", async () => {
        const adminGroup: GroupRecord = {
            ...OWNER_GROUP_RECORD,
            participants: [
                { userId: OWNER_ID, role: ROLE.OWNER },
                { userId: ADMIN_ID, role: ROLE.ADMIN },
            ],
        }
        const updatedGroup: GroupRecord = { ...adminGroup, name: "New title" }
        const { service, repository } = createService({
            findGroupById: vi.fn().mockResolvedValue(adminGroup),
            updateGroup: vi.fn().mockResolvedValue(updatedGroup),
        })

        const result = await service.updateGroup({
            conversationId: GROUP_ID,
            actorId: ADMIN_ID,
            name: "New title",
        })

        expect(result.name).toBe("New title")
        expect(repository.updateGroup).toHaveBeenCalledWith(
            GROUP_ID,
            { name: "New title" },
            expect.anything(),
        )
    })

    it("should_reject_member_group_update", async () => {
        const memberGroup: GroupRecord = {
            ...OWNER_GROUP_RECORD,
            participants: [
                { userId: OWNER_ID, role: ROLE.OWNER },
                { userId: ADMIN_ID, role: ROLE.MEMBER },
            ],
        }
        const { service, repository } = createService({ findGroupById: vi.fn().mockResolvedValue(memberGroup) })

        await expect(service.updateGroup({
            conversationId: GROUP_ID,
            actorId: ADMIN_ID,
            name: "Unauthorized title",
        })).rejects.toBeInstanceOf(ForbiddenException)
        expect(repository.updateGroup).not.toHaveBeenCalled()
    })
})
