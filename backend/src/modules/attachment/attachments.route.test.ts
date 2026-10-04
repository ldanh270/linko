import {
    API_ROUTES,
    ATTACHMENT_LIMITS,
    CONVERSATION_TYPE,
    ERROR_CODES,
    GROUP_FIELDS,
    MESSAGE_ATTACHMENT_FIELDS,
    MESSAGE_FIELDS,
    ROLE,
} from "@linko/contracts"
import cookieParser from "cookie-parser"
import express, { type Express } from "express"
import mongoose from "mongoose"
import { Readable } from "node:stream"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { MAX_UPLOAD_FILE_SIZE_BYTES } from "../../configs/uploadPolicy.config"
import { createAuthenticate } from "../../middlewares/route.middleware"
import Conversation from "../../models/Conversation"
import Friendship from "../../models/Friendship"
import Message from "../../models/Message"
import User from "../../models/User"
import { AuthTokenService } from "../auth/auth.security"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import { MongooseMessageRepository } from "../message/message.repository"
import { createMessageRouter } from "../message/message.route"
import { MessageController } from "../message/message.controller"
import { MessageService } from "../message/message.service"
import { MongooseReplyMentionRepository } from "../message/replyMention.repository"
import { ReplyMentionService } from "../message/replyMention.service"
import { MESSAGE_MODEL_FIELDS } from "../message/message.constants"
import { createLogger } from "../../shared/logger/logger"
import { createGlobalErrorHandler } from "../../shared/middlewares/globalErrorHandler"
import { withRequestContext } from "../../shared/middlewares/requestContext"
import { withTransaction } from "../../shared/persistence/withTransaction"
import { AttachmentService } from "./attachment.service"
import { createAttachmentDownloadPath } from "./attachment.constants"
import { AttachmentController } from "./attachment.controller"
import { MongooseAttachmentRepository } from "./attachment.repository"
import { createAttachmentRouter } from "./attachment.route"
import type { AttachmentCleanupFailureRecorder, PrivateAttachmentStorage } from "./attachment.types"

const TEST_TOKEN_SECRET = "attachment-route-tests-use-a-sufficiently-long-secret"
const TEST_WIRED_TIGER_CACHE_SIZE_GB = "0.25"
const MEMBERSHIP_START_TIME = new Date("2026-10-04T10:00:00.000Z")
const MESSAGE_TIME = new Date("2026-10-04T12:00:00.000Z")
const VALID_PDF = Buffer.from("%PDF-1.7\nattachment test")
const PRIVATE_KEY = "attachments/private-object-key.pdf"

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger",
            args: [`--wiredTigerCacheSizeGB=${TEST_WIRED_TIGER_CACHE_SIZE_GB}`],
        },
    })
    await mongoose.connect(replicaSet.getUri(), { dbName: "attachment-route-test" })
    await Promise.all([Conversation.init(), Friendship.init(), Message.init(), User.init()])
})

beforeEach(async () => {
    await Promise.all([
        Conversation.collection.deleteMany({}),
        Friendship.collection.deleteMany({}),
        Message.collection.deleteMany({}),
        User.collection.deleteMany({}),
    ])
})

afterAll(async () => {
    await mongoose.disconnect()
    await replicaSet?.stop()
})

