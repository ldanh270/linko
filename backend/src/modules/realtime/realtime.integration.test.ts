import { BestEffortPresenceActivityRecorder } from "./presence.activity"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import { randomUUID } from "node:crypto"
import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import Redis from "ioredis"
import mongoose from "mongoose"
import { MongoMemoryServer } from "mongodb-memory-server"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { CONVERSATION_TYPE, ROLE, SOCKET_EVENTS, type MessageDto, type TypingEventDto } from "@linko/contracts"
import User from "../../models/User"
import Conversation from "../../models/Conversation"
import { attachSocket } from "../../socket/socket"
import { RealtimeTestClient } from "../../../test/realtimeClient"
import { AuthTokenService } from "../auth/auth.security"
import { RealtimeGateway } from "./realtime.gateway"
import { MongooseRealtimeRepository } from "./realtime.repository"
import { TypingService } from "./realtime.typing"
import { PresenceService } from "./presence.service"
import { MemoryPresenceStore } from "./presence.memory"
import { BitmapPresenceStore } from "./presence.bitmap"
import { RedisPresenceSessions } from "./presence.sessions"
import { MongoosePresenceRepository } from "./presence.repository"

const url = process.env.REDIS_TEST_URL

describe.skipIf(!url)("authenticated realtime with MongoDB and Redis", () => {
    const prefix = `linko:test:realtime:${randomUUID()}:`
    const redis = new Redis(url ?? "", { lazyConnect: true })
    const repository = new MongooseRealtimeRepository()
    const tokens = new AuthTokenService("realtime-integration-test-signing-secret")
    const errors: unknown[] = []
    const presence = new PresenceService({ primary: new RedisPresenceSessions(redis, new BitmapPresenceStore(redis, prefix)),
        fallback: new MemoryPresenceStore(), activityRecorder: new BestEffortPresenceActivityRecorder(new MongoosePresenceRepository(), (error) => errors.push(error)), onError: (error) => errors.push(error),
        onOffline: (userId) => gateway.publishPresence(userId, false) })
    const gateway = new RealtimeGateway({ repository, tokenVerifier: tokens, typing: new TypingService(repository), presence, onError: (error) => errors.push(error) })
    const http = createServer()
    const io = attachSocket(http, "http://localhost", gateway)
    const clients: RealtimeTestClient[] = []
    let mongo: MongoMemoryServer
    let origin: string
    let senderId: string
    let recipientId: string
    const conversations: string[] = []

    beforeAll(async () => {
        mongo = await MongoMemoryServer.create({ instance: { args: ["--wiredTigerCacheSizeGB", "0.25"] } })
        await mongoose.connect(mongo.getUri())
        const accounts = await User.create(["sender", "recipient"].map((name) => ({ username: name, email: `${name}@test.invalid`, displayName: name, hashedPassword: "test-password-hash" })))
        ;[senderId, recipientId] = accounts.map((account) => account._id.toString())
        for (const type of [CONVERSATION_TYPE.DIRECT, CONVERSATION_TYPE.GROUP]) {
            const conversation = await Conversation.create({ [CONVERSATION_FIELDS.TYPE]: type, participants: accounts.map((user) => ({ userId: user._id, role: ROLE.MEMBER })),
                ...(type === CONVERSATION_TYPE.GROUP ? { group: { name: "Test group", ownerId: accounts[0]._id } } : {}) })
            conversations.push(conversation._id.toString())
        }
        await presence.start()
        await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve))
        origin = `http://127.0.0.1:${(http.address() as AddressInfo).port}`
    })

    afterAll(async () => {
        await Promise.all(clients.map((client) => client.close()))
        await new Promise<void>((resolve) => io.close(() => resolve()))
        if (redis.status === "ready") {
            const keys = await redis.keys(`${prefix}*`)
            if (keys.length) await redis.del(...keys)
        }
        await presence.stop()
        await mongoose.disconnect()
        await mongo?.stop()
    })

    it("supports real two-account typing, duplicate-free delivery, multi-tab presence and reconnect", async () => {
        const sender = await connect(senderId)
        const recipient = await connect(recipientId)
        const secondTab = await connect(recipientId)
        await vi.waitFor(async () => expect(await presence.getPresenceBatch([recipientId])).toEqual({ [recipientId]: true }))
        for (const conversationId of conversations) {
            expect(await sender.request(SOCKET_EVENTS.CONVERSATION_JOIN, conversationId)).toBe(true)
            expect(await recipient.request(SOCKET_EVENTS.CONVERSATION_JOIN, conversationId)).toBe(true)
            sender.emit(SOCKET_EVENTS.TYPING_START, { conversationId })
            await recipient.waitFor(SOCKET_EVENTS.TYPING_UPDATE, (input) => (input as TypingEventDto).conversationId === conversationId && (input as TypingEventDto).isTyping)
            sender.emit(SOCKET_EVENTS.TYPING_STOP, { conversationId })
            await recipient.waitFor(SOCKET_EVENTS.TYPING_UPDATE, (input) => (input as TypingEventDto).conversationId === conversationId && !(input as TypingEventDto).isTyping)
            const message = { id: new mongoose.Types.ObjectId().toString(), conversationId, senderId, content: "Live socket test" } as MessageDto
            await gateway.publishMessage(message)
            await recipient.waitFor(SOCKET_EVENTS.MESSAGE_CREATED, (input) => (input as MessageDto).id === message.id)
            await secondTab.waitFor(SOCKET_EVENTS.MESSAGE_CREATED, (input) => (input as MessageDto).id === message.id)
            await recipient.request(SOCKET_EVENTS.PRESENCE_QUERY, [recipientId])
            expect(recipient.events.filter((entry) => entry.event === SOCKET_EVENTS.MESSAGE_CREATED && (entry.payload as MessageDto).id === message.id)).toHaveLength(1)
        }
        await recipient.close()
        expect(await sender.request(SOCKET_EVENTS.PRESENCE_QUERY, [recipientId])).toEqual({ [recipientId]: true })
        await secondTab.close()
        await vi.waitFor(async () => expect(await presence.getPresenceBatch([recipientId])).toEqual({ [recipientId]: false }))
        await connect(recipientId)
        await vi.waitFor(async () => expect(await presence.getPresenceBatch([recipientId])).toEqual({ [recipientId]: true }))
        expect(errors).toEqual([])
    })

    it("does not authorize typing for a participant who has already left", async () => {
        await Conversation.updateOne({ [CONVERSATION_FIELDS.ID]: conversations[1], [`${CONVERSATION_FIELDS.PARTICIPANTS}.${PARTICIPANT_FIELDS.USER_ID}`]: recipientId }, { $set: { [`${CONVERSATION_FIELDS.PARTICIPANTS}.$.${PARTICIPANT_FIELDS.LEFT_AT}`]: new Date() } })
        expect(await repository.isCurrentMember(conversations[1], recipientId)).toBe(false)
    })

    async function connect(userId: string): Promise<RealtimeTestClient> {
        const client = await RealtimeTestClient.connect(origin, tokens.createAccessToken(userId))
        clients.push(client)
        return client
    }
})
