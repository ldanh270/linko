import { ERROR_CODES, type ErrorCode } from "@linko/contracts"

import { HttpStatusCode } from "../../configs/constants/httpStatusCode"
import { BusinessException } from "./BusinessException"

/** Represent an expected authorization failure without exposing persistence details. */
export class ForbiddenException extends BusinessException {
    /** Build a 403 error with a stable shared code. */
    constructor(message: string, code: ErrorCode = ERROR_CODES.FORBIDDEN) {
        super(code, HttpStatusCode.FORBIDDEN, message)
    }
}
