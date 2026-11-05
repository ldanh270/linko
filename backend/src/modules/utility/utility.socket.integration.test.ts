import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import express from "express"
import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { CONVERSATION_TYPE, ROLE, SOCKET_EVENTS, UTILITY_EVENTS, type AppointmentDto, type LocationShareDto, type MessageDto, type PollDto } from "@linko/contracts"
import { createApp } from "../../app"
import Conversation from "../../models/Conversation"
import User from "../../models/User"
import Message from "../../models/Message"
import Poll from "../../models/Poll"
import PollVote from "../../models/PollVote"
import LocationShare from "../../models/LocationShare"
import { createLogger } from "../../shared/logger/logger"
import { attachSocket } from "../../socket/socket"
import { RealtimeTestClient } from "../../../test/realtimeClient"
import { AuthTokenService } from "../auth/auth.security"
import { RealtimeGateway } from "../realtime/realtime.gateway"
import { MongooseRealtimeRepository } from "../realtime/realtime.repository"

const secret = "chat-utility-real-socket-test-signing-key"
const tokens = new AuthTokenService(secret)
const gateway = new RealtimeGateway({ repository: new MongooseRealtimeRepository(), tokenVerifier: tokens })
const errors: unknown[] = []
const app = createApp({ publicRoutes: express.Router(), privateRoutes: express.Router(), authConfig: { accessTokenSecret: secret, clientOrigin: "http://localhost", refreshCookie: { path: "/", secure: false, sameSite: "lax" } }, logger: createLogger((entry) => errors.push(entry)), realtimeGateway: gateway })
const server = createServer(app)
const io = attachSocket(server, "http://localhost", gateway)
const clients: RealtimeTestClient[] = []
let mongo: MongoMemoryReplSet
let origin: string
let groupId: string
let ownerId: string
let memberId: string
let outsiderId: string

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1, args: ["--wiredTigerCacheSizeGB=0.25"] } })
  await mongoose.connect(mongo.getUri(), { dbName: "utility-real-http-socket" })
  await Promise.all([Conversation.init(), User.init(), Message.init(), Poll.init(), PollVote.init(), LocationShare.init()])
  const accounts = await User.create(["owner", "member", "outsider"].map((name) => ({ username: `utility_${name}`, email: `${name}@utility.invalid`, displayName: name, hashedPassword: "fixture-only-password-hash" })))
  const identifiers = accounts.map((account) => account._id.toString())
  ownerId = identifiers[0] ?? ""
  memberId = identifiers[1] ?? ""
  outsiderId = identifiers[2] ?? ""
  const history = new Date(Date.now() - 60000)
  const group = await Conversation.create({ conversationType: CONVERSATION_TYPE.GROUP, group: { name: "Real utility integration", ownerId }, participants: [{ userId: ownerId, role: ROLE.OWNER, joinedAt: history, clearedHistoryAt: history }, { userId: memberId, role: ROLE.MEMBER, joinedAt: history, clearedHistoryAt: history }] })
  groupId = group._id.toString()
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
afterAll(async () => {
  await Promise.all(clients.map((client) => client.close()))
  await new Promise<void>((resolve) => io.close(() => resolve()))
  await mongoose.disconnect()
  await mongo?.stop()
})

