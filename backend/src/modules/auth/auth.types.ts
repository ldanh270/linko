import type { LoginInput, SignupInput, UserDto } from "@linko/contracts"

import type { TransactionContext } from "../../shared/persistence/withTransaction"

/** Internal account data required by authentication rules; never returned to clients. */
export interface AuthUserRecord {
    readonly id: string
    readonly username: string
    readonly email: string
    readonly displayName: string
    readonly hashedPassword: string
}

/** Account identity fields used to choose a stable duplicate error code. */
export interface AuthUserIdentity {
    readonly username: string
    readonly email: string
}

/** Persisted refresh-session information needed to issue a replacement token. */
export interface AuthSessionRecord {
    readonly userId: string
}

/** Data needed to create an account without exposing persistence fields to the service. */
export interface CreateAuthUserInput extends Omit<SignupInput, "password"> {
    readonly hashedPassword: string
}

/** Data persisted for one hashed refresh session. */
export interface CreateAuthSessionInput {
    readonly userId: string
    readonly refreshTokenHash: string
    readonly expiresAt: Date
}

/** Access and refresh credentials exchanged only inside the backend boundary. */
export interface AuthTokens {
    readonly accessToken: string
    readonly refreshToken: string
}

/** Persistence operations required by authentication use cases. */
export interface AuthRepository {
    /** Find a conflicting active username or email. */
    findUserConflict(username: string, email: string): Promise<AuthUserIdentity | null>
    /** Find an active user by normalized username. */
    findUserByUsername(username: string): Promise<AuthUserRecord | null>
    /** Find an active user by ObjectId, optionally in a transaction. */
    findUserById(userId: string, transaction?: TransactionContext): Promise<AuthUserRecord | null>
    /** Create a persisted account from validated fields and a password hash. */
    createUser(input: CreateAuthUserInput): Promise<AuthUserRecord>
    /** Create a hashed refresh session. */
    createSession(input: CreateAuthSessionInput, transaction?: TransactionContext): Promise<void>
    /** Consume one unexpired session and return its owner. */
    consumeSession(
        refreshTokenHash: string,
        now: Date,
        transaction: TransactionContext,
    ): Promise<AuthSessionRecord | null>
    /** Soft-delete a session by token hash. */
    revokeSession(refreshTokenHash: string): Promise<void>
}

/** Hash passwords at the authentication boundary without coupling the service to bcrypt. */
export interface PasswordHasher {
    /** Hash a raw password for safe persistence. */
    hash(password: string): Promise<string>
    /** Verify a candidate against its persisted hash. */
    verify(password: string, hashedPassword: string): Promise<boolean>
}

/** Issue, generate, and hash authentication tokens without exposing storage details. */
export interface AuthTokenProvider {
    /** Create a signed access credential. */
    createAccessToken(userId: string): string
    /** Generate a new opaque refresh credential. */
    createRefreshToken(): string
    /** Hash a refresh credential before persistence. */
    hashRefreshToken(refreshToken: string): string
}

/** Execute a transaction chosen by a service use case. */
export interface AuthTransactionRunner {
    /** Run an operation atomically and return its result. */
    run<T>(operation: (transaction: TransactionContext) => Promise<T>): Promise<T>
}

/** Provide a deterministic UTC clock to auth business rules. */
export interface AuthClock {
    /** Return the current UTC time. */
    now(): Date
}

/** Constructor-injected collaborators for the auth use-case service. */
export interface AuthServiceDependencies {
    readonly repository: AuthRepository
    readonly passwordHasher: PasswordHasher
    readonly tokenProvider: AuthTokenProvider
    readonly transactionRunner: AuthTransactionRunner
    readonly clock: AuthClock
}

/** Public request and response contracts consumed by the auth service. */
export type { LoginInput, SignupInput, UserDto }
