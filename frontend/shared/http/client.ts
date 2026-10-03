import { ApiError, HTTP_ERROR } from "./ApiError"

/** Request options accepted by the shared HTTP client. */
export interface RequestOptions extends Omit<RequestInit, "body"> {
  path: string
  body?: unknown
}

/** Inject authorization without binding the foundation to a session store. */
export type AuthHeaderProvider = () => Promise<HeadersInit | undefined> | HeadersInit | undefined

/** Centralize JSON transport and envelope validation for feature APIs. */
export class ApiClient {
  constructor(private readonly baseUrl = "", private readonly getAuthHeaders?: AuthHeaderProvider) {}

  /** Request one API resource and unwrap its success envelope. */
  async request<T>({ path, body, headers, ...options }: RequestOptions): Promise<T> {
    const requestHeaders = new Headers(headers)
    if (body !== undefined) requestHeaders.set("Content-Type", "application/json")
    const authHeaders = await this.getAuthHeaders?.()
    new Headers(authHeaders).forEach((value, key) => requestHeaders.set(key, value))
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers: requestHeaders,
        credentials: options.credentials ?? "include",
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw new ApiError(HTTP_ERROR.NETWORK, HTTP_ERROR.GENERIC_MESSAGE, 0)
    }
    const payload: unknown = await response.json().catch(() => null)
    if (!response.ok) throw ApiError.fromResponse(response, payload)
    if (!isSuccessEnvelope<T>(payload)) throw new ApiError(HTTP_ERROR.INVALID_RESPONSE, HTTP_ERROR.GENERIC_MESSAGE, response.status)
    return payload.data
  }
}

/** Shared unauthenticated transport, configured further by F01. */
export const apiClient = new ApiClient()

/** Check the envelope before returning feature data. */
function isSuccessEnvelope<T>(value: unknown): value is { success: true; data: T } {
  return typeof value === "object" && value !== null && "success" in value && value.success === true && "data" in value
}
