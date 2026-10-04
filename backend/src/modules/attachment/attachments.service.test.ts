import {
    CONVERSATION_STATUS,
    CONVERSATION_TYPE,
    ERROR_CODES,
    GROUP_FIELDS,
    ROLE,
} from "@linko/contracts"
import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import { Readable } from "node:stream"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import Conversation from "../../models/Conversation"
import Message from "../../models/Message"
import User from "../../models/User"
import { withTransaction } from "../../shared/persistence/withTransaction"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import { MongooseMessageRepository } from "../message/message.repository"
import { MessageService } from "../message/message.service"
import { MongooseReplyMentionRepository } from "../message/replyMention.repository"
import { ReplyMentionService } from "../message/replyMention.service"
import type { MessageRecord } from "../message/message.types"
import { MESSAGE_MODEL_FIELDS } from "../message/message.constants"
import { MongooseAttachmentRepository } from "./attachment.repository"
import { AttachmentService } from "./attachment.service"
import type { AttachmentFile } from "./attachment.types"

const TEST_WIRED_TIGER_CACHE_SIZE_GB = "0.25"
const JOINED_AT = new Date("2026-10-04T11:00:00.000Z")
const BEFORE_JOINED_AT = new Date("2026-10-04T10:00:00.000Z")
const MESSAGE_TIME = new Date("2026-10-04T12:00:00.000Z")
const MAX_TEST_ATTACHMENT_COUNT = 6

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger",
            args: [`--wiredTigerCacheSizeGB=${TEST_WIRED_TIGER_CACHE_SIZE_GB}`],
        },
    })
    await mongoose.connect(replicaSet.getUri(), { dbName: "attachments-service-test" })
    await Promise.all([Conversation.init(), Message.init(), User.init()])
})

beforeEach(async () => {
    await Promise.all([
        Conversation.collection.deleteMany({}),
        Message.collection.deleteMany({}),
        User.collection.deleteMany({}),
    ])
})

afterAll(async () => {
    await mongoose.disconnect()
    await replicaSet?.stop()
})

describe("AttachmentService", () => {
    it("should_reject_6th_file_before_upload", async () => {
        const { ownerId } = await createGroup("sixth-file")
        const storage = createRecordingStorage()
        const service = createAttachmentService(storage)

        await expect(service.store({
            userId: ownerId,
            files: Array.from({ length: MAX_TEST_ATTACHMENT_COUNT }, (_, index) => textFile(`note-${index}.txt`)),
        })).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })

        expect(storage.uploadedKeys).toHaveLength(0)
    })

    it("should_delete_new_objects_when_message_write_fails", async () => {
        const { ownerId, conversationId } = await createGroup("message-write-failure")
        const storage = createRecordingStorage()
        const attachmentService = createAttachmentService(storage)
        const messageService = createMessageService(new FailingMessageRepository(), attachmentService)

        await expect(messageService.send({
            conversationId,
            senderId: ownerId,
            clientMessageId: "attachment-message-write-failure",
            content: "Save with a private file",
            attachments: [textFile("notes.txt")],
        })).rejects.toThrow("message write failed")

        expect(storage.uploadedKeys.length).toBeGreaterThan(0)
        expect(storage.deletedKeys).toEqual(storage.uploadedKeys)
    })

    it("should_deny_file_before_joinedAt", async () => {
        const { ownerId, memberId, conversationId } = await createGroup("pre-join-download")
        const message = await Message.create({
            [MESSAGE_MODEL_FIELDS.CONVERSATION_ID]: conversationId,
            [MESSAGE_MODEL_FIELDS.SENDER_ID]: ownerId,
            [MESSAGE_MODEL_FIELDS.CLIENT_MESSAGE_ID]: "pre-join-attachment-message",
            [MESSAGE_MODEL_FIELDS.CONTENT]: null,
            [MESSAGE_MODEL_FIELDS.CREATED_AT]: BEFORE_JOINED_AT,
            [MESSAGE_MODEL_FIELDS.UPDATED_AT]: BEFORE_JOINED_AT,
            [MESSAGE_MODEL_FIELDS.ATTACHMENTS]: [{
                id: "r2:attachments/private-key",
                name: "old.txt",
                contentType: "text/plain",
                size: 4,
            }],
        })
        const attachmentId = message[MESSAGE_MODEL_FIELDS.ATTACHMENTS][0]?._id
        expect(attachmentId).toBeDefined()
        const storage = createRecordingStorage()
        const service = createAttachmentService(storage, new MongooseAttachmentRepository())

        await expect(service.download({
            messageId: message._id,
            attachmentId: attachmentId as mongoose.Types.ObjectId,
            userId: memberId,
        })).rejects.toMatchObject({ code: ERROR_CODES.ATTACHMENT_NOT_FOUND })

        expect(storage.downloadedKeys).toHaveLength(0)
    })
})

