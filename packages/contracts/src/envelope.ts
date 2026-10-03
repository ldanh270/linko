/** A MongoDB ObjectId represented as a string across API boundaries. */
export type EntityId = string

/** Pagination metadata returned by list endpoints. */
export type ApiMeta = Record<string, string | number | boolean | null>

/** The safe error body shared by backend responses and frontend handling. */
export interface ApiErrorBody {
    code: string
    message: string
    details?: Record<string, unknown> | null
    requestId?: string
}

/** The shared success envelope. */
export interface ApiSuccess<T> {
    success: true
    data: T
    error: null
    meta: ApiMeta | null
}

/** The shared failure envelope. */
export interface ApiFailure {
    success: false
    data: null
    error: ApiErrorBody
    meta: null
}

/** The result type consumed by the frontend HTTP client. */
export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure
