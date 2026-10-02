import { API_ROUTES, ERROR_CODES } from "@linko/contracts"
import cookieParser from "cookie-parser"
import express, { type Express } from "express"
import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { MAX_UPLOAD_FILE_SIZE_BYTES } from "../../configs/uploadPolicy.config"
import User from "../../models/User"
import { AuthTokenService } from "../auth/auth.security"
import { createAuthenticate } from "../../middlewares/route.middleware"
import { ProfileController } from "./profile.controller"
import { PROFILE_ROUTE_PARAMS, PROFILE_ROUTE_PATHS } from "./profile.constants"
import userRoutes from "../../routes/user.route"
import { MongooseProfileRepository } from "./profile.repository"
import { createProfileRouter } from "./profile.route"
import { ProfileService } from "./profile.service"
import type {
    ProfileImageCleanupFailureRecorder,
    ProfileImageRecord,
    ProfileImageStorage,
} from "./profile.types"
import { createGlobalErrorHandler } from "../../shared/middlewares/globalErrorHandler"
import { createLogger } from "../../shared/logger/logger"
import { withRequestContext } from "../../shared/middlewares/requestContext"

const TEST_TOKEN_SECRET = "profile-route-tests-use-a-sufficiently-long-secret"
const TEST_WIRED_TIGER_CACHE_SIZE_GB = "0.25"
const REPLACEMENT_IMAGE: ProfileImageRecord = {
    url: "https://media.example/profiles/new-avatar.jpg",
    id: "r2:avatars/new-avatar.jpg",
}

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger",
            args: [`--wiredTigerCacheSizeGB=${TEST_WIRED_TIGER_CACHE_SIZE_GB}`],
        },
    })
    await mongoose.connect(replicaSet.getUri(), { dbName: "profile-route-test" })
    await User.init()
})

beforeEach(async () => {
    await User.collection.deleteMany({})
})

afterAll(async () => {
    await mongoose.disconnect()
    await replicaSet?.stop()
})

/** Build authenticated profile routes with real MongoDB persistence and replaceable object storage. */
function createTestApp(options: { readonly imageStorage?: ProfileImageStorage } = {}): Express {
    const logger = createLogger(() => undefined)
    const imageStorage = options.imageStorage ?? createImageStorage()
    const cleanupFailureRecorder: ProfileImageCleanupFailureRecorder = { recordFailure: vi.fn() }
    const service = new ProfileService({
        repository: new MongooseProfileRepository(),
        imageStorage,
        cleanupFailureRecorder,
    })
    const app = express()
    app.use(withRequestContext)
    app.use(express.json())
    app.use(cookieParser())
    app.use(createAuthenticate(TEST_TOKEN_SECRET))
    app.use(API_ROUTES.USERS, userRoutes)
    app.use(API_ROUTES.USERS, createProfileRouter(new ProfileController(service)))
    app.use(createGlobalErrorHandler(logger))
    return app
}

/** Build replaceable profile image storage for route scenarios without R2 access. */
function createImageStorage(overrides: Partial<ProfileImageStorage> = {}): ProfileImageStorage {
    return {
        upload: vi.fn().mockResolvedValue(REPLACEMENT_IMAGE),
        delete: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    }
}

/** Create a persisted profile and a matching bearer token. */
async function createAccount(suffix: string): Promise<{ readonly id: string; readonly token: string }> {
    const user = await User.create({
        username: `profile_${suffix}`,
        email: `profile_${suffix}@example.com`,
        displayName: `Profile ${suffix}`,
        phone: "+8490000000",
        bio: "Original biography",
        hashedPassword: "profile-test-hash",
    })
    const token = new AuthTokenService(TEST_TOKEN_SECRET).createAccessToken(user._id.toString())
    return { id: user._id.toString(), token }
}

/** Return the authenticated user's private profile path. */
function minePath(): string {
    return `${API_ROUTES.USERS}${PROFILE_ROUTE_PATHS.ME}`
}

/** Return the authenticated user's public-profile route path. */
function publicProfilePath(userId: string): string {
    return `${API_ROUTES.USERS}${PROFILE_ROUTE_PATHS.BY_ID.replace(`:${PROFILE_ROUTE_PARAMS.USER_ID}`, userId)}`
}

