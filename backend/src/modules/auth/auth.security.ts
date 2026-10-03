import bcrypt from "bcrypt"
import { createHash, randomBytes } from "node:crypto"
import jwt from "jsonwebtoken"

import { AUTH_FIELDS, AUTH_SECURITY } from "./auth.constants"
import type { AuthTokenProvider, PasswordHasher } from "./auth.types"

/** Use bcrypt for password storage and verification. */
export class BcryptPasswordHasher implements PasswordHasher {
    /** Hash a password using the configured work factor. */
    hash(password: string): Promise<string> {
        return bcrypt.hash(password, AUTH_SECURITY.PASSWORD_HASH_COST)
    }

    /** Compare a candidate password with its stored bcrypt hash. */
    verify(password: string, hashedPassword: string): Promise<boolean> {
        return bcrypt.compare(password, hashedPassword)
    }
}

/** Create signed access credentials and opaque, hashable refresh credentials. */
export class AuthTokenService implements AuthTokenProvider {
    /** Create a token issuer from the validated deployment secret. */
    constructor(private readonly accessTokenSecret: string) {}

    /** Sign an access token for one user identifier. */
    createAccessToken(userId: string): string {
        return jwt.sign(
            { [AUTH_FIELDS.USER_ID]: userId },
            this.accessTokenSecret,
            {
                expiresIn: AUTH_SECURITY.ACCESS_TOKEN_TTL,
                issuer: AUTH_SECURITY.ACCESS_TOKEN_ISSUER,
                audience: AUTH_SECURITY.ACCESS_TOKEN_AUDIENCE,
            },
        )
    }

    /** Generate a high-entropy refresh token for the HttpOnly cookie. */
    createRefreshToken(): string {
        return randomBytes(AUTH_SECURITY.REFRESH_TOKEN_BYTES).toString("hex")
    }

    /** Hash a refresh token before it crosses into persistence. */
    hashRefreshToken(refreshToken: string): string {
        return createHash(AUTH_SECURITY.HASH_ALGORITHM).update(refreshToken).digest("hex")
    }
}
