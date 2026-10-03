import type { ErrorCode } from "@linko/contracts"

import { BusinessException } from "./BusinessException"

/** Represent an expected conflict with an existing resource. */
export class ConflictException extends BusinessException {
    /** Build a 409 error with a stable contract code. */
    constructor(code: ErrorCode, message: string) {
        super(code, 409, message)
    }
}
