import { ERROR_CODES } from "@linko/contracts"

import { HttpStatusCode } from "../../configs/constants/httpStatusCode"
import { BusinessException } from "../../shared/errors/BusinessException"
import { INVITATION_MESSAGES } from "./invitation.constants"

/** Report when an authenticated group manager exceeds the invitation issue budget. */
export class InvitationRateLimitException extends BusinessException {
    /** Build a safe 429 response without exposing the actor's issue history. */
    constructor() {
        super(ERROR_CODES.INVITATION_RATE_LIMITED, HttpStatusCode.TOO_MANY_REQUESTS, INVITATION_MESSAGES.RATE_LIMITED)
    }
}
