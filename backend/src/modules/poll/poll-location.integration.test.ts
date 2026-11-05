import { API_ROUTES, CONVERSATION_STATUS, CONVERSATION_TYPE, ROLE, type LocationShareDto, type PollDto } from "@linko/contracts"
import express from "express"
import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createAuthenticate } from "../../middlewares/route.middleware"
import Conversation from "../../models/Conversation"
import Message from "../../models/Message"
import Poll from "../../models/Poll"
import PollVote from "../../models/PollVote"
import LocationShare from "../../models/LocationShare"
import User from "../../models/User"
import { createGlobalErrorHandler } from "../../shared/middlewares/globalErrorHandler"
import { createLogger } from "../../shared/logger/logger"
import { withTransaction } from "../../shared/persistence/withTransaction"
import { AuthTokenService } from "../auth/auth.security"
import { MongooseMessageRepository } from "../message/message.repository"
import { UtilityAccessService } from "../utility/utility.access"
import { MongooseUtilityAccessRepository } from "../utility/utility.repository"
import { UtilityTimeline } from "../utility/utility.timeline"
import type { UtilityRuntime } from "../utility/utility.types"
import { createLocationFeature } from "../location/location.feature"
import { createPollFeature } from "./poll.feature"

const SECRET = "poll-location-integration-secret-long-enough-for-tests"
const START = new Date("2026-11-05T04:00:00.000Z")
const JOINED = new Date("2020-01-01T00:00:00.000Z")
const FIRST_FIX = { latitude: 10.7, longitude: 106.6, accuracy: 15, publisherId: "test-publishing-tab" }
let replica: MongoMemoryReplSet
let now = START

beforeAll(async () => {
    replica = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger", args: ["--wiredTigerCacheSizeGB=0.25"] } })
    await mongoose.connect(replica.getUri(), { dbName: "poll-location-isolated-tests" })
    await Promise.all([Conversation.init(), Message.init(), Poll.init(), PollVote.init(), LocationShare.init(), User.init()])
})
beforeEach(async () => {
    now = new Date(START)
    await Promise.all([Conversation, Message, Poll, PollVote, LocationShare, User].map((model) => model.collection.deleteMany({})))
})
afterAll(async () => { await mongoose.disconnect(); await replica?.stop() })

async function fixture() {
    const users = await Promise.all(["owner", "member", "other"].map((suffix) => User.create({
        username: `utility_${suffix}`, email: `utility_${suffix}@example.test`, displayName: suffix, hashedPassword: "test-only-hash",
    })))
    const [owner, member, other] = users
    if (!owner || !member || !other) throw new Error("Missing fixture users")
    const conversation = await Conversation.create({ conversationType: CONVERSATION_TYPE.GROUP, status: CONVERSATION_STATUS.ACTIVE,
        participants: [{ userId: owner._id, role: ROLE.OWNER, joinedAt: JOINED, clearedHistoryAt: JOINED },
            { userId: member._id, role: ROLE.MEMBER, joinedAt: JOINED, clearedHistoryAt: JOINED }],
        group: { name: "Utility test", ownerId: owner._id },
    })
    const messages = new MongooseMessageRepository()
    const onError = vi.fn()
    const changed = vi.fn(async () => undefined)
    const runtime: UtilityRuntime = { access: new UtilityAccessService(new MongooseUtilityAccessRepository(messages)),
        timeline: new UtilityTimeline({ repository: messages, now: () => now, publish: async () => undefined, onError }),
        transactionRunner: { run: withTransaction }, clock: { now: () => now }, notifier: { changed, reminder: async () => undefined }, onError,
    }
    const locations = createLocationFeature(runtime)
    const app = express()
    app.use(express.json(), createAuthenticate(SECRET))
    app.use(API_ROUTES.CONVERSATIONS, createPollFeature(runtime).router, locations.router)
    app.use(createGlobalErrorHandler(createLogger(() => undefined)))
    const tokens = new AuthTokenService(SECRET)
    const auth = (id: mongoose.Types.ObjectId) => `Bearer ${tokens.createAccessToken(id.toString())}`
    const base = `${API_ROUTES.CONVERSATIONS}/${conversation._id}`
    return { app, owner, member, other, conversation, auth, base, changed, cleanup: locations.cleanup }
}

