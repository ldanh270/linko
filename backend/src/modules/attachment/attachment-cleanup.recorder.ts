import { API_ROUTES } from "@linko/contracts"

import type { ServerLogger } from "../../shared/logger/logger"
import { requestContext } from "../../shared/middlewares/requestContext"
import { ATTACHMENT_ERROR_MESSAGES, ATTACHMENT_LOG_OPERATIONS } from "./attachment.constants"
import type { AttachmentCleanupFailureRecorder } from "./attachment.types"

/** Log failed best-effort R2 cleanup without recording private keys or file contents.
 *
 * @pattern Adapter
 * @layer Aspect
 */
export class LoggerAttachmentCleanupFailureRecorder implements AttachmentCleanupFailureRecorder {
    /** Inject the application logger used for structured technical failures. */
    constructor(private readonly logger: ServerLogger) {}

    /** Record a secondary cleanup error while preserving the original operation failure. */
    record(error: unknown): void {
        const context = requestContext.getStore()
        const details = error instanceof Error ? error : new Error(ATTACHMENT_ERROR_MESSAGES.CLEANUP_FAILED)
        this.logger.error(details, {
            requestId: context?.requestId ?? "unavailable",
            method: "SERVICE",
            path: API_ROUTES.MESSAGES,
            ...(context?.userId ? { userId: context.userId } : {}),
            metadata: { operation: ATTACHMENT_LOG_OPERATIONS.CLEANUP_FAILED },
        })
    }
}
