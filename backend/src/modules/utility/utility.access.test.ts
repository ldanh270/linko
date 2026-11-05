import { CONVERSATION_STATUS, CONVERSATION_TYPE, ERROR_CODES, ROLE } from "@linko/contracts"
import { Types } from "mongoose"
import { describe, expect, it, vi } from "vitest"
import { UtilityAccessService } from "./utility.access"
import type { UtilityMembership } from "./utility.types"

const actorId = new Types.ObjectId()
const conversationId = new Types.ObjectId()
const messageId = new Types.ObjectId()
const membership: UtilityMembership = { role: ROLE.MEMBER, joinedAt: new Date("2026-01-01"), type: CONVERSATION_TYPE.GROUP, status: CONVERSATION_STATUS.ACTIVE, memberIds: [actorId] }

function setup(member: UtilityMembership | null = membership) {
  const repository = { membership: vi.fn().mockResolvedValue(member), visibleMessage: vi.fn().mockResolvedValue(true), areFriends: vi.fn().mockResolvedValue(true), fence: vi.fn().mockResolvedValue(undefined) }
  return { repository, service: new UtilityAccessService(repository) }
}

describe("utility access boundary", () => {
  it("rejects an absent or departed membership before reading source content", async () => {
    const { service, repository } = setup(null)
    await expect(service.require({ actorId, conversationId, messageId })).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND })
    expect(repository.visibleMessage).not.toHaveBeenCalled()
  })
  it("rejects pre-join or viewer-hidden source messages", async () => {
    const { service, repository } = setup()
    repository.visibleMessage.mockResolvedValue(false)
    await expect(service.require({ actorId, conversationId, messageId })).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND })
  })
  it("allows closed history reads while rejecting new activity", async () => {
    const { service } = setup({ ...membership, status: CONVERSATION_STATUS.CLOSED })
    await expect(service.require({ actorId, conversationId })).resolves.toMatchObject({ status: CONVERSATION_STATUS.CLOSED })
    await expect(service.require({ actorId, conversationId, write: true })).rejects.toMatchObject({ code: ERROR_CODES.GROUP_CLOSED })
  })
  it("requires friendship for new direct activity", async () => {
    const { service, repository } = setup({ ...membership, type: CONVERSATION_TYPE.DIRECT, memberIds: [actorId, new Types.ObjectId()] })
    repository.areFriends.mockResolvedValue(false)
    await expect(service.require({ actorId, conversationId, write: true })).rejects.toMatchObject({ code: ERROR_CODES.FRIENDSHIP_REQUIRED })
  })
  it("returns the repository history boundary for an authorized member", async () => {
    const { service } = setup()
    await expect(service.require({ actorId, conversationId, messageId })).resolves.toEqual(membership)
  })
})
