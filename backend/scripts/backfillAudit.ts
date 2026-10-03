import { pathToFileURL } from "node:url"
import mongoose from "mongoose"

import { configureDnsServers } from "../src/libs/database"
import Conversation from "../src/models/Conversation"
import FriendRequest from "../src/models/FriendRequest"
import Friendship from "../src/models/Friendship"
import Message from "../src/models/Message"
import Session from "../src/models/Session"
import User from "../src/models/User"
import { SYSTEM_ACTOR_ID } from "../src/shared/persistence/auditPlugin"

/** Collections created by the six existing Mongoose models. */
export const AUDITED_COLLECTIONS = [
    User.collection.name,
    Session.collection.name,
    Friendship.collection.name,
    FriendRequest.collection.name,
    Conversation.collection.name,
    Message.collection.name,
] as const

/** Minimal database port used by the backfill and its isolated test. */
export interface AuditDatabase {
    collection(name: string): {
        countDocuments(filter: object): Promise<number>
        updateMany(filter: object, update: object): Promise<unknown>
    }
}

/** Controls whether the migration previews or applies legacy field updates. */
export interface BackfillOptions {
    apply: boolean
    collections?: readonly string[]
}

const MISSING_AUDIT = {
    $or: [
        { createdAt: null },
        { updatedAt: null },
        { createdBy: null },
        { updatedBy: null },
        { createdIp: { $exists: false } },
        { updatedIp: { $exists: false } },
        { delFlag: { $exists: false } },
    ],
} as const

const LEGACY_AUDIT_UPDATE = [{
    $set: {
        createdAt: { $ifNull: ["$createdAt", { $toDate: "$_id" }] },
        updatedAt: { $ifNull: ["$updatedAt", { $ifNull: ["$createdAt", { $toDate: "$_id" }] }] },
        createdBy: { $ifNull: ["$createdBy", SYSTEM_ACTOR_ID] },
        updatedBy: { $ifNull: ["$updatedBy", SYSTEM_ACTOR_ID] },
        createdIp: { $ifNull: ["$createdIp", null] },
        updatedIp: { $ifNull: ["$updatedIp", null] },
        delFlag: { $ifNull: ["$delFlag", false] },
    },
}]

/** Preview or idempotently fill missing audit fields in named collections. */
export async function backfillAudit(database: AuditDatabase, options: BackfillOptions): Promise<Record<string, number>> {
    const counts: Record<string, number> = {}
    for (const name of options.collections ?? AUDITED_COLLECTIONS) {
        const collection = database.collection(name)
        counts[name] = await collection.countDocuments(MISSING_AUDIT)
        if (options.apply && counts[name] > 0) {
            await collection.updateMany(MISSING_AUDIT, LEGACY_AUDIT_UPDATE)
        }
    }
    return counts
}

type MongoDatabase = NonNullable<typeof mongoose.connection.db>

const UNIQUE_INDEXES = [
    { collection: User.collection.name, key: { username: 1 }, name: "active_username_unique", oldName: "username_1" },
    { collection: User.collection.name, key: { email: 1 }, name: "active_email_unique", oldName: "email_1" },
    { collection: Session.collection.name, key: { refreshToken: 1 }, name: "active_refresh_token_unique", oldName: "refreshToken_1" },
    { collection: Friendship.collection.name, key: { userA: 1, userB: 1 }, name: "active_friendship_unique", oldName: "userA_1_UserB_1" },
    { collection: FriendRequest.collection.name, key: { from: 1, to: 1 }, name: "active_friend_request_unique", oldName: "from_1_to_1" },
] as const

/** Preview or apply the index transition after a backup and reviewed dry-run. */
export async function migrateIndexes(
    database: MongoDatabase,
    options: BackfillOptions,
): Promise<Record<string, string[]>> {
    const actions: Record<string, string[]> = {}
    const existingCollections = new Set((await database.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name))
    for (const name of options.collections ?? AUDITED_COLLECTIONS) {
        actions[name] = []
        if (!existingCollections.has(name)) continue
        const collection = database.collection(name)
        if (options.apply && await collection.countDocuments({ delFlag: { $exists: false } }) > 0) {
            throw new Error(`Backfill ${name} before changing indexes`)
        }
        const indexes = await collection.listIndexes().toArray()
        for (const index of UNIQUE_INDEXES.filter((candidate) => candidate.collection === name)) {
            if (!indexes.some((current) => current.name === index.name)) {
                actions[name].push(`create:${index.name}`)
                if (options.apply) await collection.createIndex(index.key, {
                    name: index.name, unique: true, partialFilterExpression: { delFlag: false },
                })
            }
            if (indexes.some((current) => current.name === index.oldName)) {
                actions[name].push(`drop:${index.oldName}`)
                if (options.apply) await collection.dropIndex(index.oldName)
            }
        }
        if (name === Session.collection.name) {
            const ttl = indexes.find((index) => index.name === "expiresAt_1" && "expireAfterSeconds" in index)
            if (ttl) {
                actions[name].push("drop:expiresAt_1")
                if (options.apply) await collection.dropIndex("expiresAt_1")
            }
            if (!indexes.some((index) => index.name === "active_session_expiry") &&
                !indexes.some((index) => index.name === "expiresAt_1" && !("expireAfterSeconds" in index))) {
                actions[name].push("create:active_session_expiry")
                if (options.apply) await collection.createIndex({ expiresAt: 1 }, { name: "active_session_expiry" })
            }
        }
    }
    return actions
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMain) {
    await import("dotenv/config")
    const apply = process.argv.includes("--apply")
    const applyIndexes = process.argv.includes("--apply-indexes")
    const hasSafetyEvidence = process.argv.includes("--backup-confirmed") && process.argv.includes("--dry-run-reviewed")
    const connectionString = process.env.MONGODB_CONNECTION_STRING
    if (applyIndexes && (!apply || !hasSafetyEvidence)) {
        process.stderr.write("Index changes require --apply --backup-confirmed --dry-run-reviewed\n")
        process.exitCode = 1
    } else if (!connectionString) {
        process.stderr.write("MONGODB_CONNECTION_STRING is required\n")
        process.exitCode = 1
    } else {
        try {
            configureDnsServers()
            await mongoose.connect(connectionString, { autoIndex: false })
            const database = mongoose.connection.db
            if (!database) throw new Error("MongoDB connection is unavailable")
            const counts = await backfillAudit(database, { apply })
            process.stdout.write(`${JSON.stringify({ mode: apply ? "apply" : "dry-run", counts })}\n`)
            const indexPlan = await migrateIndexes(database, { apply: applyIndexes })
            process.stdout.write(`${JSON.stringify({ indexPlan })}\n`)
        } catch {
            process.stderr.write("Audit backfill failed; no connection details were logged\n")
            process.exitCode = 1
        } finally {
            await mongoose.disconnect()
        }
    }
}
