import type { ApiFailure } from "@linko/contracts"

/** Safe client-facing transport messages and codes. */
export const HTTP_ERROR = {
  GENERIC_MESSAGE: "Something went wrong",
  INTERNAL: "INTERNAL",
  HTTP: "HTTP_ERROR",
  NETWORK: "NETWORK_ERROR",
  INVALID_RESPONSE: "INVALID_RESPONSE",
} as const

/** Describe a normalized API failure without exposing raw server internals. */
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

  /** Convert a response envelope into a stable client error. */
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
