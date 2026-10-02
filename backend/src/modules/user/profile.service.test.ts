import { Types } from "mongoose"
import { describe, expect, it, vi } from "vitest"

import { ERROR_CODES } from "@linko/contracts"

import { ProfileService } from "./profile.service"
import type {
    ProfileImageFile,
    ProfileImageRecord,
    ProfileRecord,
    ProfileRepository,
    ProfileServiceDependencies,
} from "./profile.types"

const createProfileRecord = (overrides: Partial<ProfileRecord> = {}): ProfileRecord => ({
    id: new Types.ObjectId(),
    username: "mira",
    displayName: "Mira",
    email: "mira@example.com",
    phone: null,
    bio: "A short bio",
    avatar: { url: "https://cdn.example/old.jpg", id: "old-avatar" },
    background: null,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-01T00:00:00.000Z"),
    ...overrides,
})

const createImageFile = (mimetype = "image/jpeg"): ProfileImageFile => ({
    buffer: Buffer.from("image-bytes"),
    mimetype,
})

const createDependencies = (record = createProfileRecord()) => {
    const repository: ProfileRepository = {
        findById: vi.fn().mockResolvedValue(record),
        findPublicById: vi.fn().mockResolvedValue(record),
        findByEmail: vi.fn().mockResolvedValue(null),
        findByUsername: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockImplementation(async (_userId, changes) => ({ ...record, ...changes })),
    }
    const imageStorage = {
        upload: vi.fn().mockResolvedValue({ url: "https://cdn.example/new.jpg", id: "new-avatar" } satisfies ProfileImageRecord),
        delete: vi.fn().mockResolvedValue(undefined),
    }
    const cleanupFailureRecorder = { recordFailure: vi.fn() }
    const dependencies: ProfileServiceDependencies = {
        repository,
        imageStorage,
        cleanupFailureRecorder,
    }
    return { dependencies, repository, imageStorage, cleanupFailureRecorder }
}

describe("ProfileService", () => {
    it("should_reject_duplicate_email_without_changing_profile", async () => {
        const record = createProfileRecord()
        const { dependencies, repository, imageStorage } = createDependencies(record)
        vi.mocked(repository.findByEmail).mockResolvedValue(true)
        const service = new ProfileService(dependencies)

        await expect(service.updateMine({
            userId: record.id,
            email: "taken@example.com",
            avatar: createImageFile(),
        })).rejects.toMatchObject({ code: ERROR_CODES.EMAIL_TAKEN })

        expect(repository.update).not.toHaveBeenCalled()
        expect(imageStorage.upload).not.toHaveBeenCalled()
    })

    it("should_reject_unsupported_avatar_before_upload", async () => {
        const record = createProfileRecord()
        const { dependencies, repository, imageStorage } = createDependencies(record)
        const service = new ProfileService(dependencies)

        await expect(service.updateMine({
            userId: record.id,
            avatar: createImageFile("image/gif"),
        })).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })

        expect(imageStorage.upload).not.toHaveBeenCalled()
        expect(repository.update).not.toHaveBeenCalled()
    })

    it("should_persist_replacement_before_deleting_previous_image", async () => {
        const record = createProfileRecord()
        const { dependencies, repository, imageStorage } = createDependencies(record)
        const operations: string[] = []
        vi.mocked(imageStorage.upload).mockImplementation(async () => {
            operations.push("upload")
            return { url: "https://cdn.example/new.jpg", id: "new-avatar" }
        })
        vi.mocked(repository.update).mockImplementation(async (_userId, changes) => {
            operations.push("persist")
            return { ...record, ...changes }
        })
        vi.mocked(imageStorage.delete).mockImplementation(async () => {
            operations.push("delete-old")
        })
        const service = new ProfileService(dependencies)

        const profile = await service.updateMine({ userId: record.id, avatar: createImageFile() })

        expect(operations).toEqual(["upload", "persist", "delete-old"])
        expect(profile.avatarUrl).toBe("https://cdn.example/new.jpg")
    })
})
