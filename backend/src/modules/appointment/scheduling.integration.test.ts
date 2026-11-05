import express from "express"
import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { API_ROUTES, CONVERSATION_TYPE, REMINDER_ROUTES, ROLE, type CreateAppointmentRequest } from "@linko/contracts"
import Conversation from "../../models/Conversation"
import Message from "../../models/Message"
import { Appointment } from "../../models/Appointment"
import { AppointmentResponse } from "../../models/AppointmentResponse"
import { ReminderJob } from "../../models/ReminderJob"
import { ReminderDelivery } from "../../models/ReminderDelivery"
import { withTransaction } from "../../shared/persistence/withTransaction"
import { createGlobalErrorHandler } from "../../shared/middlewares/globalErrorHandler"
import { createLogger } from "../../shared/logger/logger"
import { MongooseMessageRepository } from "../message/message.repository"
import { UtilityAccessService } from "../utility/utility.access"
import { MongooseUtilityAccessRepository } from "../utility/utility.repository"
import { UtilityTimeline } from "../utility/utility.timeline"
import type { UtilityRuntime } from "../utility/utility.types"
import { MongooseReminderRepository } from "../reminder/reminder.repository"
import { ReminderWorker } from "../reminder/reminder.worker"
import { REMINDER_STATUS } from "../reminder/reminder.constants"
import { SCHEDULING_LIMITS } from "./appointment.constants"
import { MongooseAppointmentRepository } from "./appointment.repository"
import { createSchedulingFeature } from "./scheduling.feature"

const owner = new mongoose.Types.ObjectId()
const member = new mongoose.Types.ObjectId()
const outsider = new mongoose.Types.ObjectId()
const joinedAt = new Date("2026-01-01T00:00:00Z")
const start = new Date("2026-11-05T00:00:00Z")
let now = new Date(start)
let replica: MongoMemoryReplSet
const messages = new MongooseMessageRepository()
const transport = { changed: vi.fn(async () => undefined), reminder: vi.fn(async () => undefined) }
const onError = vi.fn()
const runtime: UtilityRuntime = {
    access: new UtilityAccessService(new MongooseUtilityAccessRepository(messages)),
    timeline: new UtilityTimeline({ repository: messages, now: () => now, publish: async () => undefined, onError }),
    transactionRunner: { run: withTransaction }, clock: { now: () => now }, notifier: transport, onError,
}

beforeAll(async () => {
    replica = await MongoMemoryReplSet.create({ replSet: { count: 1, args: ["--wiredTigerCacheSizeGB=0.25"] } })
    await mongoose.connect(replica.getUri(), { dbName: "scheduling-feature-test" })
    await Promise.all([Conversation.init(), Message.init(), Appointment.init(), AppointmentResponse.init(), ReminderJob.init(), ReminderDelivery.init()])
})
beforeEach(async () => {
    for (const model of [Conversation, Message, Appointment, AppointmentResponse, ReminderJob, ReminderDelivery]) await model.collection.deleteMany({})
    now = new Date(start)
    vi.clearAllMocks()
})
afterAll(async () => { await mongoose.disconnect(); await replica?.stop() })

function app() {
    const feature = createSchedulingFeature(runtime)
    const server = express()
    server.use(express.json())
    server.use((req, _res, next) => { req.user = { _id: new mongoose.Types.ObjectId(req.header("x-test-actor") ?? owner.toString()) } as typeof req.user; next() })
    server.use(API_ROUTES.CONVERSATIONS, feature.conversationRouter)
    server.use(REMINDER_ROUTES.BASE, feature.reminderRouter)
    server.use(createGlobalErrorHandler(createLogger(() => undefined)))
    return { server, feature }
}
async function group() {
    return Conversation.create({ conversationType: CONVERSATION_TYPE.GROUP, group: { name: "Study together", ownerId: owner }, participants: [{ userId: owner, role: ROLE.OWNER, joinedAt, clearedHistoryAt: joinedAt }, { userId: member, role: ROLE.MEMBER, joinedAt, clearedHistoryAt: joinedAt }] })
}
function appointmentInput(overrides: Partial<CreateAppointmentRequest> = {}): CreateAppointmentRequest {
    return { clientMessageId: "appointment-key-1", title: "Cùng đọc sách", startsAt: "2026-11-05T01:00:00Z", timezone: "Asia/Ho_Chi_Minh", ...overrides }
}
function base(id: mongoose.Types.ObjectId): string { return `${API_ROUTES.CONVERSATIONS}/${id}/appointments` }
async function source(conversationId: mongoose.Types.ObjectId) { return Message.create({ conversationId, senderId: owner, clientMessageId: "source-message-key", content: "Meet here", createdAt: now }) }

