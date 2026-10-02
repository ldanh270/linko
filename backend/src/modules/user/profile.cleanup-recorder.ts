import { API_ROUTES, USER_ROUTE_PATHS } from "@linko/contracts"

import { requestContext } from "../../shared/middlewares/requestContext"
import type { ServerLogger } from "../../shared/logger/logger"
import { PROFILE_FIELDS, PROFILE_LOG_EVENTS } from "./profile.constants"
import type { ObjectId, ProfileImageRecord, ProfileImageCleanupFailureRecorder } from "./profile.types"

/** Record retryable profile image cleanup failures through structured server logging.
 *
 * @pattern Adapter
 * @layer Aspect
 */
export class LoggerProfileImageCleanupFailureRecorder implements ProfileImageCleanupFailureRecorder {
    /** Bind image cleanup failures to the server logger. */
    constructor(private readonly logger: ServerLogger) {}

    /** Record safe image and user identifiers for a failed post-write cleanup. */
    recordFailure(image: ProfileImageRecord, userId: ObjectId, error: unknown): void {
        const context = requestContext.getStore()
        this.logger.error(error instanceof Error ? error : new Error("Profile image cleanup failed"), {
            requestId: context?.requestId ?? "unavailable",
            method: "PATCH",
            path: `${API_ROUTES.USERS}${USER_ROUTE_PATHS.ME}`,
            userId: userId.toString(),
            metadata: {
                event: PROFILE_LOG_EVENTS.IMAGE_CLEANUP_FAILED,
                [PROFILE_FIELDS.USER_ID]: userId.toString(),
                imageId: image.id,
            },
        })
    }
}
