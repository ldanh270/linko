import "dotenv/config"
import { pathToFileURL } from "node:url"
import mongoose from "mongoose"

import Conversation from "../src/models/Conversation"
import { configureDnsServers } from "../src/libs/database"

/** Minimal native collection surface used by the legacy joinAt migration. */
export interface LegacyJoinAtMigrationDatabase {
    collection(name: string): {
        find(filter: object): {
            toArray(): Promise<any[]>
        }
        updateOne(filter: object, update: object): Promise<unknown>
    }
}

/** Controls whether legacy joinAt updates are previewed or applied. */
export interface LegacyJoinAtMigrationOptions {
    readonly apply: boolean
}

export interface LegacyJoinAtMigrationResult {
    readonly matchedConversations: number
    readonly updatedConversations: number
    readonly updatedParticipants: number
}

/** Synchronize legacy `joinAt` timestamps to `joinedAt` for participants whose `joinedAt` was missing or overwritten.
 *
 * The operation is idempotent.
 *
 * @param database - Native MongoDB database connection.
 * @param options - Dry-run or apply mode.
 * @returns Summary of conversations and participants updated.
 */
export async function migrateLegacyJoinAt(
    database: LegacyJoinAtMigrationDatabase,
    options: LegacyJoinAtMigrationOptions,
): Promise<LegacyJoinAtMigrationResult> {
    const collection = database.collection(Conversation.collection.name)
    const conversations = await collection.find({
        "participants.joinAt": { $exists: true },
    }).toArray()

    let updatedConversations = 0
    let updatedParticipants = 0

    for (const conv of conversations) {
        let conversationModified = false
        const participants = Array.isArray(conv.participants) ? conv.participants : []
        const newParticipants = participants.map((participant: Record<string, unknown>) => {
            if (participant.joinAt instanceof Date || typeof participant.joinAt === "string") {
                const joinAtDate = new Date(participant.joinAt)
                const currentJoinedAt = participant.joinedAt ? new Date(participant.joinedAt as string | Date) : null
                if (!currentJoinedAt || currentJoinedAt.getTime() > joinAtDate.getTime()) {
                    conversationModified = true
                    updatedParticipants++
                    return { ...participant, joinedAt: joinAtDate }
                }
            }
            return participant
        })

        if (conversationModified) {
            updatedConversations++
            if (options.apply) {
                await collection.updateOne(
                    { _id: conv._id },
                    { $set: { participants: newParticipants } },
                )
            }
        }
    }

    return {
        matchedConversations: conversations.length,
        updatedConversations,
        updatedParticipants,
    }
}

async function run(): Promise<void> {
    const connectionString = process.env.MONGODB_CONNECTION_STRING
    if (!connectionString?.trim()) {
        process.stderr.write("MONGODB_CONNECTION_STRING is required\n")
        process.exitCode = 1
        return
    }

    configureDnsServers()
    await mongoose.connect(connectionString, { autoCreate: false, autoIndex: false })
    const database = mongoose.connection.db
    if (!database) throw new Error("Connected database is unavailable")

    const apply = process.argv.includes("--apply")
    const result = await migrateLegacyJoinAt(database, { apply })
    process.stdout.write(`${JSON.stringify({ apply, ...result }, null, 2)}\n`)
    await mongoose.disconnect()
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    run().catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`)
        process.exitCode = 1
    })
}