type Fixture = Awaited<ReturnType<typeof fixture>>
async function makePoll(f: Fixture, extra: Record<string, unknown> = {}) {
    return request(f.app).post(`${f.base}/polls`).set("Authorization", f.auth(f.owner._id)).send({
        clientMessageId: "poll-create-command", question: "Where should we meet?", options: ["Park", "Cafe"], mode: "single", ...extra,
    })
}
async function makeLocation(f: Fixture, extra: Record<string, unknown> = {}) {
    return request(f.app).post(`${f.base}/locations`).set("Authorization", f.auth(f.owner._id)).send({
        ...FIRST_FIX, clientMessageId: "location-create-command", durationMinutes: 15, ...extra,
    })
}

describe("poll HTTP/database acceptance", () => {
    it("hydrates a poll list with one batched vote query", async () => {
        const f = await fixture()
        for (let index = 0; index < 3; index++) await makePoll(f, { clientMessageId: `poll-list-${index}` })
        const votes = vi.spyOn(PollVote, "find")
        const listed = await request(f.app).get(`${f.base}/polls`).set("Authorization", f.auth(f.member._id))
        expect(listed.status).toBe(200)
        expect(listed.body.data).toHaveLength(3)
        expect(votes).toHaveBeenCalledTimes(1)
        votes.mockRestore()
    })
    it("returns one existing resource for simultaneous identical creation commands", async () => {
        const f = await fixture()
        const responses = await Promise.all([makePoll(f), makePoll(f)])
        expect(responses.map((response) => response.status)).toEqual([201, 201])
        expect(responses[0]?.body.data.id).toBe(responses[1]?.body.data.id)
        expect(await Poll.countDocuments()).toBe(1)
        expect(await Message.countDocuments()).toBe(1)
    })
    it("creates exactly one typed card across retries and rejects invalid options", async () => {
        const f = await fixture()
        const first = await makePoll(f)
        expect(first.status, JSON.stringify(first.body)).toBe(201)
        const repeated = await makePoll(f)
        expect(repeated.body.data.id).toBe(first.body.data.id)
        expect(await Poll.countDocuments()).toBe(1)
        expect(await Message.countDocuments()).toBe(1)
        expect((await Message.findById(first.body.data.messageId))?.kind).toBe("poll")
        expect((await makePoll(f, { options: ["Park", " park "] })).status).toBe(400)
    })
    it("requires authentication and denies outsiders, hidden sources and late joiners", async () => {
        const f = await fixture()
        expect((await request(f.app).get(`${f.base}/polls`)).status).toBe(401)
        const poll = (await makePoll(f)).body.data as PollDto
        expect((await request(f.app).get(`${f.base}/polls/${poll.id}`).set("Authorization", f.auth(f.other._id))).status).toBe(404)
        await Message.updateOne({ _id: poll.messageId }, { $push: { hiddenBy: f.member._id } })
        expect((await request(f.app).get(`${f.base}/polls/${poll.id}`).set("Authorization", f.auth(f.member._id))).status).toBe(404)
        expect((await request(f.app).get(`${f.base}/polls`).set("Authorization", f.auth(f.member._id))).body.data).toEqual([])
        await Conversation.updateOne({ _id: f.conversation._id, "participants.userId": f.member._id }, { $set: { "participants.$.joinedAt": new Date("2030-01-01") } })
        expect((await request(f.app).get(`${f.base}/polls/${poll.id}`).set("Authorization", f.auth(f.member._id))).status).toBe(404)
    })
    it("replaces simultaneous votes without duplicates and supports explicit withdrawal", async () => {
        const f = await fixture()
        const poll = (await makePoll(f)).body.data as PollDto
        const first = poll.options[0]?.id
        const second = poll.options[1]?.id
        const responses = await Promise.all([first, second].map((id) => request(f.app).put(`${f.base}/polls/${poll.id}/vote`)
            .set("Authorization", f.auth(f.member._id)).send({ optionIds: [id] })))
        expect(responses.map((response) => response.status)).toEqual([200, 200])
        const current = await request(f.app).get(`${f.base}/polls/${poll.id}`).set("Authorization", f.auth(f.member._id))
        expect(current.body.data.voterCount).toBe(1)
        expect(current.body.data.options.reduce((sum: number, option: { count: number }) => sum + option.count, 0)).toBe(1)
        expect(await PollVote.countDocuments()).toBe(1)
        const withdrawn = await request(f.app).delete(`${f.base}/polls/${poll.id}/vote`).set("Authorization", f.auth(f.member._id))
        expect(withdrawn.status).toBe(200)
        expect(withdrawn.body.data.voterCount).toBe(0)
    })
    it("validates single choice, counts multiple choice by people, and rejects deadline votes", async () => {
        const f = await fixture()
        const single = (await makePoll(f)).body.data as PollDto
        const ids = single.options.map((option) => option.id)
        const invalid = await request(f.app).put(`${f.base}/polls/${single.id}/vote`).set("Authorization", f.auth(f.member._id)).send({ optionIds: ids })
        expect(invalid.status).toBe(400)
        const poll = (await makePoll(f, { clientMessageId: "multiple-poll", mode: "multiple", closesAt: new Date(START.getTime() + 10000).toISOString() })).body.data as PollDto
        const vote = await request(f.app).put(`${f.base}/polls/${poll.id}/vote`).set("Authorization", f.auth(f.member._id)).send({ optionIds: poll.options.map((option) => option.id) })
        expect(vote.body.data.voterCount).toBe(1)
        expect(vote.body.data.options.map((option: { count: number }) => option.count)).toEqual([1, 1])
        now = new Date(START.getTime() + 10000)
        expect((await request(f.app).put(`${f.base}/polls/${poll.id}/vote`).set("Authorization", f.auth(f.member._id)).send({ optionIds: [poll.options[0]?.id] })).status).toBe(409)
        expect((await request(f.app).get(`${f.base}/polls/${poll.id}`).set("Authorization", f.auth(f.member._id))).body.data.status).toBe("closed")
    })
    it("excludes departed and rejoined votes and enforces close permissions", async () => {
        const f = await fixture()
        const poll = (await makePoll(f)).body.data as PollDto
        const optionIds = [poll.options[0]?.id]
        await request(f.app).put(`${f.base}/polls/${poll.id}/vote`).set("Authorization", f.auth(f.member._id)).send({ optionIds })
        expect((await request(f.app).post(`${f.base}/polls/${poll.id}/close`).set("Authorization", f.auth(f.member._id))).status).toBe(403)
        await Conversation.updateOne({ _id: f.conversation._id, "participants.userId": f.member._id }, { $set: { "participants.$.leftAt": new Date(START) } })
        const afterLeave = await request(f.app).get(`${f.base}/polls/${poll.id}`).set("Authorization", f.auth(f.owner._id))
        expect(afterLeave.body.data.voterCount).toBe(0)
        await Conversation.updateOne({ _id: f.conversation._id, "participants.userId": f.member._id }, { $set: { "participants.$.leftAt": null, "participants.$.joinedAt": new Date(START.getTime() + 1) } })
        expect((await request(f.app).get(`${f.base}/polls/${poll.id}`).set("Authorization", f.auth(f.owner._id))).body.data.voterCount).toBe(0)
        expect((await request(f.app).post(`${f.base}/polls/${poll.id}/close`).set("Authorization", f.auth(f.owner._id))).body.data.status).toBe("closed")
    })
})