describe("message attachment HTTP routes", () => {
    it("should_accept_a_valid_pdf_and_stream_it_without_exposing_its_private_key", async () => {
        const sender = await createAccount("valid-pdf")
        const conversationId = await createGroup(sender.id)
        const storage = createStorage()
        const response = await request(createTestApp(storage.storage))
            .post(API_ROUTES.MESSAGES)
            .set("Authorization", `Bearer ${sender.token}`)
            .field(MESSAGE_FIELDS.CONVERSATION_ID, conversationId.toString())
            .field(MESSAGE_FIELDS.CLIENT_MESSAGE_ID, "valid-pdf-message")
            .field(MESSAGE_FIELDS.CONTENT, "See attached")
            .field(MESSAGE_FIELDS.MENTIONS, JSON.stringify([]))
            .attach("attachments", VALID_PDF, { filename: "report.pdf", contentType: "application/pdf" })
        const attachment = response.body.data?.[MESSAGE_FIELDS.ATTACHMENTS]?.[0]
        const serializedResponse = JSON.stringify(response.body)

        expect(response.status).toBe(201)
        expect(response.body).toMatchObject({ success: true, error: null })
        expect(attachment).toMatchObject({
            [MESSAGE_ATTACHMENT_FIELDS.NAME]: "report.pdf",
            [MESSAGE_ATTACHMENT_FIELDS.CONTENT_TYPE]: "application/pdf",
            [MESSAGE_ATTACHMENT_FIELDS.SIZE]: VALID_PDF.length,
        })
        expect(response.body.data[MESSAGE_FIELDS.MENTIONS]).toEqual([])
        expect(attachment[MESSAGE_ATTACHMENT_FIELDS.URL]).toBe(
            createAttachmentDownloadPath(response.body.data.id, attachment.id),
        )
        expect(serializedResponse).not.toContain("r2:")
        expect(serializedResponse).not.toContain(PRIVATE_KEY)
        expect(storage.upload).toHaveBeenCalledOnce()

        const download = await request(createTestApp(storage.storage))
            .get(createAttachmentDownloadPath(response.body.data.id, attachment.id))
            .set("Authorization", `Bearer ${sender.token}`)
            .buffer(true)
            .parse((stream, callback) => {
                const chunks: Buffer[] = []
                stream.on("data", (chunk: Buffer) => chunks.push(chunk))
                stream.on("end", () => callback(null, Buffer.concat(chunks)))
            })

        expect(download.status).toBe(200)
        expect(download.headers["content-type"]).toContain("application/pdf")
        expect(download.headers["content-disposition"]).toContain("attachment")
        expect(download.headers["x-content-type-options"]).toBe("nosniff")
        expect(download.headers["cache-control"]).toContain("private")
        expect(download.body).toEqual(VALID_PDF)
        expect(storage.download).toHaveBeenCalledWith(expect.stringMatching(/^attachments\//))
    })

    it("should_allow_a_file_only_message_without_text", async () => {
        const sender = await createAccount("file-only")
        const conversationId = await createGroup(sender.id)
        const response = await request(createTestApp())
            .post(API_ROUTES.MESSAGES)
            .set("Authorization", `Bearer ${sender.token}`)
            .field(MESSAGE_FIELDS.CONVERSATION_ID, conversationId.toString())
            .field(MESSAGE_FIELDS.CLIENT_MESSAGE_ID, "file-only-message")
            .attach("attachments", VALID_PDF, { filename: "report.pdf", contentType: "application/pdf" })

        expect(response.status).toBe(201)
        expect(response.body.data[MESSAGE_FIELDS.CONTENT]).toBeNull()
        expect(response.body.data[MESSAGE_FIELDS.ATTACHMENTS]).toHaveLength(1)
    })

    it("should_reject_a_file_when_its_signature_does_not_match_its_declared_mime", async () => {
        const sender = await createAccount("bad-signature")
        const conversationId = await createGroup(sender.id)
        const storage = createStorage()
        const response = await request(createTestApp(storage.storage))
            .post(API_ROUTES.MESSAGES)
            .set("Authorization", `Bearer ${sender.token}`)
            .field(MESSAGE_FIELDS.CONVERSATION_ID, conversationId.toString())
            .field(MESSAGE_FIELDS.CLIENT_MESSAGE_ID, "bad-signature-message")
            .attach("attachments", Buffer.from("not a PDF"), {
                filename: "report.pdf",
                contentType: "application/pdf",
            })

        expect(response.status).toBe(400)
        expect(response.body.error.code).toBe(ERROR_CODES.VALIDATION)
        expect(storage.upload).not.toHaveBeenCalled()
        expect(await Message.countDocuments({})).toBe(0)
    })

    it("should_reject_unsupported_oversized_and_sixth_files_before_storage", async () => {
        const sender = await createAccount("file-limits")
        const conversationId = await createGroup(sender.id)
        const storage = createStorage()
        const app = createTestApp(storage.storage)
        const unsupported = await request(app)
            .post(API_ROUTES.MESSAGES)
            .set("Authorization", `Bearer ${sender.token}`)
            .field(MESSAGE_FIELDS.CONVERSATION_ID, conversationId.toString())
            .field(MESSAGE_FIELDS.CLIENT_MESSAGE_ID, "unsupported-file")
            .attach("attachments", Buffer.from("payload"), {
                filename: "payload.json",
                contentType: "application/json",
            })
        const oversized = await request(app)
            .post(API_ROUTES.MESSAGES)
            .set("Authorization", `Bearer ${sender.token}`)
            .field(MESSAGE_FIELDS.CONVERSATION_ID, conversationId.toString())
            .field(MESSAGE_FIELDS.CLIENT_MESSAGE_ID, "oversized-file")
            .attach("attachments", Buffer.alloc(MAX_UPLOAD_FILE_SIZE_BYTES + 1), {
                filename: "oversized.pdf",
                contentType: "application/pdf",
            })
        let sixthFileRequest = request(app)
            .post(API_ROUTES.MESSAGES)
            .set("Authorization", `Bearer ${sender.token}`)
            .field(MESSAGE_FIELDS.CONVERSATION_ID, conversationId.toString())
            .field(MESSAGE_FIELDS.CLIENT_MESSAGE_ID, "sixth-file")
        for (let index = 0; index < ATTACHMENT_LIMITS.MAX_FILE_COUNT + 1; index += 1) {
            sixthFileRequest = sixthFileRequest.attach("attachments", VALID_PDF, {
                filename: `report-${index}.pdf`,
                contentType: "application/pdf",
            })
        }
        const sixthFile = await sixthFileRequest

        expect(unsupported.status).toBe(400)
        expect(unsupported.body.error.code).toBe(ERROR_CODES.VALIDATION)
        expect(oversized.status).toBe(400)
        expect(oversized.body.error.code).toBe(ERROR_CODES.VALIDATION)
        expect(sixthFile.status).toBe(400)
        expect(sixthFile.body.error.code).toBe(ERROR_CODES.VALIDATION)
        expect(storage.upload).not.toHaveBeenCalled()
        expect(await Message.countDocuments({})).toBe(0)
    })

    it("should_require_authentication_before_streaming_an_attachment", async () => {
        const owner = await createAccount("auth")
        const conversationId = await createGroup(owner.id)
        const message = await insertAttachmentMessage(conversationId, owner.id)

        const response = await request(createTestApp())
            .get(createAttachmentDownloadPath(message.id, message.attachmentId))

        expect(response.status).toBe(401)
        expect(response.body.error.code).toBe(ERROR_CODES.UNAUTHORIZED)
    })

    it.each(["nonmember", "departed", "pre-join"] as const)(
        "should_hide_an_attachment_from_%s_membership",
        async (scenario) => {
            const owner = await createAccount(`${scenario}-owner`)
            const reader = await createAccount(`${scenario}-reader`)
            const laterJoinTime = new Date("2026-10-05T10:00:00.000Z")
            const conversationId = await createGroup(
                owner.id,
                scenario === "nonmember"
                    ? []
                    : [{ userId: reader.id, joinedAt: scenario === "pre-join" ? laterJoinTime : MEMBERSHIP_START_TIME }],
            )
            const message = await insertAttachmentMessage(conversationId, owner.id, MESSAGE_TIME)
            const storage = createStorage()
            await storage.storage.upload({ key: PRIVATE_KEY, body: VALID_PDF, contentType: "application/pdf" })
            if (scenario === "departed") {
                await Conversation.updateOne(
                    {
                        [CONVERSATION_FIELDS.ID]: conversationId,
                        [`${CONVERSATION_FIELDS.PARTICIPANTS}.${PARTICIPANT_FIELDS.USER_ID}`]: reader.id,
                    },
                    { $set: { [`${CONVERSATION_FIELDS.PARTICIPANTS}.$.${PARTICIPANT_FIELDS.DEL_FLAG}`]: true } },
                )
            }

            const response = await request(createTestApp(storage.storage))
                .get(createAttachmentDownloadPath(message.id, message.attachmentId))
                .set("Authorization", `Bearer ${reader.token}`)

            expect(response.status).toBe(404)
            expect(response.body.error.code).toBe(ERROR_CODES.ATTACHMENT_NOT_FOUND)
            expect(storage.download).not.toHaveBeenCalled()
            expect(JSON.stringify(response.body)).not.toContain(PRIVATE_KEY)
        },
    )
})

/** Build one authenticated app with real Mongo repositories and replaceable private storage. */
function createTestApp(storage: PrivateAttachmentStorage = createStorage().storage): Express {
    const attachmentService = new AttachmentService({
        repository: new MongooseAttachmentRepository(),
        storage,
        cleanupFailureRecorder: createCleanupRecorder(),
    })
    const messageService = new MessageService({
        repository: new MongooseMessageRepository(),
        transactionRunner: { run: withTransaction },
        clock: { now: () => new Date() },
        replyMentionValidator: new ReplyMentionService({ repository: new MongooseReplyMentionRepository() }),
        attachmentService,
    })
    const logger = createLogger(() => undefined)
    const app = express()
    app.use(withRequestContext)
    app.use(express.json())
    app.use(cookieParser())
    app.use(createAuthenticate(TEST_TOKEN_SECRET))
    app.use(API_ROUTES.MESSAGES, createMessageRouter(new MessageController(messageService)))
    app.use(API_ROUTES.MESSAGES, createAttachmentRouter(new AttachmentController(attachmentService)))
    app.use(createGlobalErrorHandler(logger))
    return app
}

/** Build a private object store double that records writes and streams uploaded bytes. */
function createStorage() {
    const objects = new Map<string, Buffer>()
    const upload = vi.fn(async (input: { readonly key: string; readonly body: Buffer }) => {
        objects.set(input.key, input.body)
    })
    const download = vi.fn(async (key: string) => {
        const body = objects.get(key)
        if (!body) throw new Error("Private test object not found")
        return { body: Readable.from([body]) }
    })
    const storage: PrivateAttachmentStorage = {
        upload,
        delete: vi.fn(async (key: string) => { objects.delete(key) }),
        download,
    }
    return { storage, upload, download }
}

/** Keep cleanup failure logging replaceable without exposing storage internals. */
function createCleanupRecorder(): AttachmentCleanupFailureRecorder {
    return { record: vi.fn() }
}

/** Create an account and a matching access token for one route scenario. */
async function createAccount(suffix: string): Promise<{ readonly id: mongoose.Types.ObjectId; readonly token: string }> {
    const user = await User.create({
        username: `attachment_${suffix}`,
        email: `attachment_${suffix}@example.com`,
        displayName: `Attachment ${suffix}`,
        hashedPassword: "attachment-route-test-hash",
    })
    return {
        id: user._id,
        token: new AuthTokenService(TEST_TOKEN_SECRET).createAccessToken(user._id.toString()),
    }
}

/** Persist a group with the owner and scenario-specific member history boundaries. */
async function createGroup(
    ownerId: mongoose.Types.ObjectId,
    members: readonly { readonly userId: mongoose.Types.ObjectId; readonly joinedAt: Date }[] = [],
): Promise<mongoose.Types.ObjectId> {
    const conversation = await Conversation.create({
        [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
        [CONVERSATION_FIELDS.PARTICIPANTS]: [
            {
                [PARTICIPANT_FIELDS.USER_ID]: ownerId,
                [PARTICIPANT_FIELDS.ROLE]: ROLE.OWNER,
                [PARTICIPANT_FIELDS.JOINED_AT]: MEMBERSHIP_START_TIME,
            },
            ...members.map((member) => ({
                [PARTICIPANT_FIELDS.USER_ID]: member.userId,
                [PARTICIPANT_FIELDS.ROLE]: ROLE.MEMBER,
                [PARTICIPANT_FIELDS.JOINED_AT]: member.joinedAt,
            })),
        ],
        [CONVERSATION_FIELDS.GROUP]: {
            [GROUP_FIELDS.NAME]: "Attachment route test",
            [GROUP_FIELDS.OWNER_ID]: ownerId,
        },
    })
    return conversation._id
}

/** Insert one private attachment record at a controlled message timestamp. */
async function insertAttachmentMessage(
    conversationId: mongoose.Types.ObjectId,
    senderId: mongoose.Types.ObjectId,
    createdAt: Date = MESSAGE_TIME,
): Promise<{ readonly id: string; readonly attachmentId: string }> {
    const message = await Message.create({
        [MESSAGE_MODEL_FIELDS.CONVERSATION_ID]: conversationId,
        [MESSAGE_MODEL_FIELDS.SENDER_ID]: senderId,
        [MESSAGE_MODEL_FIELDS.CLIENT_MESSAGE_ID]: `seed-${new mongoose.Types.ObjectId().toString()}`,
        [MESSAGE_MODEL_FIELDS.CONTENT]: "Private attachment",
        [MESSAGE_MODEL_FIELDS.ATTACHMENTS]: [{
            [MESSAGE_ATTACHMENT_FIELDS.ID]: `r2:${PRIVATE_KEY}`,
            [MESSAGE_ATTACHMENT_FIELDS.NAME]: "report.pdf",
            [MESSAGE_ATTACHMENT_FIELDS.CONTENT_TYPE]: "application/pdf",
            [MESSAGE_ATTACHMENT_FIELDS.SIZE]: VALID_PDF.length,
        }],
        [MESSAGE_MODEL_FIELDS.CREATED_AT]: createdAt,
        [MESSAGE_MODEL_FIELDS.UPDATED_AT]: createdAt,
    })
    return {
        id: message._id.toString(),
        attachmentId: message[MESSAGE_MODEL_FIELDS.ATTACHMENTS][0]._id.toString(),
    }
}
