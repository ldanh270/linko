/**
 * @file ApiResponse.ts
 * @module backend/shared/http/ApiResponse
 * @description Standard factory for generating uniform success and failure envelopes across all HTTP boundaries.
 */

import type { ApiErrorBody, ApiFailure, ApiMeta, ApiSuccess } from "@linko/contracts"

/**
 * Factory for creating standardized API response envelopes conforming to Linko contracts.
 * Enforces the `{ success, data, error, meta }` envelope pattern across all routes.
 */
export class ApiResponse {
    /**
     * Constructs a canonical successful API response envelope.
     *
     * @template T - The response data type.
     * @param data - The payload to enclose in the response.
     * @param meta - Optional pagination, cursor, or count metadata (defaults to null).
     * @returns The standard ApiSuccess envelope with success: true and error: null.
     */
    static ok<T>(data: T, meta: ApiMeta | null = null): ApiSuccess<T> {
        return { success: true, data, error: null, meta }
    }

    /**
     * Constructs a canonical error API response envelope.
     *
     * @param error - The standardized error body containing code, message, and tracing information.
     * @returns The standard ApiFailure envelope with success: false and data: null.
     */
    static fail(error: ApiErrorBody): ApiFailure {
        return { success: false, data: null, error, meta: null }
    }
}

