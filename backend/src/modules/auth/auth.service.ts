import { ERROR_CODES } from "@linko/contracts"

import { ConflictException } from "../../shared/errors/ConflictException"
import { UnauthorizedException } from "../../shared/errors/UnauthorizedException"
import { AUTH_FIELDS, AUTH_MESSAGES, AUTH_SECURITY } from "./auth.constants"
import type {
    AuthServiceDependencies,
    AuthTokens,
    LoginInput,
    SignupInput,
    UserDto,
} from "./auth.types"

/** Apply authentication rules while keeping persistence and transport at the boundaries.
 *
 * Refresh consumes the old session and creates its replacement in one transaction, making
 * concurrent replay attempts resolve to a single successful rotation.
 *
 * @layer Service
 */
export class AuthService {
    /** Wire persistence, password, token, transaction, and clock collaborators. */
    constructor(private readonly dependencies: AuthServiceDependencies) {}

    /** Create a user after checking both unique account identifiers. */
    async signup(input: SignupInput): Promise<UserDto> {
        const existing = await this.dependencies.repository.findUserConflict(
            input[AUTH_FIELDS.USERNAME],
            input[AUTH_FIELDS.EMAIL],
        )
        if (existing) throw this.createDuplicateException(input, existing)

        const user = await this.dependencies.repository.createUser({
            username: input[AUTH_FIELDS.USERNAME],
            email: input[AUTH_FIELDS.EMAIL],
            displayName: input[AUTH_FIELDS.DISPLAY_NAME],
            hashedPassword: await this.dependencies.passwordHasher.hash(input[AUTH_FIELDS.PASSWORD]),
        })

        return this.toUserDto(user)
    }

    /** Verify a password and issue one access token plus a persisted refresh session. */
    async login(input: LoginInput): Promise<AuthTokens> {
        const user = await this.dependencies.repository.findUserByUsername(input[AUTH_FIELDS.USERNAME])
        if (!user || !(await this.dependencies.passwordHasher.verify(
            input[AUTH_FIELDS.PASSWORD],
            user[AUTH_FIELDS.HASHED_PASSWORD],
        ))) {
            throw new UnauthorizedException(ERROR_CODES.INVALID_CREDENTIALS, AUTH_MESSAGES.INVALID_CREDENTIALS)
        }

        const refreshToken = this.dependencies.tokenProvider.createRefreshToken()
        const accessToken = this.dependencies.tokenProvider.createAccessToken(user[AUTH_FIELDS.ID])
        await this.dependencies.repository.createSession({
            userId: user[AUTH_FIELDS.ID],
            refreshTokenHash: this.dependencies.tokenProvider.hashRefreshToken(refreshToken),
            expiresAt: this.addRefreshTokenLifetime(this.dependencies.clock.now()),
        })

        return { accessToken, refreshToken }
    }

    /** Atomically consume a valid refresh token and issue a replacement pair. */
    async refresh(refreshToken: string): Promise<AuthTokens> {
        const refreshTokenHash = this.dependencies.tokenProvider.hashRefreshToken(refreshToken)
        const now = this.dependencies.clock.now()
        const tokens = await this.dependencies.transactionRunner.run(async (transaction) => {
            const session = await this.dependencies.repository.consumeSession(refreshTokenHash, now, transaction)
            if (!session) return null

            const user = await this.dependencies.repository.findUserById(session[AUTH_FIELDS.USER_ID], transaction)
            if (!user) return null

            const rotatedRefreshToken = this.dependencies.tokenProvider.createRefreshToken()
            const nextTokens = {
                accessToken: this.dependencies.tokenProvider.createAccessToken(user[AUTH_FIELDS.ID]),
                refreshToken: rotatedRefreshToken,
            }
            await this.dependencies.repository.createSession({
                userId: user[AUTH_FIELDS.ID],
                refreshTokenHash: this.dependencies.tokenProvider.hashRefreshToken(rotatedRefreshToken),
                expiresAt: this.addRefreshTokenLifetime(now),
            }, transaction)
            return nextTokens
        })

        if (!tokens) {
            throw new UnauthorizedException(ERROR_CODES.INVALID_SESSION, AUTH_MESSAGES.INVALID_SESSION)
        }
        return tokens
    }

    /** Revoke one refresh session; absent and expired sessions are already logged out. */
    async logout(refreshToken: string): Promise<void> {
        await this.dependencies.repository.revokeSession(
            this.dependencies.tokenProvider.hashRefreshToken(refreshToken),
        )
    }

    private createDuplicateException(
        input: SignupInput,
        existing: { readonly username: string; readonly email: string },
    ): ConflictException {
        if (existing[AUTH_FIELDS.USERNAME] === input[AUTH_FIELDS.USERNAME]) {
            return new ConflictException(ERROR_CODES.USERNAME_TAKEN, AUTH_MESSAGES.USERNAME_TAKEN)
        }
        return new ConflictException(ERROR_CODES.EMAIL_TAKEN, AUTH_MESSAGES.EMAIL_TAKEN)
    }

    private toUserDto(user: { readonly id: string; readonly username: string; readonly displayName: string; readonly email: string }): UserDto {
        return {
            [AUTH_FIELDS.ID]: user[AUTH_FIELDS.ID],
            [AUTH_FIELDS.USERNAME]: user[AUTH_FIELDS.USERNAME],
            [AUTH_FIELDS.DISPLAY_NAME]: user[AUTH_FIELDS.DISPLAY_NAME],
            [AUTH_FIELDS.EMAIL]: user[AUTH_FIELDS.EMAIL],
        }
    }

    private addRefreshTokenLifetime(now: Date): Date {
        return new Date(now.getTime() + AUTH_SECURITY.REFRESH_TOKEN_TTL_MS)
    }
}
