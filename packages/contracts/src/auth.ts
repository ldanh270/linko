/**
 * @file auth.ts
 * @module @linko/contracts/auth
 * @description Data transfer objects and request schemas for authentication, registration,
 * and user account identity.
 */

import type { EntityId } from "./envelope";

/**
 * Public, safe user identity returned by authentication and profile endpoints.
 * Sensitive fields (password hashes, refresh tokens, audit fields) are stripped.
 *
 * @property id - Unique user identifier (MongoDB ObjectId string).
 * @property username - Unique user login name.
 * @property displayName - Public display name presented in chats and UI headers.
 * @property email - User's registered contact email address.
 */
export interface UserDto {
	id: EntityId;
	username: string;
	displayName: string;
	email: string;
}

/**
 * Access token payload returned upon successful login, registration, or session refresh.
 * Long-lived refresh tokens are stored exclusively in HttpOnly secure cookies.
 *
 * @property accessToken - Short-lived JSON Web Token (JWT) authorizing API requests.
 */
export interface AuthAccessTokenDto {
	accessToken: string;
}

/**
 * Registration credentials submitted when creating a new account.
 *
 * @property username - Desired unique username (alphanumeric and underscores).
 * @property password - Raw password meeting complexity requirements.
 * @property email - Valid email address for notifications and account recovery.
 * @property displayName - Initial user-facing display name.
 */
export interface SignupInput {
	username: string;
	password: string;
	email: string;
	displayName: string;
}

/**
 * Login credentials submitted during user authentication.
 *
 * @property username - User's account username.
 * @property password - User's raw password.
 */
export interface LoginInput {
	username: string;
	password: string;
}
