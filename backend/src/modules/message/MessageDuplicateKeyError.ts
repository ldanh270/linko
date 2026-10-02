/** Identify a collision on the message idempotency index for safe retry lookup. */
export class MessageDuplicateKeyError extends Error {
    /** Create an internal signal for a collision on the named idempotency index. */
    constructor() {
        super("Message idempotency key already exists")
        this.name = new.target.name
    }
}
