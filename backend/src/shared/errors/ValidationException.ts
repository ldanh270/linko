import { ERROR_CODES } from "@linko/contracts"

import { HttpStatusCode } from "../../configs/constants/httpStatusCode"
import { BusinessException } from "./BusinessException"

/** Represent client input that fails a named business validation rule. */
export class ValidationException extends BusinessException {
    /** Build a 400 error with stable validation code and optional safe field details. */
    constructor(message: string, details?: Record<string, unknown>) {
        super(ERROR_CODES.VALIDATION, HttpStatusCode.BAD_REQUEST, message, details)
    }
}