describe("profile HTTP routes", () => {
    it("should_return_private_profile_without_password_or_audit_fields", async () => {
        const account = await createAccount("owner")

        const response = await request(createTestApp())
            .get(minePath())
            .set("Authorization", `Bearer ${account.token}`)

        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
            success: true,
            data: {
                id: account.id,
                username: "profile_owner",
                email: "profile_owner@example.com",
                phone: "+8490000000",
                bio: "Original biography",
            },
            error: null,
            meta: null,
        })
        expect(response.body.data).not.toHaveProperty("hashedPassword")
        expect(response.body.data).not.toHaveProperty("createdBy")
        expect(response.body.data).not.toHaveProperty("createdIp")
        expect(response.body.data).not.toHaveProperty("delFlag")
    })

    it("should_return_public_profile_without_email_or_phone", async () => {
        const account = await createAccount("public")

        const response = await request(createTestApp())
            .get(publicProfilePath(account.id))
            .set("Authorization", `Bearer ${account.token}`)

        expect(response.status).toBe(200)
        expect(response.body.data).toMatchObject({ id: account.id, username: "profile_public" })
        expect(response.body.data).not.toHaveProperty("email")
        expect(response.body.data).not.toHaveProperty("phone")
    })

    it("should_reject_profile_routes_without_authentication", async () => {
        const response = await request(createTestApp()).get(minePath())

        expect(response.status).toBe(401)
        expect(response.body.error.code).toBe(ERROR_CODES.UNAUTHORIZED)
    })

    it.each(["image/jpeg", "image/png", "image/webp"]) (
        "should_accept_%s_profile_images_within_size_limit",
        async (mimeType) => {
            const account = await createAccount(mimeType.replace("/", "_"))
            const imageStorage = createImageStorage()
            const response = await request(createTestApp({ imageStorage }))
                .patch(minePath())
                .set("Authorization", `Bearer ${account.token}`)
                .field("displayName", "Updated profile")
                .attach("avatar", Buffer.from("test-image-bytes"), { filename: "avatar", contentType: mimeType })

            expect(response.status).toBe(200)
            expect(response.body.data.avatarUrl).toBe(REPLACEMENT_IMAGE.url)
            expect(imageStorage.upload).toHaveBeenCalledOnce()
        },
    )

    it("should_reject_profile_image_larger_than_ten_mib", async () => {
        const account = await createAccount("large")
        const response = await request(createTestApp())
            .patch(minePath())
            .set("Authorization", `Bearer ${account.token}`)
            .attach("avatar", Buffer.alloc(MAX_UPLOAD_FILE_SIZE_BYTES + 1), {
                filename: "large.jpg",
                contentType: "image/jpeg",
            })

        expect(response.status).toBe(400)
        expect(response.body.error.code).toBe(ERROR_CODES.VALIDATION)
    })

    it("should_reject_duplicate_email_without_uploading_or_persisting", async () => {
        const account = await createAccount("email")
        await createAccount("taken")
        const imageStorage = createImageStorage()
        const response = await request(createTestApp({ imageStorage }))
            .patch(minePath())
            .set("Authorization", `Bearer ${account.token}`)
            .field("email", "profile_taken@example.com")
            .attach("avatar", Buffer.from("test-image-bytes"), {
                filename: "avatar.png",
                contentType: "image/png",
            })
        const savedUser = await User.findById(account.id)

        expect(response.status).toBe(409)
        expect(response.body.error.code).toBe(ERROR_CODES.EMAIL_TAKEN)
        expect(savedUser?.email).toBe("profile_email@example.com")
        expect(imageStorage.upload).not.toHaveBeenCalled()
    })

    it("should_reject_duplicate_username", async () => {
        const account = await createAccount("username")
        await createAccount("other")

        const response = await request(createTestApp())
            .patch(minePath())
            .set("Authorization", `Bearer ${account.token}`)
            .field("username", "profile_other")

        expect(response.status).toBe(409)
        expect(response.body.error.code).toBe(ERROR_CODES.USERNAME_TAKEN)
    })

    it("should_allow_bio_to_be_cleared_without_changing_other_fields", async () => {
        const account = await createAccount("clear")

        const response = await request(createTestApp())
            .patch(minePath())
            .set("Authorization", `Bearer ${account.token}`)
            .field("bio", "")

        expect(response.status).toBe(200)
        expect(response.body.data.bio).toBeNull()
        expect(response.body.data.displayName).toBe("Profile clear")
    })

    it("should_return_a_generic_500_when_r2_upload_fails", async () => {
        const account = await createAccount("r2")
        const imageStorage = createImageStorage({
            upload: vi.fn().mockRejectedValue(new Error("private R2 account credential")),
        })
        const response = await request(createTestApp({ imageStorage }))
            .patch(minePath())
            .set("Authorization", `Bearer ${account.token}`)
            .field("displayName", "Should not persist")
            .attach("avatar", Buffer.from("test-image-bytes"), {
                filename: "avatar.png",
                contentType: "image/png",
            })
        const savedUser = await User.findById(account.id)

        expect(response.status).toBe(500)
        expect(response.body.error.code).toBe(ERROR_CODES.INTERNAL)
        expect(response.body.error.message).toBe("Internal server error")
        expect(JSON.stringify(response.body)).not.toContain("credential")
        expect(savedUser?.displayName).toBe("Profile r2")
    })
})




describe("profile route composition", () => {
    it("should_keep_the_existing_user_search_route_reachable", async () => {
        const account = await createAccount("search")
        const response = await request(createTestApp())
            .get(`${API_ROUTES.USERS}${PROFILE_ROUTE_PATHS.SEARCH}?keyword=profile_search`)
            .set("Authorization", `Bearer ${account.token}`)
            .send({ type: "TYPING" })

        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty("users")
    })
})