describe("foreground location HTTP/database acceptance", () => {
    it("returns one existing share for simultaneous identical creation commands", async () => {
        const f = await fixture()
        const responses = await Promise.all([makeLocation(f), makeLocation(f)])
        expect(responses.map((response) => response.status)).toEqual([201, 201])
        expect(responses[0]?.body.data.id).toBe(responses[1]?.body.data.id)
        expect(await LocationShare.countDocuments()).toBe(1)
        expect(await Message.countDocuments()).toBe(1)
    })
    it("ends sharing when the creator hides its source message", async () => {
        const f = await fixture()
        const share = (await makeLocation(f)).body.data as LocationShareDto
        await Message.updateOne({ _id: share.messageId }, { $push: { hiddenBy: f.owner._id } })
        const viewed = await request(f.app).get(`${f.base}/locations/${share.id}`).set("Authorization", f.auth(f.member._id))
        expect(viewed.body.data.status).toBe("ended")
        expect(viewed.body.data.position).toBeNull()
        await f.cleanup()
        expect((await LocationShare.findById(share.id).lean())).not.toHaveProperty("latitude")
    })
    it("creates one share/card across retries and requires stopping before a new share", async () => {
        const f = await fixture()
        const first = await makeLocation(f)
        expect(first.status, JSON.stringify(first.body)).toBe(201)
        expect((await makeLocation(f)).body.data.id).toBe(first.body.data.id)
        expect((await makeLocation(f, { clientMessageId: "second-session" })).status).toBe(409)
        expect(await LocationShare.countDocuments()).toBe(1)
        expect(await Message.countDocuments()).toBe(1)
        expect(first.body.data.position.latitude).toBe(FIRST_FIX.latitude)
        expect(first.body.data).not.toHaveProperty("publisherId")
    })
    it("accepts only throttled monotonic owner fixes and never broadcasts coordinates", async () => {
        const f = await fixture()
        const share = (await makeLocation(f)).body.data as LocationShareDto
        const path = `${f.base}/locations/${share.id}/fix`
        const fix = { ...FIRST_FIX, sequence: 1, latitude: 11 }
        expect((await request(f.app).put(path).set("Authorization", f.auth(f.owner._id)).send(fix)).status).toBe(409)
        now = new Date(START.getTime() + 6000)
        expect((await request(f.app).put(path).set("Authorization", f.auth(f.member._id)).send(fix)).status).toBe(403)
        expect((await request(f.app).put(path).set("Authorization", f.auth(f.owner._id)).send({ ...fix, publisherId: "different-tab" })).status).toBe(409)
        const accepted = await request(f.app).put(path).set("Authorization", f.auth(f.owner._id)).send(fix)
        expect(accepted.status, JSON.stringify(accepted.body)).toBe(200)
        expect(accepted.body.data.position.latitude).toBe(11)
        now = new Date(START.getTime() + 12000)
        expect((await request(f.app).put(path).set("Authorization", f.auth(f.owner._id)).send(fix)).status).toBe(409)
        expect(JSON.stringify(f.changed.mock.calls)).not.toContain("latitude")
        expect(JSON.stringify(f.changed.mock.calls)).not.toContain("longitude")
    })
    it("shows stale fixes honestly and stop strips all precise stored coordinates", async () => {
        const f = await fixture()
        const share = (await makeLocation(f)).body.data as LocationShareDto
        now = new Date(START.getTime() + 31000)
        expect((await request(f.app).get(`${f.base}/locations/${share.id}`).set("Authorization", f.auth(f.member._id))).body.data.isStale).toBe(true)
        expect((await request(f.app).post(`${f.base}/locations/${share.id}/stop`).set("Authorization", f.auth(f.member._id))).status).toBe(403)
        const stopped = await request(f.app).post(`${f.base}/locations/${share.id}/stop`).set("Authorization", f.auth(f.owner._id))
        expect(stopped.body.data.status).toBe("ended")
        expect(stopped.body.data.position).toBeNull()
        expect((await request(f.app).post(`${f.base}/locations/${share.id}/stop`).set("Authorization", f.auth(f.owner._id))).status).toBe(200)
        const stored = await LocationShare.findById(share.id).lean()
        expect(stored).not.toHaveProperty("latitude")
        expect(stored).not.toHaveProperty("longitude")
        expect(stored).not.toHaveProperty("lastFixAt")
    })
    it("expiry is authoritative before cleanup and a new explicit share can start", async () => {
        const f = await fixture()
        const share = (await makeLocation(f)).body.data as LocationShareDto
        now = new Date(START.getTime() + 15 * 60000)
        const expired = await request(f.app).get(`${f.base}/locations/${share.id}`).set("Authorization", f.auth(f.member._id))
        expect(expired.body.data.status).toBe("ended")
        expect(expired.body.data.position).toBeNull()
        expect((await request(f.app).put(`${f.base}/locations/${share.id}/fix`).set("Authorization", f.auth(f.owner._id)).send({ ...FIRST_FIX, sequence: 2 })).status).toBe(409)
        await f.cleanup()
        expect((await LocationShare.findById(share.id).lean())).not.toHaveProperty("latitude")
        expect((await makeLocation(f, { clientMessageId: "fresh-session" })).status).toBe(201)
    })
    it("denies hidden/late-join viewers and ends departed creator shares", async () => {
        const f = await fixture()
        const share = (await makeLocation(f)).body.data as LocationShareDto
        await Message.updateOne({ _id: share.messageId }, { $push: { hiddenBy: f.member._id } })
        expect((await request(f.app).get(`${f.base}/locations/${share.id}`).set("Authorization", f.auth(f.member._id))).status).toBe(404)
        expect((await request(f.app).get(`${f.base}/locations`).set("Authorization", f.auth(f.member._id))).body.data).toEqual([])
        await Message.updateOne({ _id: share.messageId }, { $pull: { hiddenBy: f.member._id } })
        await Conversation.updateOne({ _id: f.conversation._id, "participants.userId": f.owner._id }, { $set: { "participants.$.leftAt": new Date(START) } })
        const read = await request(f.app).get(`${f.base}/locations/${share.id}`).set("Authorization", f.auth(f.member._id))
        expect(read.body.data.status).toBe("ended")
        expect(read.body.data.position).toBeNull()
        await f.cleanup()
        expect((await LocationShare.findById(share.id).lean())).not.toHaveProperty("latitude")
    })
})