async function connect(userId: string) {
  const client = await RealtimeTestClient.connect(origin, tokens.createAccessToken(userId))
  clients.push(client)
  return client
}
async function api<T>(actorId: string, path: string, method = "GET", body?: unknown): Promise<{ status: number; data: T }> {
  const response = await fetch(`${origin}${path}`, { method, headers: { Authorization: `Bearer ${tokens.createAccessToken(actorId)}`, "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const envelope = await response.json() as { data: T }
  return { status: response.status, data: envelope.data }
}

describe("chat utility real HTTP and Socket.IO acceptance", () => {
  it("delivers typed cards and revision invalidations without private coordinates", async () => {
    const owner = await connect(ownerId)
    const member = await connect(memberId)
    const outsider = await connect(outsiderId)
    expect(await owner.request(SOCKET_EVENTS.CONVERSATION_JOIN, groupId)).toBe(true)
    expect(await member.request(SOCKET_EVENTS.CONVERSATION_JOIN, groupId)).toBe(true)
    expect(await outsider.request(SOCKET_EVENTS.CONVERSATION_JOIN, groupId)).toBe(false)
    const base = `/api/conversations/${groupId}`
    const poll = await api<PollDto>(ownerId, `${base}/polls`, "POST", { clientMessageId: "real-http-poll-create", question: "Hẹn ngày nào?", options: ["Thứ bảy", "Chủ nhật"], mode: "single" })
    expect(poll.status).toBe(201)
    await member.waitFor(SOCKET_EVENTS.MESSAGE_CREATED, (input) => (input as MessageDto).resourceId === poll.data.id)
    const vote = await api<PollDto>(memberId, `${base}/polls/${poll.data.id}/vote`, "PUT", { optionIds: [poll.data.options[0]?.id] })
    expect(vote.status).toBe(200)
    await owner.waitFor(UTILITY_EVENTS.CHANGED, (input) => (input as { resourceId: string }).resourceId === poll.data.id)
    expect((await api<PollDto>(outsiderId, `${base}/polls/${poll.data.id}`)).status).toBe(404)
    const location = await api<LocationShareDto>(ownerId, `${base}/locations`, "POST", { clientMessageId: "real-http-location-create", durationMinutes: 15, publisherId: "real-origin-publisher", latitude: 10.77, longitude: 106.7, accuracy: 12 })
    expect(location.status).toBe(201)
    expect((await api<LocationShareDto>(memberId, `${base}/locations/${location.data.id}`)).data.position?.latitude).toBe(10.77)
    expect((await api<LocationShareDto>(outsiderId, `${base}/locations/${location.data.id}`)).status).toBe(404)
    const ended = await api<LocationShareDto>(ownerId, `${base}/locations/${location.data.id}/stop`, "POST")
    expect(ended.data.position).toBeNull()
    await member.waitFor(UTILITY_EVENTS.CHANGED, (input) => (input as { resourceId: string }).resourceId === location.data.id)
    for (const entry of member.events.filter((event) => event.event === UTILITY_EVENTS.CHANGED)) {
      expect(JSON.stringify(entry.payload)).not.toContain("latitude")
      expect(JSON.stringify(entry.payload)).not.toContain("longitude")
    }
    expect(outsider.events.some((entry) => entry.event === UTILITY_EVENTS.CHANGED || entry.event === SOCKET_EVENTS.MESSAGE_CREATED)).toBe(false)
    expect((await api<LocationShareDto>(memberId, `${base}/locations/${location.data.id}`)).data.position).toBeNull()
    const context = await api<readonly MessageDto[]>(memberId, `${base}/messages/${poll.data.messageId}/context`)
    expect(context.status).toBe(200)
    expect(context.data.some((message) => message.id === poll.data.messageId && message.kind === "poll")).toBe(true)
    const pin = await api<readonly MessageDto[]>(ownerId, `${base}/pins/${poll.data.messageId}`, "PUT")
    expect(pin.status).toBe(200)
    expect(pin.data[0]?.resourceId).toBe(poll.data.id)
    const appointment = await api<AppointmentDto>(ownerId, `${base}/appointments`, "POST", { clientMessageId: "real-http-appointment-create", title: "Hẹn đọc sách", startsAt: new Date(Date.now() + 3600000).toISOString(), timezone: "Asia/Ho_Chi_Minh" })
    expect(appointment.status).toBe(201)
    expect((await api<AppointmentDto>(memberId, `${base}/appointments/${appointment.data.id}/rsvp`, "PUT", { status: "going", reminderMinutes: 15 })).status).toBe(200)
  })
  it("sends reminder delivery identifiers exclusively to the owner's sessions", async () => {
    const owner = await connect(ownerId)
    const member = await connect(memberId)
    await gateway.publishReminder(ownerId, "private-reminder-identifier")
    await owner.waitFor(UTILITY_EVENTS.REMINDER, (input) => (input as { reminderId: string }).reminderId === "private-reminder-identifier")
    await member.request(SOCKET_EVENTS.CONVERSATION_JOIN, groupId)
    expect(member.events.some((entry) => entry.event === UTILITY_EVENTS.REMINDER)).toBe(false)
  })
})
