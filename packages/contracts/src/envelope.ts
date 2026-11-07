/**
 * @file envelope.ts
 * @module @linko/contracts/envelope
 * @description Defines the canonical API response envelopes, error structures, and identifier types
 * shared across Linko's client and server boundaries.
 */

/**
 * A MongoDB ObjectId string representation used across HTTP endpoints and Socket.IO payloads.
 * Conforms to a 24-character hexadecimal string format.
 */
export type EntityId = string;

/**
 * Pagination and cursor metadata returned by list endpoints.
 * Provides auxiliary information such as current page, page size, total item counts, or next cursors.
 */
export type ApiMeta = Record<string, string | number | boolean | null>;

/**
 * The standardized error body contained within API failure envelopes.
 *
 * @property code - Stable, machine-readable application error code (e.g., 'UNAUTHORIZED', 'NOT_FOUND').
 * @property message - Human-readable, client-safe error description.
 * @property details - Optional structured validation failure details or contextual information.
 * @property requestId - Unique correlation ID assigned to the request for tracing and log auditing.
 */
export interface ApiErrorBody {
	code: string;
	message: string;
	details?: Record<string, unknown> | null;
	requestId?: string;
}

/**
 * Canonical success envelope returned by all Linko REST API endpoints upon successful execution.
 *
 * @template T - The type of data payload returned.
 * @property success - Constant discriminator true indicating successful operation.
 * @property data - The primary response payload of type T.
 * @property error - Constant null indicating absence of errors.
 * @property meta - Optional pagination metadata or null.
 */
export interface ApiSuccess<T> {
	success: true;
	data: T;
	error: null;
	meta: ApiMeta | null;
}

/**
 * Canonical failure envelope returned by all Linko REST API endpoints when a request cannot be fulfilled.
 *
 * @property success - Constant discriminator false indicating operation failure.
 * @property data - Constant null indicating no valid data payload is present.
 * @property error - Structured ApiErrorBody containing error code, message, and tracing details.
 * @property meta - Constant null.
 */
export interface ApiFailure {
	success: false;
	data: null;
	error: ApiErrorBody;
	meta: null;
}

/**
 * Unified response envelope type representing either a successful or failed API response.
 *
 * @template T - The expected payload data type on success.
 */
export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;
