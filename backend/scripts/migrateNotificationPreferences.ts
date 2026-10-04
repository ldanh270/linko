import "dotenv/config"
import { pathToFileURL } from "node:url"
import mongoose from "mongoose"

import Conversation from "../src/models/Conversation"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../src/modules/conversation/conversation.constants"
import { configureDnsServers } from "../src/libs/database"
import { SYSTEM_ACTOR_ID } from "../src/shared/persistence/auditPlugin"

const MISSING_MONGO_FIELD_TYPE = "missing"
const MIGRATION_AUDIT_FIELDS = {
    UPDATED_AT: "updatedAt",
    UPDATED_BY: "updatedBy",
    UPDATED_IP: "updatedIp",
} as const

/** Minimal native collection surface used by the notification preference backfill. */
export interface NotificationPreferenceMigrationDatabase {
    collection(name: string): {
        countDocuments(filter: object): Promise<number>
        updateMany(filter: object, update: object): Promise<unknown>
    }
}

/** Controls whether legacy preference changes are previewed or applied. */
export interface NotificationPreferenceMigrationOptions {
    readonly apply: boolean
    readonly now: Date
}

/** Copy currently active legacy expiry values into `isMuted` without removing `mutedUntil`.
 *
 * The operation is idempotent and only writes participants whose new boolean has not been set.
 *
 * @param database - Native MongoDB database connection.
 * @param options - Dry-run/apply mode and one stable migration timestamp.
 * @returns Number of conversation documents containing an eligible legacy participant.
 */
export async function migrateLegacyMutePreferences(
    database: NotificationPreferenceMigrationDatabase,
    options: NotificationPreferenceMigrationOptions,
): Promise<number> {
    const collection = database.collection(Conversation.collection.name)
    const filter = createLegacyMuteFilter(options.now)
    const eligibleConversationCount = await collection.countDocuments(filter)
    if (options.apply && eligibleConversationCount > 0) {
        await collection.updateMany(filter, createLegacyMuteUpdate(options.now))
    }
    return eligibleConversationCount
}

function createLegacyMuteFilter(now: Date): Record<string, unknown> {
    return {
        [CONVERSATION_FIELDS.DEL_FLAG]: { $ne: true },
        [CONVERSATION_FIELDS.PARTICIPANTS]: {
            $elemMatch: {
                [PARTICIPANT_FIELDS.IS_MUTED]: { $exists: false },
                [PARTICIPANT_FIELDS.MUTED_UNTIL]: { $gt: now },
                [PARTICIPANT_FIELDS.DEL_FLAG]: { $ne: true },
            },
        },
    }
}

function createLegacyMuteUpdate(now: Date): readonly Record<string, unknown>[] {
    const isEligibleParticipant = {
        $and: [
            { $eq: [{ $type: `$$participant.${PARTICIPANT_FIELDS.IS_MUTED}` }, MISSING_MONGO_FIELD_TYPE] },
            { $gt: [`$$participant.${PARTICIPANT_FIELDS.MUTED_UNTIL}`, now] },
            { $ne: [`$$participant.${PARTICIPANT_FIELDS.DEL_FLAG}`, true] },
        ],
    }
    return [{
        $set: {
            [CONVERSATION_FIELDS.PARTICIPANTS]: {
                $map: {
                    input: `$${CONVERSATION_FIELDS.PARTICIPANTS}`,
                    as: "participant",
                    in: {
                        $cond: [
                            isEligibleParticipant,
                            { $mergeObjects: ["$$participant", { [PARTICIPANT_FIELDS.IS_MUTED]: true }] },
                            "$$participant",
                        ],
                    },
                },
            },
            [MIGRATION_AUDIT_FIELDS.UPDATED_AT]: now,
            [MIGRATION_AUDIT_FIELDS.UPDATED_BY]: SYSTEM_ACTOR_ID,
            [MIGRATION_AUDIT_FIELDS.UPDATED_IP]: null,
        },
    }]
}

async function main(): Promise<void> {
    try {
        const connectionString = process.env.MONGODB_CONNECTION_STRING
        if (!connectionString) throw new Error("Missing MONGODB_CONNECTION_STRING")
        configureDnsServers()
        await mongoose.connect(connectionString, { autoIndex: false })
        const database = mongoose.connection.db
        if (!database) throw new Error("MongoDB connection is unavailable")
        const apply = process.argv.includes("--apply")
        const eligibleConversationCount = await migrateLegacyMutePreferences(database, { apply, now: new Date() })
        process.stdout.write(`${JSON.stringify({
            mode: apply ? "apply" : "dry-run",
            eligibleConversationCount,
            legacyMuteUntilPreserved: true,
        })}\n`)
    } catch {
        process.stderr.write("Notification preference migration failed; inspect the database connection and retry\n")
        process.exitCode = 1
    } finally {
        await mongoose.disconnect()
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    void main()
}
