import { ERROR_CODES } from "@linko/contracts"

import { HttpStatusCode } from "../../configs/constants/httpStatusCode"
import { BusinessException } from "../../shared/errors/BusinessException"
import { INVITATION_MESSAGES } from "./invitation.constants"

/** Hide whether an invitation was unknown, expired, revoked, or exhausted. */
export class InvitationUnavailableException extends BusinessException {
    /** Build one safe 410 response for any invitation that can no longer be previewed. */
    constructor() {
        super(ERROR_CODES.INVITATION_UNAVAILABLE, HttpStatusCode.GONE, INVITATION_MESSAGES.UNAVAILABLE)
    }
}
