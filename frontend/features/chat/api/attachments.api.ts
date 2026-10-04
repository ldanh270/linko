import {
    API_ROUTES,
    ATTACHMENT_PARAMS,
    ATTACHMENT_ROUTE_PATHS,
    MESSAGE_FIELDS,
    type MessageDto,
    type SendMessageRequest,
} from "@linko/contracts"

import { authenticatedApiClient } from "../../auth/api/auth.api"
import { createMessageMultipartBody } from "./messages.api"

/** Input accepted by the multipart message upload adapter. */
export interface SendMessageFilesInput extends SendMessageRequest {
    readonly files: readonly File[]
    readonly signal?: AbortSignal
}

/** Browser download with an explicit object URL lifetime. */
export interface AttachmentDownload {
    readonly blob: Blob
    readonly objectUrl: string
    /** Revoke the temporary browser URL once its consumer is finished. */
    revoke(): void
}

/** Send validated message fields and file bytes through the authenticated API client. */
export function sendMessageFiles(input: SendMessageFilesInput): Promise<MessageDto> {
    const body = createMessageMultipartBody(input)
    for (const file of input.files) {
        body.append(MESSAGE_FIELDS.ATTACHMENTS, file, file.name)
    }
    return authenticatedApiClient.request<MessageDto>({
        path: API_ROUTES.MESSAGES,
        method: "POST",
        body,
        signal: input.signal,
    })
}

/** Download one protected attachment and expose a revocable object URL to the caller. */
export async function downloadAttachment(input: {
    readonly messageId: string
    readonly attachmentId: string
    readonly signal?: AbortSignal
}): Promise<AttachmentDownload> {
    const route = ATTACHMENT_ROUTE_PATHS.DOWNLOAD
        .replace(`:${ATTACHMENT_PARAMS.MESSAGE_ID}`, encodeURIComponent(input.messageId))
        .replace(`:${ATTACHMENT_PARAMS.ATTACHMENT_ID}`, encodeURIComponent(input.attachmentId))
    const blob = await authenticatedApiClient.requestBlob({
        path: `${API_ROUTES.MESSAGES}${route}`,
        signal: input.signal,
    })
    const objectUrl = URL.createObjectURL(blob)
    let isRevoked = false
    return {
        blob,
        objectUrl,
        revoke: () => {
            if (isRevoked) return
            URL.revokeObjectURL(objectUrl)
            isRevoked = true
        },
    }
}
