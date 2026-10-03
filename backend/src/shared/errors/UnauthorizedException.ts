import type { ErrorCode } from "@linko/contracts"

import { BusinessException } from "./BusinessException"

/** Represent an expected authentication failure without exposing credential details. */
export class UnauthorizedException extends BusinessException {
    /** Build a 401 error with a stable contract code. */
    constructor(code: ErrorCode, message: string) {
        super(code, 401, message)
    }
}
