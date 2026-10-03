import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { backfillAudit, migrateIndexes } from "../../../scripts/backfillAudit"
import Conversation from "../../models/Conversation"
import FriendRequest from "../../models/FriendRequest"
import Friendship from "../../models/Friendship"
import Message from "../../models/Message"
import Session from "../../models/Session"
import User from "../../models/User"
import { requestContext } from "../middlewares/requestContext"
import { auditPlugin } from "./auditPlugin"
import { softDelete, softDeletePlugin } from "./softDeletePlugin"
import { withTransaction } from "./withTransaction"

const recordSchema = new mongoose.Schema({ name: { type: String, required: true } }, { timestamps: true })
recordSchema.plugin(auditPlugin)
recordSchema.plugin(softDeletePlugin)
const Record = mongoose.model("FoundationRecord", recordSchema)

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    expect(process.env.MONGODB_CONNECTION_STRING).toBeUndefined()
    replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } })
    await mongoose.connect(replicaSet.getUri(), { dbName: "foundation-test" })
})

beforeEach(async () => {
    await Record.collection.deleteMany({})
})

afterAll(async () => {
    await mongoose.disconnect()
    await replicaSet?.stop()
})

describe("Mongoose persistence aspects", () => {
    it("fills actor and IP on create and update without application-supplied audit fields", async () => {
        const actorId = new mongoose.Types.ObjectId()
        const record = await requestContext.run(
            { requestId: "request-1", userId: actorId.toString(), ip: "2001:db8::1" },
            () => Record.create({ name: "first" }),
        )

        expect(String(record.get("createdBy"))).toBe(actorId.toString())
        expect(record.get("createdIp")).toBe("2001:db8::1")
        expect(record.get("delFlag")).toBe(false)

        const nextActorId = new mongoose.Types.ObjectId()
        await requestContext.run(
            { requestId: "request-2", userId: nextActorId.toString(), ip: "127.0.0.1" },
            async () => { await Record.updateOne({ _id: record._id }, { $set: { name: "second" } }) },
        )
        const updated = await Record.findById(record._id)
        expect(String(updated?.get("updatedBy"))).toBe(nextActorId.toString())
        expect(updated?.get("updatedIp")).toBe("127.0.0.1")
        expect(String(updated?.get("createdBy"))).toBe(actorId.toString())
    })

    it("hides soft-deleted records from find, count and aggregate unless explicitly included", async () => {
        const record = await Record.create({ name: "hidden" })
        await softDelete(Record, { _id: record._id })

        expect(await Record.collection.countDocuments({ _id: record._id })).toBe(1)
        expect(await Record.find()).toHaveLength(0)
        expect(await Record.countDocuments()).toBe(0)
        expect(await Record.countDocuments().setOptions({ includeDeleted: true })).toBe(1)
        expect(await Record.aggregate([{ $project: { name: 1 } }])).toHaveLength(0)
        expect(await Record.find().setOptions({ includeDeleted: true })).toHaveLength(1)
        expect(await Record.aggregate([{ $project: { name: 1 } }]).option({ includeDeleted: true })).toHaveLength(1)
    })

    it("rejects accidental hard deletes through the model API", async () => {
        const record = await Record.create({ name: "retained" })

        await expect(Record.deleteOne({ _id: record._id })).rejects.toThrow("softDelete")
        expect(await Record.collection.countDocuments({ _id: record._id })).toBe(1)
    })

    it("can read legacy rows missing audit fields and uses the system actor for new writes", async () => {
        const result = await Record.collection.insertOne({ name: "legacy" })
        const legacy = await Record.findById(result.insertedId)
        const newRecord = await Record.create({ name: "system" })

        expect(legacy?.name).toBe("legacy")
        expect(newRecord.get("createdIp")).toBeNull()
        expect(String(newRecord.get("createdBy"))).toBe("000000000000000000000001")
    })

    it("rolls back all writes when a transaction fails", async () => {
        await expect(withTransaction(async (transaction) => {
            await Record.create([{ name: "partial" }], { session: transaction.session })
            throw new Error("rollback")
        })).rejects.toThrow("rollback")

        expect(await Record.countDocuments()).toBe(0)
    })

    it("applies audit and soft-delete fields to every existing collection model", () => {
        for (const model of [User, Session, Friendship, FriendRequest, Conversation, Message]) {
            expect(model.schema.paths.createdBy, model.modelName).toBeDefined()
            expect(model.schema.paths.updatedBy, model.modelName).toBeDefined()
            expect(model.schema.paths.createdIp, model.modelName).toBeDefined()
            expect(model.schema.paths.updatedIp, model.modelName).toBeDefined()
            expect(model.schema.paths.delFlag, model.modelName).toBeDefined()
        }
        expect(Session.schema.indexes().some(([, options]) => "expireAfterSeconds" in options)).toBe(false)
    })

    it("dry-runs legacy backfill and changes zero rows on a repeated apply", async () => {
        const database = mongoose.connection.db
        if (!database) throw new Error("Test database is unavailable")
        const inserted = await Record.collection.insertOne({ name: "legacy-backfill" })

        const preview = await backfillAudit(database, { apply: false, collections: [Record.collection.name] })
        expect(preview[Record.collection.name]).toBe(1)
        expect((await Record.collection.findOne({ _id: inserted.insertedId }))?.createdBy).toBeUndefined()

        const firstApply = await backfillAudit(database, { apply: true, collections: [Record.collection.name] })
        const secondApply = await backfillAudit(database, { apply: true, collections: [Record.collection.name] })
        const document = await Record.collection.findOne({ _id: inserted.insertedId })
        expect(firstApply[Record.collection.name]).toBe(1)
        expect(secondApply[Record.collection.name]).toBe(0)
        expect(document?.createdIp).toBeNull()
        expect(document?.updatedIp).toBeNull()
        expect(String(document?.createdBy)).toBe("000000000000000000000001")
        expect(document?.delFlag).toBe(false)
    })

    it("audits bulk inserts and upserts with the request actor", async () => {
        const actorId = new mongoose.Types.ObjectId()
        await requestContext.run(
            { requestId: "bulk-request", userId: actorId.toString(), ip: "192.0.2.8" },
            async () => {
                await Record.insertMany([{ name: "bulk" }])
                await Record.updateOne({ name: "upsert" }, { $set: { name: "upsert" } }, { upsert: true })
            },
        )

        for (const record of await Record.find()) {
            expect(String(record.get("createdBy"))).toBe(actorId.toString())
            expect(String(record.get("updatedBy"))).toBe(actorId.toString())
            expect(record.get("createdIp")).toBe("192.0.2.8")
        }
    })

    it("audits bulkWrite inserts used by system jobs", async () => {
        const actorId = new mongoose.Types.ObjectId()
        await requestContext.run(
            { requestId: "bulk-write", userId: actorId.toString(), ip: "192.0.2.9" },
            async () => { await Record.bulkWrite([{ insertOne: { document: { name: "bulk-write" } } }]) },
        )

        const record = await Record.findOne({ name: "bulk-write" })
        expect(String(record?.get("createdBy"))).toBe(actorId.toString())
        expect(record?.get("createdIp")).toBe("192.0.2.9")
    })

    it("rejects replacement and pipeline writes that could erase audit fields", async () => {
        const record = await Record.create({ name: "original" })

        await expect(Record.replaceOne({ _id: record._id }, { name: "replacement" })).rejects.toThrow("audit fields")
        await expect(Record.findOneAndReplace({ _id: record._id }, { name: "replacement" })).rejects.toThrow("audit fields")
        await expect(Record.bulkWrite([{ replaceOne: { filter: { _id: record._id }, replacement: { name: "replacement", createdAt: new Date(), updatedAt: new Date() } } }])).rejects.toThrow("audit fields")
        await expect(Record.bulkWrite([{ updateOne: { filter: { _id: record._id }, update: [{ $set: { name: "pipeline" } }] } }])).rejects.toThrow("audit fields")
        expect((await Record.findById(record._id))?.name).toBe("original")
    })

    it("previews Session TTL removal before applying a non-TTL expiry index", async () => {
        const database = mongoose.connection.db
        if (!database) throw new Error("Test database is unavailable")
        await Session.init()
        const collection = database.collection(Session.collection.name)
        const current = await collection.listIndexes().toArray()
        for (const index of current) {
            if (index.name === "expiresAt_1" || index.name === "active_session_expiry") {
                await collection.dropIndex(index.name)
            }
        }
        await collection.createIndex({ expiresAt: 1 }, { name: "expiresAt_1", expireAfterSeconds: 0 })

        const preview = await migrateIndexes(database, { apply: false, collections: [Session.collection.name] })
        expect(preview[Session.collection.name]).toContain("drop:expiresAt_1")
        expect((await collection.listIndexes().toArray()).some((index) => index.expireAfterSeconds === 0)).toBe(true)

        await migrateIndexes(database, { apply: true, collections: [Session.collection.name] })
        const finalIndexes = await collection.listIndexes().toArray()
        expect(finalIndexes.some((index) => index.expireAfterSeconds === 0)).toBe(false)
        expect(finalIndexes.some((index) => index.name === "active_session_expiry")).toBe(true)
    })
})
