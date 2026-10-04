import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import Conversation from "../src/models/Conversation"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../src/modules/conversation/conversation.constants"
import { SYSTEM_ACTOR_ID } from "../src/shared/persistence/auditPlugin"
import { migrateLegacyMutePreferences } from "./migrateNotificationPreferences"

const TEST_WIRED_TIGER_CACHE_SIZE_GB = "0.25"
const CURRENT_TIME = new Date("2026-10-04T14:00:00.000Z")
const ACTIVE_MUTE_EXPIRY = new Date("2026-10-04T15:00:00.000Z")
const EXPIRED_MUTE_EXPIRY = new Date("2026-10-04T13:00:00.000Z")

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger",
            args: [`--wiredTigerCacheSizeGB=${TEST_WIRED_TIGER_CACHE_SIZE_GB}`],
        },
    })
    await mongoose.connect(replicaSet.getUri(), { dbName: "notification-migration-test" })
    await Conversation.init()
})

beforeEach(async () => {
    await Conversation.collection.deleteMany({})
})

afterAll(async () => {
    await mongoose.disconnect()
    await replicaSet?.stop()
})

describe("migrateLegacyMutePreferences", () => {
    it("should_preview_without_changing_legacy_fields", async () => {
        const conversationId = await createLegacyConversation()
        const database = requireDatabase()

        await expect(migrateLegacyMutePreferences(database, { apply: false, now: CURRENT_TIME })).resolves.toBe(1)

        const conversation = await Conversation.collection.findOne({ [CONVERSATION_FIELDS.ID]: conversationId })
        const participant = conversation?.[CONVERSATION_FIELDS.PARTICIPANTS][0]
        expect(participant?.[PARTICIPANT_FIELDS.IS_MUTED]).toBeUndefined()
        expect(participant?.[PARTICIPANT_FIELDS.MUTED_UNTIL]).toEqual(ACTIVE_MUTE_EXPIRY)
    })

    it("should_backfill_active_legacy_mutes_and_preserve_expiry_for_transition_reads", async () => {
        const conversationId = await createLegacyConversation()
        const database = requireDatabase()

        await expect(migrateLegacyMutePreferences(database, { apply: true, now: CURRENT_TIME })).resolves.toBe(1)

        const conversation = await Conversation.collection.findOne({ [CONVERSATION_FIELDS.ID]: conversationId })
        const participants = conversation?.[CONVERSATION_FIELDS.PARTICIPANTS]
        expect(participants?.[0]?.[PARTICIPANT_FIELDS.IS_MUTED]).toBe(true)
        expect(participants?.[0]?.[PARTICIPANT_FIELDS.MUTED_UNTIL]).toEqual(ACTIVE_MUTE_EXPIRY)
        expect(participants?.[1]?.[PARTICIPANT_FIELDS.IS_MUTED]).toBe(false)
        expect(conversation?.updatedBy).toEqual(SYSTEM_ACTOR_ID)
        expect(conversation?.updatedAt).toEqual(CURRENT_TIME)
    })
})

async function createLegacyConversation(): Promise<mongoose.Types.ObjectId> {
    const result = await Conversation.collection.insertOne({
        [CONVERSATION_FIELDS.PARTICIPANTS]: [
            {
                [PARTICIPANT_FIELDS.USER_ID]: new mongoose.Types.ObjectId(),
                [PARTICIPANT_FIELDS.MUTED_UNTIL]: ACTIVE_MUTE_EXPIRY,
                [PARTICIPANT_FIELDS.DEL_FLAG]: false,
            },
            {
                [PARTICIPANT_FIELDS.USER_ID]: new mongoose.Types.ObjectId(),
                [PARTICIPANT_FIELDS.IS_MUTED]: false,
                [PARTICIPANT_FIELDS.MUTED_UNTIL]: EXPIRED_MUTE_EXPIRY,
                [PARTICIPANT_FIELDS.DEL_FLAG]: false,
            },
        ],
        [CONVERSATION_FIELDS.UPDATED_AT]: new Date("2026-10-04T12:00:00.000Z"),
    })
    return result.insertedId
}

function requireDatabase(): NonNullable<typeof mongoose.connection.db> {
    const database = mongoose.connection.db
    if (!database) throw new Error("Test database has not connected")
    return database
}