describe("appointments and durable reminders over real HTTP/MongoDB", () => {
    it("creates one typed card/job across retries and filters nonmember and hidden history", async () => {
        const conversation = await group()
        const { server } = app()
        const created = await request(server).post(base(conversation._id)).send(appointmentInput())
        expect(created.status).toBe(201)
        const retry = await request(server).post(base(conversation._id)).send(appointmentInput())
        expect(retry.body.data.id).toBe(created.body.data.id)
        expect(await Appointment.countDocuments()).toBe(1)
        expect(await Message.countDocuments()).toBe(1)
        expect(await ReminderJob.countDocuments()).toBe(1)
        expect(created.body.data.reminderMinutes).toBe(15)
        expect((await Message.findOne())?.kind).toBe("appointment")
        const forbidden = await request(server).get(`${base(conversation._id)}/${created.body.data.id}`).set("x-test-actor", outsider.toString())
        expect(forbidden.status).toBe(404)
        await Message.updateOne({ _id: created.body.data.messageId }, { $set: { hiddenBy: [member] } })
        expect((await request(server).get(base(conversation._id)).set("x-test-actor", member.toString())).body.data).toEqual([])
    })

    it("persists personal RSVP, rejects manager impersonation, and cancels/rebuilds pending revisions", async () => {
        const conversation = await group()
        const { server, feature } = app()
        const created = (await request(server).post(base(conversation._id)).send(appointmentInput())).body.data
        const path = `${base(conversation._id)}/${created.id}`
        const rsvp = await request(server).put(`${path}/rsvp`).set("x-test-actor", member.toString()).send({ status: "going", reminderMinutes: 5 })
        expect(rsvp.status).toBe(200)
        expect(rsvp.body.data.myResponse).toBe("going")
        const forbidden = await request(server).patch(path).set("x-test-actor", member.toString()).send({ ...appointmentInput(), clientMessageId: undefined, revision: rsvp.body.data.revision })
        expect(forbidden.status).toBe(403)
        const changed = await request(server).patch(path).send({ title: "New time", startsAt: "2026-11-05T02:00:00Z", timezone: "Asia/Ho_Chi_Minh", revision: rsvp.body.data.revision })
        expect(changed.status).toBe(200)
        const stale = await request(server).patch(path).send({ title: "Old edit", startsAt: "2026-11-05T02:00:00Z", timezone: "Asia/Ho_Chi_Minh", revision: rsvp.body.data.revision })
        expect(stale.status).toBe(409)
        now = new Date("2026-11-05T00:56:00Z")
        await feature.tick()
        expect(await ReminderDelivery.countDocuments()).toBe(0)
        await request(server).post(`${path}/cancel`)
        now = new Date("2026-11-05T03:00:00Z")
        await feature.tick()
        expect(await ReminderDelivery.countDocuments()).toBe(0)
        expect(transport.reminder).not.toHaveBeenCalled()
    })

    it("delivers once after worker restart/concurrent polling and keeps private inbox/read ownership", async () => {
        const conversation = await group()
        const message = await source(conversation._id)
        const { server } = app()
        const body = { clientMessageId: "private-reminder-key", dueAt: "2026-11-05T00:01:00Z", note: "Bring a book" }
        const path = `${API_ROUTES.CONVERSATIONS}/${conversation._id}/messages/${message._id}/reminders`
        const created = await request(server).post(path).send(body)
        expect(created.status).toBe(201)
        expect((await request(server).post(path).send(body)).body.data.id).toBe(created.body.data.id)
        expect((await request(server).get(REMINDER_ROUTES.BASE).set("x-test-actor", member.toString())).body.data).toEqual([])
        now = new Date("2026-11-05T00:02:00Z")
        const restarted = createSchedulingFeature(runtime)
        const competing = createSchedulingFeature(runtime)
        await Promise.all([restarted.tick(), competing.tick()])
        expect(await ReminderDelivery.countDocuments()).toBe(1)
        expect(transport.reminder).toHaveBeenCalledOnce()
        const inbox = await request(server).get(REMINDER_ROUTES.BASE)
        expect(inbox.body.data[0]).toMatchObject({ status: "delivered", note: "Bring a book", readAt: null })
        expect(JSON.stringify(inbox.body)).not.toContain("leaseToken")
        const forbidden = await request(server).patch(`${REMINDER_ROUTES.BASE}/${created.body.data.id}/read`).set("x-test-actor", member.toString())
        expect(forbidden.status).toBe(404)
        expect((await request(server).patch(`${REMINDER_ROUTES.BASE}/${created.body.data.id}/read`)).body.data.readAt).toBe(now.toISOString())
        await request(server).delete(`${REMINDER_ROUTES.BASE}/${created.body.data.id}`)
        expect((await request(server).get(REMINDER_ROUTES.BASE)).body.data).toEqual([])
    })

    it("recovers an expired lease, retries infrastructure failure, and suppresses old popup catch-up", async () => {
        const conversation = await group()
        const message = await source(conversation._id)
        const { server, feature } = app()
        await request(server).post(`${API_ROUTES.CONVERSATIONS}/${conversation._id}/messages/${message._id}/reminders`).send({ clientMessageId: "lease-reminder-key", dueAt: "2026-11-05T00:01:00Z" })
        now = new Date("2026-11-05T00:02:00Z")
        const repository = new MongooseReminderRepository()
        const abandoned = await repository.claim(now, "abandoned-worker")
        expect(abandoned).not.toBeNull()
        await feature.tick()
        expect(await ReminderDelivery.countDocuments()).toBe(0)
        now = new Date(now.getTime() + SCHEDULING_LIMITS.LEASE_MS + 1)
        const failingRepository = new MongooseReminderRepository()
        vi.spyOn(failingRepository, "complete").mockRejectedValueOnce(new Error("Temporary infrastructure failure"))
        const failing = new ReminderWorker({ reminders: failingRepository, appointments: new MongooseAppointmentRepository(), runtime })
        await failing.tick()
        expect(onError).toHaveBeenCalledOnce()
        expect((await ReminderJob.findById(abandoned?._id))?.status).toBe(REMINDER_STATUS.PENDING)
        now = new Date("2026-11-07T00:00:00Z")
        await feature.tick()
        expect(await ReminderDelivery.countDocuments()).toBe(1)
        expect(transport.reminder).not.toHaveBeenCalled()
    })

    it("cancels due work for departed or closed groups and rejects malformed temporal input", async () => {
        const conversation = await group()
        const { server, feature } = app()
        expect((await request(server).post(base(conversation._id)).send(appointmentInput({ timezone: "Not/Zone" }))).status).toBe(400)
        expect((await request(server).post(base(conversation._id)).send(appointmentInput({ startsAt: "2026-11-05T01:00:00" }))).status).toBe(400)
        const created = (await request(server).post(base(conversation._id)).send(appointmentInput())).body.data
        await request(server).put(`${base(conversation._id)}/${created.id}/rsvp`).set("x-test-actor", member.toString()).send({ status: "maybe", reminderMinutes: 5 })
        await Conversation.updateOne({ _id: conversation._id }, { $set: { "participants.1.leftAt": now, status: "CLOSED" } })
        now = new Date("2026-11-05T02:00:00Z")
        await feature.tick()
        expect(await ReminderDelivery.countDocuments()).toBe(0)
        expect((await request(server).post(`${base(conversation._id)}/${created.id}/cancel`)).status).toBe(200)
    })

    it("invalidates a claimed lease when editing a private reminder and never reveals hidden source work", async () => {
        const conversation = await group()
        const message = await source(conversation._id)
        const { server, feature } = app()
        const created = (await request(server).post(`${API_ROUTES.CONVERSATIONS}/${conversation._id}/messages/${message._id}/reminders`).send({ clientMessageId: "edit-private-intent", dueAt: "2026-11-05T00:01:00Z" })).body.data
        now = new Date("2026-11-05T00:02:00Z")
        const abandoned = await new MongooseReminderRepository().claim(now, "old-edit-lease")
        expect(abandoned?.leaseToken).toBe("old-edit-lease")
        const edited = await request(server).patch(`${REMINDER_ROUTES.BASE}/${created.id}`).send({ dueAt: "2026-11-05T00:10:00Z", note: "Changed" })
        expect(edited.status).toBe(200)
        await feature.tick()
        expect(await ReminderDelivery.countDocuments()).toBe(0)
        await Message.updateOne({ _id: message._id }, { $set: { hiddenBy: [owner] } })
        now = new Date("2026-11-05T00:11:00Z")
        await feature.tick()
        expect(await ReminderDelivery.countDocuments()).toBe(0)
        expect((await request(server).get(REMINDER_ROUTES.BASE)).body.data).toEqual([])
        expect((await ReminderJob.findById(created.id))?.status).toBe(REMINDER_STATUS.CANCELLED)
    })

    it("keeps simultaneous create requests idempotent and retires exhausted abandoned leases", async () => {
        const conversation = await group()
        const { server } = app()
        const attempts = await Promise.all([request(server).post(base(conversation._id)).send(appointmentInput()), request(server).post(base(conversation._id)).send(appointmentInput())])
        expect(attempts.map((attempt) => attempt.status)).toEqual([201, 201])
        expect(attempts[0].body.data.id).toBe(attempts[1].body.data.id)
        expect(await Appointment.countDocuments()).toBe(1)
        expect(await Message.countDocuments()).toBe(1)
        const reminder = await ReminderJob.findOne()
        await ReminderJob.updateOne({ _id: reminder?._id }, { $set: { status: REMINDER_STATUS.CLAIMED, attempts: SCHEDULING_LIMITS.MAX_ATTEMPTS, leaseUntil: start, leaseToken: "exhausted-worker" } })
        now = new Date("2026-11-05T02:00:00Z")
        expect(await new MongooseReminderRepository().claim(now, "next-worker")).toBeNull()
        expect((await ReminderJob.findById(reminder?._id))?.status).toBe(REMINDER_STATUS.FAILED)
    })
})
