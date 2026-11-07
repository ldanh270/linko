/**
 * @file client.ts
 * @module frontend/shared/http/client
 * @description Standard HTTP client wrapper for Linko API communication.
 * Handles envelope unwrapping, automatic Bearer header injection, 401 unauthorized recovery retry,
 * and normalized error transformation.
 */

import { ApiError, HTTP_ERROR } from "./ApiError"
import { API_ORIGIN } from "./apiOrigin"

/**
 * Request options accepted by the shared HTTP client.
 *
 * @property path - Relative API route endpoint (e.g., '/api/messages').
 * @property body - Optional request body payload (JSON-serializable object or FormData).
 */
export interface RequestOptions extends Omit<RequestInit, "body"> {
  path: string
  body?: unknown
}

/**
 * Callback providing dynamic authorization headers (e.g. Bearer access token).
 */
export type AuthHeaderProvider = () => Promise<HeadersInit | undefined> | HeadersInit | undefined

/**
 * Callback providing automatic token recovery when a 401 Unauthorized status is received.
 * Returns true if refresh succeeded and request should be retried once.
 */
export type UnauthorizedRecovery = () => Promise<boolean>

/**
 * Centralized API Client enforcing uniform envelope decoding and secure network transports.
 */
export class ApiClient {
  /**
   * Constructs an instance of ApiClient.
   *
   * @param baseUrl - Base API origin URL (defaults to configured API_ORIGIN).
   * @param getAuthHeaders - Optional function to retrieve authentication headers.
   * @param recoverUnauthorized - Optional function to attempt token refresh upon 401 errors.
   */
  constructor(
    private readonly baseUrl = API_ORIGIN,
    private readonly getAuthHeaders?: AuthHeaderProvider,
    private readonly recoverUnauthorized?: UnauthorizedRecovery,
  ) {}

  /**
   * Performs an HTTP request and unwraps the response from the `{ success, data, error, meta }` envelope.
   *
   * @template T - Expected data payload type.
   * @param options - Request options including path, body, headers, method.
   * @returns Resolves to payload data of type T.
   * @throws {ApiError} When network fails, server returns 4xx/5xx, or envelope indicates failure.
   */
  async request<T>({ path, body, headers, ...options }: RequestOptions): Promise<T> {
    return this.requestOnce({ path, body, headers, ...options }, false)
  }

  /**
   * Performs an HTTP request expecting a binary Blob response (e.g., file attachments or downloads).
   * Applies identical authentication, retry, and error normalization rules as JSON calls.
   *
   * @param requestOptions - Request options including path and method.
   * @returns Resolves to binary Blob payload.
   * @throws {ApiError} When server returns an error.
   */
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
