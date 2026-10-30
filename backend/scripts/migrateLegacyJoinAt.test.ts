import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import Conversation from "../src/models/Conversation"
import { migrateLegacyJoinAt } from "./migrateLegacyJoinAt"

const TEST_WIRED_TIGER_CACHE_SIZE_GB = "0.25"
const LEGACY_JOIN_AT = new Date("2025-12-22T14:55:21.006Z")
const OVERWRITTEN_JOINED_AT = new Date("2026-10-24T08:10:30.868Z")

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger",
            args: [`--wiredTigerCacheSizeGB=${TEST_WIRED_TIGER_CACHE_SIZE_GB}`],
        },
    })
    await mongoose.connect(replicaSet.getUri(), { dbName: "join-at-migration-test" })
    await Conversation.init()
})

beforeEach(async () => {
    await Conversation.collection.deleteMany({})
})

afterAll(async () => {
    await mongoose.disconnect()
    await replicaSet?.stop()
})

describe("migrateLegacyJoinAt", () => {
    it("should_preview_without_modifying_database", async () => {
        const id = new mongoose.Types.ObjectId()
        await Conversation.collection.insertOne({
            _id: id,
            participants: [
                {
                    userId: new mongoose.Types.ObjectId(),
                    role: "DIRECT",
                    joinAt: LEGACY_JOIN_AT,
                    joinedAt: OVERWRITTEN_JOINED_AT,
                },
            ],
        })

        const database = requireDatabase()
        const result = await migrateLegacyJoinAt(database, { apply: false })

        expect(result).toEqual({
            matchedConversations: 1,
            updatedConversations: 1,
            updatedParticipants: 1,
        })

        const doc = await Conversation.collection.findOne({ _id: id })
        expect(doc?.participants[0]?.joinedAt).toEqual(OVERWRITTEN_JOINED_AT)
    })

    it("should_restore_joinedAt_from_legacy_joinAt_when_applied", async () => {
        const id = new mongoose.Types.ObjectId()
        await Conversation.collection.insertOne({
            _id: id,
            participants: [
                {
                    userId: new mongoose.Types.ObjectId(),
                    role: "DIRECT",
                    joinAt: LEGACY_JOIN_AT,
                    joinedAt: OVERWRITTEN_JOINED_AT,
                },
                {
                    userId: new mongoose.Types.ObjectId(),
                    role: "DIRECT",
                    joinAt: LEGACY_JOIN_AT,
                },
            ],
        })

        const database = requireDatabase()
        const result = await migrateLegacyJoinAt(database, { apply: true })

        expect(result).toEqual({
            matchedConversations: 1,
            updatedConversations: 1,
            updatedParticipants: 2,
        })

        const doc = await Conversation.collection.findOne({ _id: id })
        expect(doc?.participants[0]?.joinedAt).toEqual(LEGACY_JOIN_AT)
        expect(doc?.participants[1]?.joinedAt).toEqual(LEGACY_JOIN_AT)
    })

    it("should_be_idempotent_when_run_multiple_times", async () => {
        const id = new mongoose.Types.ObjectId()
        await Conversation.collection.insertOne({
            _id: id,
            participants: [
                {
                    userId: new mongoose.Types.ObjectId(),
                    role: "DIRECT",
                    joinAt: LEGACY_JOIN_AT,
                    joinedAt: LEGACY_JOIN_AT,
                },
            ],
        })

        const database = requireDatabase()
        const result = await migrateLegacyJoinAt(database, { apply: true })

        expect(result).toEqual({
            matchedConversations: 1,
            updatedConversations: 0,
            updatedParticipants: 0,
        })
    })
})

function requireDatabase(): mongoose.mongo.Db {
    const database = mongoose.connection.db
    if (!database) throw new Error("Database not connected")
    return database
}
