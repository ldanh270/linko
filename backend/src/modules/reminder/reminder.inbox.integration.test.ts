import express from "express"
import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { API_ROUTES, CONVERSATION_TYPE, REMINDER_ROUTES, ROLE, type ReminderInboxDto } from "@linko/contracts"
import Conversation from "../../models/Conversation"
import Message from "../../models/Message"
import { ReminderJob } from "../../models/ReminderJob"
import { createSchedulingFeature } from "../appointment/scheduling.feature"
import { withTransaction } from "../../shared/persistence/withTransaction"
import { createGlobalErrorHandler } from "../../shared/middlewares/globalErrorHandler"
import { createLogger } from "../../shared/logger/logger"
import { MongooseMessageRepository } from "../message/message.repository"
import { UtilityAccessService } from "../utility/utility.access"
import { MongooseUtilityAccessRepository } from "../utility/utility.repository"
import { UtilityTimeline } from "../utility/utility.timeline"
import type { UtilityRuntime } from "../utility/utility.types"
import { REMINDER_STATUS } from "./reminder.constants"

const owner = new mongoose.Types.ObjectId()
const stranger = new mongoose.Types.ObjectId()
const now = new Date("2026-11-05T10:00:00Z")
const joinedAt = new Date("2026-01-01")
const messages = new MongooseMessageRepository()
const runtime: UtilityRuntime = {
  access: new UtilityAccessService(new MongooseUtilityAccessRepository(messages)),
  timeline: new UtilityTimeline({ repository: messages, now: () => now, publish: async () => undefined, onError: () => undefined }),
  transactionRunner: { run: withTransaction }, clock: { now: () => now }, notifier: { changed: async () => undefined, reminder: async () => undefined }, onError: () => undefined,
}
let mongo: MongoMemoryReplSet
beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1, args: ["--wiredTigerCacheSizeGB=0.25"] } })
  await mongoose.connect(mongo.getUri(), { dbName: "reminder-inbox-pagination" })
  await Promise.all([Conversation.init(), Message.init(), ReminderJob.init()])
})
beforeEach(async () => { for (const model of [Conversation, Message, ReminderJob]) await model.collection.deleteMany({}) })
afterAll(async () => { await mongoose.disconnect(); await mongo?.stop() })
function app() {
  const server = express()
  server.use(express.json())
  server.use((req, _res, next) => { req.user = { _id: new mongoose.Types.ObjectId(req.header("x-test-actor") ?? owner.toString()) } as typeof req.user; next() })
  server.use(REMINDER_ROUTES.BASE, createSchedulingFeature(runtime).reminderRouter)
  server.use(createGlobalErrorHandler(createLogger(() => undefined)))
  return server
}
async function fixture() {
  const conversation = await Conversation.create({ conversationType: CONVERSATION_TYPE.GROUP, group: { name: "Inbox pagination", ownerId: owner }, participants: [{ userId: owner, role: ROLE.OWNER, joinedAt, clearedHistoryAt: joinedAt }] })
  const message = await Message.create({ conversationId: conversation._id, senderId: owner, clientMessageId: "inbox-source", content: "Source", createdAt: now })
  return { conversation, message }
}
async function job(input: { conversationId: mongoose.Types.ObjectId; messageId: mongoose.Types.ObjectId; index: number; delivered?: boolean; ownerId?: mongoose.Types.ObjectId }) {
  return ReminderJob.create({ ownerId: input.ownerId ?? owner, conversationId: input.conversationId, messageId: input.messageId, clientMessageId: `inbox-${input.index}`, title: `Reminder ${input.index}`, note: "Private note", dueAt: new Date(now.getTime() + input.index * 60000), status: input.delivered ? REMINDER_STATUS.DELIVERED : REMINDER_STATUS.PENDING, deliveredAt: input.delivered ? now : null })
}

