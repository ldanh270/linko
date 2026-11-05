import { CHAT_MESSAGE_KIND, CONVERSATION_TYPE, ERROR_CODES, ROLE } from "@linko/contracts"
import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import Conversation from "../../models/Conversation"
import Message from "../../models/Message"
import { withTransaction } from "../../shared/persistence/withTransaction"
import { MongooseMessageRepository } from "../message/message.repository"
import { UtilityAccessService } from "./utility.access"
import { UtilityContextService } from "./utility.context"
import { MongooseUtilityAccessRepository } from "./utility.repository"
import { UtilityTimeline } from "./utility.timeline"

let replica: MongoMemoryReplSet
const actorId = new mongoose.Types.ObjectId()
const joinedAt = new Date("2026-01-01T00:00:00Z")
const repository = new MongooseMessageRepository()
const access = new UtilityAccessService(new MongooseUtilityAccessRepository(repository))
const context = new UtilityContextService(access, repository)
beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1, args: ["--wiredTigerCacheSizeGB=0.25"] } })
  await mongoose.connect(replica.getUri(), { dbName: "utility-context-integration" })
  await Promise.all([Conversation.init(), Message.init()])
})
beforeEach(async () => { await Message.collection.deleteMany({}); await Conversation.collection.deleteMany({}) })
afterAll(async () => { await mongoose.disconnect(); await replica?.stop() })

async function conversation() {
  return Conversation.create({ conversationType: CONVERSATION_TYPE.GROUP, group: { name: "Utility test", ownerId: actorId }, participants: [{ userId: actorId, role: ROLE.OWNER, joinedAt, clearedHistoryAt: joinedAt }] })
}
async function message(conversationId: mongoose.Types.ObjectId, offset: number, hiddenBy: readonly mongoose.Types.ObjectId[] = []) {
  return Message.create({ conversationId, senderId: actorId, clientMessageId: `context-${offset}`, content: `Message ${offset}`, hiddenBy: [...hiddenBy], createdAt: new Date(joinedAt.getTime() + offset * 1000) })
}

describe("real utility history and typed timeline", () => {
  it("loads old target context, orders tied IDs, and excludes hidden/prejoin messages", async () => {
    const group = await conversation()
    await message(group._id, -1)
    const target = await message(group._id, 1)
    await message(group._id, 2, [actorId])
    for (let offset = 3; offset < 55; offset++) await message(group._id, offset)
    const result = await context.get({ conversationId: group._id, actorId, messageId: target._id })
    expect(result[0]?.id).toBe(target._id.toString())
    expect(result).toHaveLength(16)
    expect(result.some((item) => item.content === "Message 2")).toBe(false)
    expect(result.some((item) => item.content === "Message -1")).toBe(false)
  })
  it("rejects hidden, wrong-conversation and departed-member context", async () => {
    const group = await conversation()
    const hidden = await message(group._id, 1, [actorId])
    await expect(context.get({ conversationId: group._id, actorId, messageId: hidden._id })).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND })
    const other = await conversation()
    const target = await message(other._id, 2)
    await expect(context.get({ conversationId: group._id, actorId, messageId: target._id })).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND })
    await Conversation.updateOne({ _id: other._id }, { $set: { "participants.0.leftAt": new Date() } })
    await expect(context.get({ conversationId: other._id, actorId, messageId: target._id })).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND })
  })
  it("persists resource references atomically and survives a post-commit transport failure", async () => {
    const group = await conversation()
    const onError = vi.fn()
    const timeline = new UtilityTimeline({ repository, now: () => new Date(), publish: async () => { throw new Error("Transport unavailable") }, onError })
    const input = { conversationId: group._id, actorId, clientMessageId: "utility-integration-key", kind: CHAT_MESSAGE_KIND.POLL, resourceId: new mongoose.Types.ObjectId(), content: "Bình chọn: chọn ngày" }
    const result = await withTransaction(async (transaction) => {
      await access.require({ actorId, conversationId: group._id, write: true }, transaction)
      return timeline.create(input, transaction)
    })
    expect(result.kind).toBe(CHAT_MESSAGE_KIND.POLL)
    expect(result.resourceId).toBe(input.resourceId.toString())
    expect(await timeline.find(input)).toMatchObject({ id: result.id, kind: CHAT_MESSAGE_KIND.POLL })
    expect((await Conversation.findById(group._id))?.lastMessage?.messageId?.toString()).toBe(result.id)
    await expect(timeline.publish(result)).resolves.toBeUndefined()
    expect(onError).toHaveBeenCalledOnce()
  })
  it("rolls a utility timeline message back with its surrounding transaction", async () => {
    const group = await conversation()
    const timeline = new UtilityTimeline({ repository, now: () => new Date(), publish: async () => undefined, onError: vi.fn() })
    const input = { conversationId: group._id, actorId, clientMessageId: "rolled-back-utility", kind: CHAT_MESSAGE_KIND.LOCATION, resourceId: new mongoose.Types.ObjectId(), content: "Vị trí trực tiếp" }
    await expect(withTransaction(async (transaction) => { await timeline.create(input, transaction); throw new Error("Rollback") })).rejects.toThrow("Rollback")
    expect(await timeline.find(input)).toBeNull()
  })
  it("returns a business conflict when another message kind already owns the client key", async () => {
    const group = await conversation()
    const timeline = new UtilityTimeline({ repository, now: () => new Date(), publish: async () => undefined, onError: vi.fn() })
    const input = { conversationId: group._id, actorId, clientMessageId: "cross-kind-key", kind: CHAT_MESSAGE_KIND.POLL, resourceId: new mongoose.Types.ObjectId(), content: "Bình chọn" }
    await withTransaction((transaction) => timeline.create(input, transaction))
    await expect(withTransaction((transaction) => timeline.create({ ...input, kind: CHAT_MESSAGE_KIND.APPOINTMENT, resourceId: new mongoose.Types.ObjectId() }, transaction))).rejects.toMatchObject({ code: ERROR_CODES.CONFLICT })
    expect(await Message.countDocuments({ conversationId: group._id })).toBe(1)
  })
})
