import { ERROR_CODES } from "@linko/contracts"
import { describe, expect, it, vi } from "vitest"

import { ConflictException } from "../../shared/errors/ConflictException"
import { UnauthorizedException } from "../../shared/errors/UnauthorizedException"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import type { AuthRepository, AuthServiceDependencies, AuthUserRecord } from "./auth.types"
import { AuthService } from "./auth.service"

const USER_ID = "64b000000000000000000001"
const REFRESH_TOKEN = "initial-refresh-token"
const AUTH_USER: AuthUserRecord = {
    id: USER_ID,
    username: "reader",
    email: "reader@example.com",
    displayName: "Reader",
    hashedPassword: "stored-password-hash",
}

/** Build isolated service collaborators for each business-rule test. */
function createDependencies(repositoryOverrides: Partial<AuthRepository> = {}) {
    const repository: AuthRepository = {
        findUserConflict: vi.fn().mockResolvedValue(null),
        findUserByUsername: vi.fn().mockResolvedValue(AUTH_USER),
        findUserById: vi.fn().mockResolvedValue(AUTH_USER),
        createUser: vi.fn().mockResolvedValue(AUTH_USER),
        createSession: vi.fn().mockResolvedValue(undefined),
        consumeSession: vi.fn().mockResolvedValue({ userId: USER_ID }),
        revokeSession: vi.fn().mockResolvedValue(undefined),
        ...repositoryOverrides,
    }
    const passwordHasher = {
        hash: vi.fn().mockResolvedValue("new-password-hash"),
        verify: vi.fn().mockResolvedValue(true),
    }
    const tokenProvider = {
        createAccessToken: vi.fn().mockReturnValue("access-token"),
        createRefreshToken: vi.fn().mockReturnValue("rotated-refresh-token"),
        hashRefreshToken: vi.fn((token: string) => `hashed:${token}`),
    }
    const transactionRunner: AuthServiceDependencies["transactionRunner"] = {
        async run<T>(operation: (transaction: TransactionContext) => Promise<T>): Promise<T> {
            return operation({} as TransactionContext)
        },
    }
    const clock = { now: vi.fn(() => new Date("2026-10-03T00:00:00.000Z")) }
    const dependencies: AuthServiceDependencies = { repository, passwordHasher, tokenProvider, transactionRunner, clock }

    return {
        service: new AuthService(dependencies),
        repository,
    }
}

describe("AuthService business rules", () => {
    it("should_reject_duplicate_username_with_conflict_code", async () => {
        const { service, repository } = createDependencies({
            findUserConflict: vi.fn().mockResolvedValue({ username: "reader", email: "other@example.com" }),
        })

        const error = await service.signup({
            username: "reader",
            password: "ValidPass1!",
            email: "reader@example.com",
            displayName: "Reader",
        }).catch((caught: unknown) => caught)

        expect(error).toBeInstanceOf(ConflictException)
        expect(error).toMatchObject({ code: ERROR_CODES.USERNAME_TAKEN, httpStatus: 409 })
        expect(repository.createUser).not.toHaveBeenCalled()
    })

    it("should_rotate_refresh_token_once", async () => {
        const { service, repository } = createDependencies({
            consumeSession: vi.fn()
                .mockResolvedValueOnce({ userId: USER_ID })
                .mockResolvedValueOnce(null),
        })

        const rotated = await service.refresh(REFRESH_TOKEN)

        expect(rotated.refreshToken).toBe("rotated-refresh-token")
        const replayError = await service.refresh(REFRESH_TOKEN).catch((caught: unknown) => caught)
        expect(replayError).toBeInstanceOf(UnauthorizedException)
        expect(replayError).toMatchObject({ code: ERROR_CODES.INVALID_SESSION })
        expect(repository.createSession).toHaveBeenCalledTimes(1)
    })

    it("should_invalidate_session_on_logout", async () => {
        let isSessionActive = true
        const { service } = createDependencies({
            consumeSession: vi.fn(async () => isSessionActive ? { userId: USER_ID } : null),
            revokeSession: vi.fn(async () => { isSessionActive = false }),
        })

        await service.logout(REFRESH_TOKEN)

        const replayError = await service.refresh(REFRESH_TOKEN).catch((caught: unknown) => caught)
        expect(replayError).toBeInstanceOf(UnauthorizedException)
        expect(replayError).toMatchObject({ code: ERROR_CODES.INVALID_SESSION })
    })
})
