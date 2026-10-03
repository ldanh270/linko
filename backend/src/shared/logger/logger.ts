/** Structured technical error record written by the server logger. */
export interface LogRecord {
    level: "error"
    message: string
    stack: string
    requestId: string
    method: string
    path: string
    userId?: string
}

/** Request fields safe to include in a technical error log. */
export interface ErrorLogContext {
    requestId: string
    method: string
    path: string
    userId?: string
}

/** Logs unexpected failures with redacted, structured context. */
export interface ServerLogger {
    error(error: Error, context: ErrorLogContext): void
}

const redact = (value: string): string => value
    .replace(/\bBearer\s+[^\s"']+/gi, "Bearer [REDACTED]")
    .replace(/\b(password|token|authorization|cookie|inviteToken)\s*[:=]\s*[^\s,"']+/gi, "$1=[REDACTED]")

/** Create a logger whose sink can be replaced in tests. */
export function createLogger(write: (record: LogRecord) => void): ServerLogger {
    return {
        error(error, context) {
            write({
                level: "error",
                message: redact(error.message),
                stack: redact(error.stack ?? `${error.name}: ${error.message}`),
                requestId: context.requestId,
                method: context.method,
                path: context.path,
                ...(context.userId ? { userId: context.userId } : {}),
            })
        },
    }
}

/** Production sink for JSON logs without exposing request bodies. */
export const logger = createLogger((record) => process.stderr.write(`${JSON.stringify(record)}\n`))
