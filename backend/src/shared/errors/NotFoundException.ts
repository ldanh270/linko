import { ERROR_CODES, type ErrorCode } from "@linko/contracts"

import { HttpStatusCode } from "../../configs/constants/httpStatusCode"
import { BusinessException } from "./BusinessException"

/** Represent an expected missing-resource response with a stable API code. */
export class NotFoundException extends BusinessException {
    /** Build a 404 error with the shared not-found code. */
    constructor(message: string, code: ErrorCode = ERROR_CODES.NOT_FOUND) {
        super(code, HttpStatusCode.NOT_FOUND, message)
    }
}
