import { MongoMemoryReplSet } from "mongodb-memory-server"
import mongoose from "mongoose"
import { spawn } from "node:child_process"
import { resolve } from "node:path"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import Conversation from "../src/models/Conversation"
import FriendRequest from "../src/models/FriendRequest"
import Friendship from "../src/models/Friendship"
import Message from "../src/models/Message"
import Session from "../src/models/Session"
import User from "../src/models/User"

const DATABASE_NAME = "linko_clear_database_test"
const UNRELATED_COLLECTION = "unrelated_records"
const APP_COLLECTIONS = [
    User.collection.name,
    Session.collection.name,
    Friendship.collection.name,
    FriendRequest.collection.name,
    Conversation.collection.name,
    Message.collection.name,
] as const

let replicaSet: MongoMemoryReplSet
let databaseUri: string

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: { count: 1, storageEngine: "wiredTiger" },
    })
    databaseUri = replicaSet.getUri(DATABASE_NAME)
    await mongoose.connect(databaseUri)
})

beforeEach(async () => {
    const database = mongoose.connection.db
    if (!database) throw new Error("The in-memory database is unavailable")
    await Promise.all(
        [...APP_COLLECTIONS, UNRELATED_COLLECTION].map(async (name) => {
            await database.collection(name).deleteMany({})
            await database.collection(name).insertOne({ testRecord: true })
        }),
    )
})

afterAll(async () => {
    await mongoose.disconnect()
    await replicaSet?.stop()
})

describe("database clear command", () => {
    it("clears Linko collections only after exact database confirmation", async () => {
        const rejectedConfirmation = await runClearCommand("wrong_database\n")
        expect(rejectedConfirmation.code).toBe(0)
        expect(rejectedConfirmation.output).toContain("Database clear cancelled")
        await expectCollectionCounts(1)

        const acceptedConfirmation = await runClearCommand(`${DATABASE_NAME}\n`)
        expect(acceptedConfirmation.code).toBe(0)
        expect(acceptedConfirmation.output).toContain("Database cleared")
        await expectCollectionCounts(0)
    })

    it("refuses to connect or delete data when NODE_ENV is production", async () => {
        const result = await runClearCommand("\n", "production")

        expect(result.code).not.toBe(0)
        expect(result.output).toContain("production")
        await expectCollectionCounts(1)
    })
})

/** Run the guarded database command as a separate process with an isolated MongoDB URI. */
function runClearCommand(
    answer: string,
    environment = "development",
): Promise<{
    code: number | null
    output: string
}> {
    return new Promise((resolveResult, reject) => {
        const child = spawn(
            process.execPath,
            ["--import", "tsx", resolve(process.cwd(), "scripts/clearDatabase.ts")],
            {
                cwd: process.cwd(),
                env: {
                    ...process.env,
                    NODE_ENV: environment,
                    MONGODB_CONNECTION_STRING: databaseUri,
                },
                stdio: ["pipe", "pipe", "pipe"],
            },
        )
        let output = ""
        const timeout = setTimeout(() => child.kill(), 20_000)

        child.stdout.on("data", (chunk: Buffer) => {
            output += chunk.toString()
        })
        child.stderr.on("data", (chunk: Buffer) => {
            output += chunk.toString()
        })
        child.stdin.on("error", () => undefined)
        child.on("error", reject)
        child.on("close", (code) => {
            clearTimeout(timeout)
            resolveResult({ code, output })
        })
        child.stdin.end(answer)
    })
}

/** Verify the number of retained documents in managed and unrelated collections. */
async function expectCollectionCounts(appCount: number): Promise<void> {
    const database = mongoose.connection.db
    if (!database) throw new Error("The in-memory database is unavailable")

    const appCounts = await Promise.all(
        APP_COLLECTIONS.map((name) => database.collection(name).countDocuments()),
    )
    const unrelatedCount = await database.collection(UNRELATED_COLLECTION).countDocuments()
    expect(appCounts).toEqual(APP_COLLECTIONS.map(() => appCount))
    expect(unrelatedCount).toBe(1)
}