/** Build the attachment service with a recording private-object storage port. */
function createAttachmentService(
    storage: RecordingStorage,
    repository: MongooseAttachmentRepository = new MongooseAttachmentRepository(),
): AttachmentService {
    return new AttachmentService({
        repository,
        storage,
        cleanupFailureRecorder: { record: () => undefined },
    })
}

/** Build a transactional message service with real access checks and injectable persistence. */
function createMessageService(
    repository: MongooseMessageRepository,
    attachmentService: AttachmentService,
): MessageService {
    return new MessageService({
        repository,
        transactionRunner: { run: withTransaction },
        clock: { now: () => MESSAGE_TIME },
        replyMentionValidator: new ReplyMentionService({ repository: new MongooseReplyMentionRepository() }),
        attachmentService,
    })
}

/** Record private storage side effects without contacting R2. */
type RecordingStorage = {
    readonly uploadedKeys: string[]
    readonly deletedKeys: string[]
    readonly downloadedKeys: string[]
    upload(input: { readonly key: string; readonly body: Buffer; readonly contentType: string }): Promise<void>
    delete(key: string): Promise<void>
    download(key: string): Promise<{ readonly body: NodeJS.ReadableStream }>
}

/** Create an in-memory private-storage port that records every object operation. */
function createRecordingStorage(): RecordingStorage {
    const storage: RecordingStorage = {
        uploadedKeys: [],
        deletedKeys: [],
        downloadedKeys: [],
        async upload({ key }) {
            storage.uploadedKeys.push(key)
        },
        async delete(key) {
            storage.deletedKeys.push(key)
        },
        async download(key) {
            storage.downloadedKeys.push(key)
            return { body: Readable.from([]) }
        },
    }
    return storage
}

/** Create one authenticated user for the attachment service fixture. */
async function createAccount(suffix: string): Promise<{ readonly _id: mongoose.Types.ObjectId }> {
    return User.create({
        username: `attachment_${suffix}`,
        email: `attachment_${suffix}@example.com`,
        displayName: `Attachment ${suffix}`,
        hashedPassword: "attachment-test-hash",
    })
}

/** Persist an active group with its owner and a member who joined at the test boundary. */
async function createGroup(suffix: string): Promise<{
    readonly ownerId: mongoose.Types.ObjectId
    readonly memberId: mongoose.Types.ObjectId
    readonly conversationId: mongoose.Types.ObjectId
}> {
    const owner = await createAccount(`${suffix}-owner`)
    const member = await createAccount(`${suffix}-member`)
    const conversation = await Conversation.create({
        [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
        [CONVERSATION_FIELDS.STATUS]: CONVERSATION_STATUS.ACTIVE,
        [CONVERSATION_FIELDS.PARTICIPANTS]: [
            {
                [PARTICIPANT_FIELDS.USER_ID]: owner._id,
                [PARTICIPANT_FIELDS.ROLE]: ROLE.OWNER,
                [PARTICIPANT_FIELDS.JOINED_AT]: BEFORE_JOINED_AT,
            },
            {
                [PARTICIPANT_FIELDS.USER_ID]: member._id,
                [PARTICIPANT_FIELDS.ROLE]: ROLE.MEMBER,
                [PARTICIPANT_FIELDS.JOINED_AT]: JOINED_AT,
            },
        ],
        [CONVERSATION_FIELDS.GROUP]: {
            [GROUP_FIELDS.NAME]: `Group ${suffix}`,
            [GROUP_FIELDS.OWNER_ID]: owner._id,
        },
    })
    return { ownerId: owner._id, memberId: member._id, conversationId: conversation._id }
}

/** Create a small valid text file for storage boundary tests. */
function textFile(originalname: string): AttachmentFile {
    const buffer = Buffer.from("valid text")
    return { originalname, mimetype: "text/plain", buffer, size: buffer.length }
}

/** Fail the persistence write after the attachment service has uploaded its objects. */
class FailingMessageRepository extends MongooseMessageRepository {
    /** Simulate the database failure that requires attachment compensation. */
    override async createMessage(): Promise<MessageRecord> {
        throw new Error("message write failed")
    }
}
