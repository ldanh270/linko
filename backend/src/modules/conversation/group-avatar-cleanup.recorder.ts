import { API_ROUTES } from "@linko/contracts"

import { requestContext } from "../../shared/middlewares/requestContext"
import type { ServerLogger } from "../../shared/logger/logger"
import { GROUP_LOG_EVENTS, GROUP_MESSAGES } from "./conversation.constants"
import type { GroupAvatarCleanupFailureRecorder, GroupAvatarRecord, ObjectId } from "./conversation.types"

/** Record retryable avatar cleanup failures through the structured server logger.
 *
 * Object identifiers are included as safe metadata so an operational retry can target the committed object.
 *
 * @pattern Adapter
 * @layer Aspect
 */
export class LoggerGroupAvatarCleanupFailureRecorder implements GroupAvatarCleanupFailureRecorder {
    /** Bind cleanup retry records to the server's structured logging boundary. */
    constructor(private readonly logger: ServerLogger) {}

    /** Record the failed old-avatar deletion without changing a committed update response. */
    recordFailure(avatar: GroupAvatarRecord, groupId: ObjectId, error: unknown, actorId: ObjectId): void {
        const context = requestContext.getStore()
        const cleanupError = error instanceof Error ? error : new Error(GROUP_MESSAGES.AVATAR_CLEANUP_FAILED)
        this.logger.error(cleanupError, {
            requestId: context?.requestId ?? "unavailable",
            method: "PATCH",
            path: `${API_ROUTES.CONVERSATIONS}/${groupId.toString()}`,
            userId: actorId.toString(),
            metadata: {
                event: GROUP_LOG_EVENTS.AVATAR_CLEANUP_PENDING,
                groupId: groupId.toString(),
                avatarId: avatar.id,
            },
        })
    }
}