describe("authorized paginated reminder inbox", () => {
  it("keeps a delivered reminder reachable behind fifty future intents and counts it unread", async () => {
    const { conversation, message } = await fixture()
    const due = await job({ conversationId: conversation._id, messageId: message._id, index: 0, delivered: true })
    for (let index = 1; index <= 51; index++) await job({ conversationId: conversation._id, messageId: message._id, index })
    const server = app()
    const first = await request(server).get(`${REMINDER_ROUTES.BASE}/inbox`)
    expect(first.status).toBe(200)
    const page = first.body.data as ReminderInboxDto
    expect(page.items).toHaveLength(50)
    expect(page.unreadCount).toBe(1)
    expect(page.nextCursor).toBeTruthy()
    const second = await request(server).get(`${REMINDER_ROUTES.BASE}/inbox?cursor=${page.nextCursor}`)
    expect(second.body.data.items.map((item: { id: string }) => item.id)).toContain(due._id.toString())
    expect(second.body.data.nextCursor).toBeNull()
    await request(server).post(`${REMINDER_ROUTES.BASE}${REMINDER_ROUTES.READ_ALL}`).expect(200)
    expect((await request(server).get(`${REMINDER_ROUTES.BASE}/inbox`)).body.data.unreadCount).toBe(0)
    expect((await ReminderJob.findById(due._id))?.readAt).not.toBeNull()
  })
  it("filters hidden, prejoin, cleared and departed sources before counting or paging", async () => {
    const { conversation, message } = await fixture()
    const visible = await job({ conversationId: conversation._id, messageId: message._id, index: 1, delivered: true })
    const hidden = await Message.create({ conversationId: conversation._id, senderId: owner, clientMessageId: "hidden-source", content: "Hidden", createdAt: now, hiddenBy: [owner] })
    await job({ conversationId: conversation._id, messageId: hidden._id, index: 100, delivered: true })
    const prejoin = await Message.create({ conversationId: conversation._id, senderId: owner, clientMessageId: "prejoin-source", content: "Before join", createdAt: new Date("2025-01-01") })
    await job({ conversationId: conversation._id, messageId: prejoin._id, index: 101, delivered: true })
    const server = app()
    const page = (await request(server).get(`${REMINDER_ROUTES.BASE}/inbox`)).body.data as ReminderInboxDto
    expect(page.items.map((item) => item.id)).toEqual([visible._id.toString()])
    expect(page.unreadCount).toBe(1)
    const strangerPage = await request(server).get(`${REMINDER_ROUTES.BASE}/inbox`).set("x-test-actor", stranger.toString())
    expect(strangerPage.body.data).toMatchObject({ items: [], unreadCount: 0 })
    await Conversation.updateOne({ _id: conversation._id }, { $set: { "participants.0.clearedHistoryAt": new Date(now.getTime() + 1) } })
    expect((await request(server).get(`${REMINDER_ROUTES.BASE}/inbox`)).body.data).toMatchObject({ items: [], unreadCount: 0 })
    await Conversation.updateOne({ _id: conversation._id }, { $set: { "participants.0.clearedHistoryAt": joinedAt, "participants.0.leftAt": now } })
    expect((await request(server).get(`${REMINDER_ROUTES.BASE}/inbox`)).body.data).toMatchObject({ items: [], unreadCount: 0 })
  })
  it("rejects malformed and foreign cursors without exposing another owner's source", async () => {
    const { conversation, message } = await fixture()
    const foreign = await job({ conversationId: conversation._id, messageId: message._id, index: 1, ownerId: stranger })
    const server = app()
    expect((await request(server).get(`${REMINDER_ROUTES.BASE}/inbox?cursor=invalid`)).status).toBe(400)
    expect((await request(server).get(`${REMINDER_ROUTES.BASE}/inbox?cursor=${foreign._id}`)).status).toBe(404)
  })
  it("paginates tied due times exactly once and marks all authorized pages read", async () => {
    const { conversation, message } = await fixture()
    const delivered = []
    for (let index = 1; index <= 52; index++) delivered.push(await job({ conversationId: conversation._id, messageId: message._id, index, delivered: true }))
    await ReminderJob.updateMany({}, { $set: { dueAt: now } })
    const hidden = await Message.create({ conversationId: conversation._id, senderId: owner, clientMessageId: "mark-all-hidden", content: "Hidden", createdAt: now, hiddenBy: [owner] })
    const hiddenJob = await job({ conversationId: conversation._id, messageId: hidden._id, index: 100, delivered: true })
    const server = app()
    const first = (await request(server).get(`${REMINDER_ROUTES.BASE}/inbox`)).body.data as ReminderInboxDto
    const second = (await request(server).get(`${REMINDER_ROUTES.BASE}/inbox?cursor=${first.nextCursor}`)).body.data as ReminderInboxDto
    const identifiers = [...first.items, ...second.items].map((item) => item.id)
    expect(new Set(identifiers).size).toBe(52)
    expect(identifiers).toHaveLength(52)
    expect(first.unreadCount).toBe(52)
    await request(server).post(`${REMINDER_ROUTES.BASE}${REMINDER_ROUTES.READ_ALL}`).expect(200)
    expect(await ReminderJob.countDocuments({ _id: { $in: delivered.map((record) => record._id) }, readAt: { $ne: null } })).toBe(52)
    expect((await ReminderJob.findById(hiddenJob._id))?.readAt).toBeNull()
    expect((await request(server).get(`${REMINDER_ROUTES.BASE}/inbox`)).body.data.unreadCount).toBe(0)
  })
})
