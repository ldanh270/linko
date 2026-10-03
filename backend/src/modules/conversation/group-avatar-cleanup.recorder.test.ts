import mongoose from "mongoose"
import { describe, expect, it } from "vitest"

import { createLogger, type LogRecord } from "../../shared/logger/logger"
import { requestContext } from "../../shared/middlewares/requestContext"
import { GROUP_LOG_EVENTS } from "./conversation.constants"
import { LoggerGroupAvatarCleanupFailureRecorder } from "./group-avatar-cleanup.recorder"
import type { GroupAvatarRecord } from "./conversation.types"

const GROUP_ID = new mongoose.Types.ObjectId("64b000000000000000000003")
const OWNER_ID = new mongoose.Types.ObjectId("64b000000000000000000001")
const AVATAR: GroupAvatarRecord = {
    url: "https://media.example/groups/old-avatar.jpg",
    id: "r2:groups/old-avatar.jpg",
}

describe("LoggerGroupAvatarCleanupFailureRecorder", () => {
    it("should_record_safe_avatar_and_group_ids_for_later_cleanup_retry", () => {
        const records: LogRecord[] = []
        const recorder = new LoggerGroupAvatarCleanupFailureRecorder(createLogger((record) => records.push(record)))

        requestContext.run({ requestId: "request-1", userId: OWNER_ID.toString() }, () => {
            recorder.recordFailure(AVATAR, GROUP_ID, new Error("R2 deletion failed"), OWNER_ID)
        })

        expect(records).toHaveLength(1)
        expect(records[0]).toMatchObject({
            requestId: "request-1",
            userId: OWNER_ID.toString(),
            method: "PATCH",
            metadata: {
                event: GROUP_LOG_EVENTS.AVATAR_CLEANUP_PENDING,
                groupId: GROUP_ID.toString(),
                avatarId: AVATAR.id,
            },
        })
    })
})
