/**
 * @file ApiError.ts
 * @module frontend/shared/http/ApiError
 * @description Standard client-side error representation normalizing HTTP status codes,
 * failure envelopes, and connection drops.
 */

import type { ApiFailure } from "@linko/contracts"

/**
 * Common fallback transport error messages and identifiers.
 */
export const HTTP_ERROR = {
  GENERIC_MESSAGE: "Something went wrong",
  INTERNAL: "INTERNAL",
  HTTP: "HTTP_ERROR",
  NETWORK: "NETWORK_ERROR",
  INVALID_RESPONSE: "INVALID_RESPONSE",
} as const

/**
 * Standard client exception class normalizing server and transport errors.
 * Guarantees a stable machine-readable `code` and user-friendly `message`.
 *
 * @property code - Stable error code string.
 * @property message - Human-readable error message.
 * @property status - HTTP status code (0 for network disconnection).
 * @property requestId - Unique request tracing ID if supplied by server.
 * @property details - Structured validation error details if provided.
 */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly requestId?: string,
    public readonly details?: Record<string, unknown> | null,
  ) {
    super(message)
    this.name = "ApiError"
  }

  /**
   * Constructs a typed ApiError from a raw Fetch API Response and parsed body.
   *
   * @param response - The Fetch Response object.
   * @param body - The parsed JSON body payload or null.
   * @returns Normalized ApiError instance.
   */
  static fromResponse(response: Response, body: unknown): ApiError {
    if (response.status >= 500) {
      return new ApiError(HTTP_ERROR.INTERNAL, HTTP_ERROR.GENERIC_MESSAGE, response.status, isApiFailure(body) ? body.error.requestId : undefined)
    }
    if (isApiFailure(body)) {
      return new ApiError(body.error.code, body.error.message, response.status, body.error.requestId, body.error.details)
    }
    return new ApiError(HTTP_ERROR.HTTP, HTTP_ERROR.GENERIC_MESSAGE, response.status)
  }
}


/** Narrow unknown JSON to the documented failure envelope. */
function isApiFailure(value: unknown): value is ApiFailure {
  if (typeof value !== "object" || value === null || !("error" in value)) return false
  const error = value.error
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" && "message" in error && typeof error.message === "string"
}
