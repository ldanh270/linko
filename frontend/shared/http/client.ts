import { ApiError, HTTP_ERROR } from "./ApiError"

/** Request options accepted by the shared HTTP client. */
export interface RequestOptions extends Omit<RequestInit, "body"> {
  path: string
  body?: unknown
}

/** Inject authorization without binding the foundation to a session store. */
export type AuthHeaderProvider = () => Promise<HeadersInit | undefined> | HeadersInit | undefined

/** Recover one expired authorization before the client retries a request. */
export type UnauthorizedRecovery = () => Promise<boolean>

/** Centralize JSON transport and envelope validation for feature APIs. */
export class ApiClient {
  constructor(
    private readonly baseUrl = "",
    private readonly getAuthHeaders?: AuthHeaderProvider,
    private readonly recoverUnauthorized?: UnauthorizedRecovery,
  ) {}

  /** Request one API resource and unwrap its success envelope. */
  async request<T>({ path, body, headers, ...options }: RequestOptions): Promise<T> {
    return this.requestOnce({ path, body, headers, ...options }, false)
  }

  /** Request a binary response with the same authorization, retry, and error rules as JSON calls. */
  async requestBlob({ path, headers, ...requestOptions }: Omit<RequestOptions, "body">): Promise<Blob> {
    return this.requestBlobOnce({ path, headers, ...requestOptions }, false)
  }

  private async requestOnce<T>(options: RequestOptions, hasRetried: boolean): Promise<T> {
    const { path, body, headers, ...requestOptions } = options
    const requestHeaders = new Headers(headers)
    const multipartBody = isFormDataBody(body)
    if (multipartBody) requestHeaders.delete("Content-Type")
    else if (body !== undefined) requestHeaders.set("Content-Type", "application/json")
    const authHeaders = await this.getAuthHeaders?.()
    new Headers(authHeaders).forEach((value, key) => requestHeaders.set(key, value))
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...requestOptions,
        headers: requestHeaders,
        credentials: requestOptions.credentials ?? "include",
        body: body === undefined ? undefined : multipartBody ? body : JSON.stringify(body),
      })
    } catch {
      throw new ApiError(HTTP_ERROR.NETWORK, HTTP_ERROR.GENERIC_MESSAGE, 0)
    }
    const payload: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      const error = ApiError.fromResponse(response, payload)
      if (response.status === 401 && !hasRetried && await this.recoverUnauthorized?.()) {
        return this.requestOnce(options, true)
      }
      throw error
    }
    if (!isSuccessEnvelope<T>(payload)) throw new ApiError(HTTP_ERROR.INVALID_RESPONSE, HTTP_ERROR.GENERIC_MESSAGE, response.status)
    return payload.data
  }

  private async requestBlobOnce(options: Omit<RequestOptions, "body">, hasRetried: boolean): Promise<Blob> {
    const { path, headers, ...requestOptions } = options
    const requestHeaders = new Headers(headers)
    const authHeaders = await this.getAuthHeaders?.()
    new Headers(authHeaders).forEach((value, key) => requestHeaders.set(key, value))
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...requestOptions,
        headers: requestHeaders,
        credentials: requestOptions.credentials ?? "include",
      })
    } catch (error) {
      if (requestOptions.signal?.aborted) throw error
      throw new ApiError(HTTP_ERROR.NETWORK, HTTP_ERROR.GENERIC_MESSAGE, 0)
    }
    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null)
      const error = ApiError.fromResponse(response, payload)
      if (response.status === 401 && !hasRetried && await this.recoverUnauthorized?.()) {
        return this.requestBlobOnce(options, true)
      }
      throw error
    }
    return response.blob()
  }
}

/** Shared unauthenticated transport, configured further by F01. */
export const apiClient = new ApiClient()

/** Check the envelope before returning feature data. */
function isSuccessEnvelope<T>(value: unknown): value is { success: true; data: T } {
  return typeof value === "object" && value !== null && "success" in value && value.success === true && "data" in value
}

function isFormDataBody(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData
}
