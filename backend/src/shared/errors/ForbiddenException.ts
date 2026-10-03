import { ERROR_CODES } from "@linko/contracts"

import { HttpStatusCode } from "../../configs/constants/httpStatusCode"
import { BusinessException } from "./BusinessException"

/** Represent an expected authorization failure without exposing persistence details. */
export class ForbiddenException extends BusinessException {
    /** Build a 403 error with the shared forbidden code. */
    constructor(message: string) {
        super(ERROR_CODES.FORBIDDEN, HttpStatusCode.FORBIDDEN, message)
    }
}
