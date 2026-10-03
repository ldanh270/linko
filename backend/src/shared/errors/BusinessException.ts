import type { ErrorCode } from "@linko/contracts"

/** Represents an expected client-caused failure that does not require server logging. */
export class BusinessException extends Error {
    constructor(
        public readonly code: ErrorCode,
        public readonly httpStatus: number,
        message: string,
        public readonly details?: Record<string, unknown>,
    ) {
        super(message)
        this.name = new.target.name
    }
}
