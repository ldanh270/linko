import type { ApiErrorBody, ApiFailure, ApiMeta, ApiSuccess } from "@linko/contracts"

/** Builds the one response envelope used by the HTTP boundary. */
export class ApiResponse {
    /** Build a successful API response. */
    static ok<T>(data: T, meta: ApiMeta | null = null): ApiSuccess<T> {
        return { success: true, data, error: null, meta }
    }

    /** Build a failed API response. */
    static fail(error: ApiErrorBody): ApiFailure {
        return { success: false, data: null, error, meta: null }
    }
}
