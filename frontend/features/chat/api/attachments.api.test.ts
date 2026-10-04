import {
    API_ROUTES,
    ATTACHMENT_PARAMS,
    ATTACHMENT_ROUTE_PATHS,
    ERROR_CODES,
    MESSAGE_FIELDS,
    type ApiEnvelope,
    type MessageDto,
} from "@linko/contracts"
import { afterEach, describe, expect, it, vi } from "vitest"

import { authenticatedApiClient } from "../../auth/api/auth.api"
import { downloadAttachment, sendMessageFiles } from "./attachments.api"

const MESSAGE_ID = "507f1f77bcf86cd799439011"
const ATTACHMENT_ID = "507f1f77bcf86cd799439012"
const MESSAGE: MessageDto = {
    [MESSAGE_FIELDS.ID]: MESSAGE_ID,
    [MESSAGE_FIELDS.CONVERSATION_ID]: "507f1f77bcf86cd799439013",
    [MESSAGE_FIELDS.SENDER_ID]: "507f1f77bcf86cd799439014",
    [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: "file-upload-client-id",
    [MESSAGE_FIELDS.CONTENT]: null,
    [MESSAGE_FIELDS.REPLY_TO]: null,
    [MESSAGE_FIELDS.MENTIONS]: [],
    [MESSAGE_FIELDS.ATTACHMENTS]: [],
    [MESSAGE_FIELDS.CREATED_AT]: "2026-10-04T12:00:00.000Z",
    [MESSAGE_FIELDS.UPDATED_AT]: "2026-10-04T12:00:00.000Z",
}

afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
})

describe("attachment API adapter", () => {
    it("should_send_files_as_multipart_through_the_authenticated_client", async () => {
        const requestSpy = vi.spyOn(authenticatedApiClient, "request").mockResolvedValue(MESSAGE)
        const file = new File(["private file bytes"], "notes.txt", { type: "text/plain" })

        await expect(sendMessageFiles({
            [MESSAGE_FIELDS.CONVERSATION_ID]: MESSAGE[MESSAGE_FIELDS.CONVERSATION_ID],
            [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: MESSAGE[MESSAGE_FIELDS.CLIENT_MESSAGE_ID],
            [MESSAGE_FIELDS.MENTIONS]: [MESSAGE[MESSAGE_FIELDS.SENDER_ID]],
            files: [file],
        })).resolves.toEqual(MESSAGE)

        const options = requestSpy.mock.calls[0]?.[0]
        expect(options).toMatchObject({ path: API_ROUTES.MESSAGES, method: "POST" })
        expect(options?.body).toBeInstanceOf(FormData)
        const formData = options?.body as FormData
        expect(formData.get(MESSAGE_FIELDS.CONVERSATION_ID)).toBe(MESSAGE[MESSAGE_FIELDS.CONVERSATION_ID])
        expect(formData.get(MESSAGE_FIELDS.CLIENT_MESSAGE_ID)).toBe(MESSAGE[MESSAGE_FIELDS.CLIENT_MESSAGE_ID])
        expect(formData.get(MESSAGE_FIELDS.CONTENT)).toBeNull()
        expect(formData.get(MESSAGE_FIELDS.MENTIONS)).toBe(JSON.stringify([MESSAGE[MESSAGE_FIELDS.SENDER_ID]]))
        expect(formData.getAll(MESSAGE_FIELDS.ATTACHMENTS)).toEqual([file])
    })

    it("should_encode_a_recipient_target_in_direct_message_uploads", async () => {
        const requestSpy = vi.spyOn(authenticatedApiClient, "request").mockResolvedValue(MESSAGE)
        const file = new File(["private file bytes"], "notes.txt", { type: "text/plain" })
        const recipientId = "507f1f77bcf86cd799439015"

        await sendMessageFiles({
            [MESSAGE_FIELDS.RECIPIENT_ID]: recipientId,
            [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: "recipient-file-client-id",
            files: [file],
        })

        const formData = requestSpy.mock.calls[0]?.[0].body as FormData
        expect(formData.get(MESSAGE_FIELDS.RECIPIENT_ID)).toBe(recipientId)
        expect(formData.get(MESSAGE_FIELDS.CONVERSATION_ID)).toBeNull()
    })

    it("should_download_a_blob_with_abort_signal_and_release_its_object_url", async () => {
        const blob = new Blob(["private file bytes"], { type: "text/plain" })
        const requestBlobSpy = vi.spyOn(authenticatedApiClient, "requestBlob").mockResolvedValue(blob)
        const createObjectUrl = vi.fn().mockReturnValue("blob:private-attachment")
        const revokeObjectUrl = vi.fn()
        vi.stubGlobal("URL", Object.assign(class extends URL {}, {
            createObjectURL: createObjectUrl,
            revokeObjectURL: revokeObjectUrl,
        }))
        const abortController = new AbortController()

        const download = await downloadAttachment({
            messageId: MESSAGE_ID,
            attachmentId: ATTACHMENT_ID,
            signal: abortController.signal,
        })
        const path = ATTACHMENT_ROUTE_PATHS.DOWNLOAD
            .replace(`:${ATTACHMENT_PARAMS.MESSAGE_ID}`, MESSAGE_ID)
            .replace(`:${ATTACHMENT_PARAMS.ATTACHMENT_ID}`, ATTACHMENT_ID)

        expect(requestBlobSpy).toHaveBeenCalledWith({
            path: `${API_ROUTES.MESSAGES}${path}`,
            signal: abortController.signal,
        })
        expect(download.blob).toBe(blob)
        expect(download.objectUrl).toBe("blob:private-attachment")
        expect(createObjectUrl).toHaveBeenCalledWith(blob)

        download.revoke()

        expect(revokeObjectUrl).toHaveBeenCalledWith("blob:private-attachment")
    })

    it("should_preserve_the_server_attachment_error_code", async () => {
        const failure: ApiEnvelope<never> = {
            success: false,
            data: null,
            error: { code: ERROR_CODES.ATTACHMENT_NOT_FOUND, message: "Attachment not found" },
            meta: null,
        }
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
            new Response(JSON.stringify(failure), { status: 404 }),
        ))

        await expect(downloadAttachment({
            messageId: MESSAGE_ID,
            attachmentId: ATTACHMENT_ID,
        })).rejects.toMatchObject({ code: ERROR_CODES.ATTACHMENT_NOT_FOUND, status: 404 })
    })
})
