import { ERROR_CODES } from "@linko/contracts"
import mongoose, { type HydratedDocument } from "mongoose"

import { ConflictException } from "../../shared/errors/ConflictException"
import { softDelete } from "../../shared/persistence/softDeletePlugin"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import Session from "../../models/Session"
import User, { type UserType } from "../../models/User"
import { AUTH_FIELDS, AUTH_MESSAGES } from "./auth.constants"
import type {
    AuthRepository,
    AuthSessionRecord,
    AuthUserIdentity,
    AuthUserRecord,
    CreateAuthSessionInput,
    CreateAuthUserInput,
} from "./auth.types"

/** Isolate auth persistence and translate only known account uniqueness failures.
 *
 * @pattern Repository
 * @layer Repository
 */
export class MongooseAuthRepository implements AuthRepository {
    /** Find an active account that conflicts with either unique signup identifier. */
    async findUserConflict(username: string, email: string): Promise<AuthUserIdentity | null> {
        const user = await User.findOne({
            $or: [
                { [AUTH_FIELDS.USERNAME]: username },
                { [AUTH_FIELDS.EMAIL]: email },
            ],
        })
        return user ? {
            [AUTH_FIELDS.USERNAME]: user[AUTH_FIELDS.USERNAME],
            [AUTH_FIELDS.EMAIL]: user[AUTH_FIELDS.EMAIL],
        } : null
    }

    /** Load one active account by its normalized username. */
    async findUserByUsername(username: string): Promise<AuthUserRecord | null> {
        const user = await User.findOne({ [AUTH_FIELDS.USERNAME]: username })
        return user ? this.toAuthUserRecord(user) : null
    }

    /** Load one active account by ObjectId, optionally in the caller's transaction. */
    async findUserById(userId: string, transaction?: TransactionContext): Promise<AuthUserRecord | null> {
        const query = User.findById(userId)
        if (transaction) query.session(transaction.session)
        const user = await query
        return user ? this.toAuthUserRecord(user) : null
    }

    /** Insert an account and translate a unique-index race into a stable conflict. */
    async createUser(input: CreateAuthUserInput): Promise<AuthUserRecord> {
        try {
            const user = await User.create({
                [AUTH_FIELDS.USERNAME]: input.username,
                [AUTH_FIELDS.EMAIL]: input.email,
                [AUTH_FIELDS.DISPLAY_NAME]: input.displayName,
                [AUTH_FIELDS.HASHED_PASSWORD]: input.hashedPassword,
            })
            return this.toAuthUserRecord(user)
        } catch (error) {
            const conflict = this.toUniqueAccountConflict(error)
            if (conflict) throw conflict
            throw error
        }
    }

    /** Insert a refresh session using the caller's transaction when provided. */
    async createSession(input: CreateAuthSessionInput, transaction?: TransactionContext): Promise<void> {
        const session = {
            [AUTH_FIELDS.USER_ID]: new mongoose.Types.ObjectId(input.userId),
            [AUTH_FIELDS.REFRESH_TOKEN_HASH]: input.refreshTokenHash,
            [AUTH_FIELDS.EXPIRES_AT]: input.expiresAt,
        }
        if (transaction) {
            await Session.create([session], { session: transaction.session })
            return
        }
        await Session.create(session)
    }

    /** Atomically mark a live refresh session consumed and return its account id. */
    async consumeSession(
        refreshTokenHash: string,
        now: Date,
        transaction: TransactionContext,
    ): Promise<AuthSessionRecord | null> {
        const session = await Session.findOneAndUpdate(
            {
                [AUTH_FIELDS.REFRESH_TOKEN_HASH]: refreshTokenHash,
                [AUTH_FIELDS.EXPIRES_AT]: { $gt: now },
            },
            { $set: { [AUTH_FIELDS.DELETED]: true } },
            { returnDocument: "after", session: transaction.session },
        ).select({ [AUTH_FIELDS.USER_ID]: 1 })

        return session ? { userId: session.userId.toString() } : null
    }

    /** Soft-delete a session by its token hash; repeated revocation is safe. */
    async revokeSession(refreshTokenHash: string): Promise<void> {
        await softDelete(Session, { [AUTH_FIELDS.REFRESH_TOKEN_HASH]: refreshTokenHash })
    }

    private toAuthUserRecord(user: HydratedDocument<UserType>): AuthUserRecord {
            return {
                [AUTH_FIELDS.ID]: user._id.toString(),
                [AUTH_FIELDS.USERNAME]: user[AUTH_FIELDS.USERNAME],
                [AUTH_FIELDS.EMAIL]: user[AUTH_FIELDS.EMAIL],
                [AUTH_FIELDS.DISPLAY_NAME]: user[AUTH_FIELDS.DISPLAY_NAME],
                [AUTH_FIELDS.HASHED_PASSWORD]: user[AUTH_FIELDS.HASHED_PASSWORD],
            }
    }

    private toUniqueAccountConflict(error: unknown): ConflictException | null {
        if (!this.isDuplicateKeyError(error)) return null
        if (error.keyPattern && AUTH_FIELDS.USERNAME in error.keyPattern) {
            return new ConflictException(ERROR_CODES.USERNAME_TAKEN, AUTH_MESSAGES.USERNAME_TAKEN)
        }
        if (error.keyPattern && AUTH_FIELDS.EMAIL in error.keyPattern) {
            return new ConflictException(ERROR_CODES.EMAIL_TAKEN, AUTH_MESSAGES.EMAIL_TAKEN)
        }
        return new ConflictException(ERROR_CODES.CONFLICT, AUTH_MESSAGES.ACCOUNT_TAKEN)
    }

    private isDuplicateKeyError(error: unknown): error is { readonly code: number; readonly keyPattern?: Record<string, unknown> } {
        return typeof error === "object" && error !== null && "code" in error && error.code === 11000
    }
}
