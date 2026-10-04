import { CONVERSATION_TYPE, ROLE } from "@linko/contracts"
import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import Conversation from "../../models/Conversation"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import { MongooseRealtimeRepository } from "./realtime.repository"

const TEST_WIRED_TIGER_CACHE_SIZE_GB = "0.25"

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger",
            args: [`--wiredTigerCacheSizeGB=${TEST_WIRED_TIGER_CACHE_SIZE_GB}`],
        },
    })
    await mongoose.connect(replicaSet.getUri(), { dbName: "realtime-repository-test" })
    await Conversation.init()
})

beforeEach(async () => {
    await Conversation.collection.deleteMany({})
})

afterAll(async () => {
    await mongoose.disconnect()
    await replicaSet?.stop()
})

describe("MongooseRealtimeRepository", () => {
    it("should_list_only_current_members_for_private_message_delivery", async () => {
        const activeMemberId = new mongoose.Types.ObjectId()
        const departedMemberId = new mongoose.Types.ObjectId()
        const removedMemberId = new mongoose.Types.ObjectId()
        const conversation = await Conversation.create({
            [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.DIRECT,
            [CONVERSATION_FIELDS.PARTICIPANTS]: [
                {
                    [PARTICIPANT_FIELDS.USER_ID]: activeMemberId,
                    [PARTICIPANT_FIELDS.ROLE]: ROLE.DIRECT,
                },
                {
                    [PARTICIPANT_FIELDS.USER_ID]: departedMemberId,
                    [PARTICIPANT_FIELDS.ROLE]: ROLE.DIRECT,
                    [PARTICIPANT_FIELDS.LEFT_AT]: new Date(),
                },
                {
                    [PARTICIPANT_FIELDS.USER_ID]: removedMemberId,
                    [PARTICIPANT_FIELDS.ROLE]: ROLE.DIRECT,
                    [PARTICIPANT_FIELDS.DEL_FLAG]: true,
                    [PARTICIPANT_FIELDS.LEFT_AT]: new Date(),
                },
            ],
        })

        await expect(new MongooseRealtimeRepository().listCurrentMemberIds(conversation._id.toString()))
            .resolves.toEqual([activeMemberId.toString()])
    })
})
