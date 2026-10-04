import {
    MESSAGE_FIELDS,
    SOCKET_AUTH_FIELDS,
    SOCKET_EVENTS,
    type CursorPage,
    type MessageDto,
} from "@linko/contracts"
import { io, type Socket } from "socket.io-client"

import { getAccessToken } from "../../auth/api/auth.api"
import { listMessages } from "./messages.api"

/** Socket listener subset needed for conversation subscription and tests. */
export type ChatSocket = Pick<Socket, "connected" | "emit" | "on" | "off">

/** Optional recovery inputs for a conversation listener. */
export interface ConversationSubscriptionOptions {
    readonly initialMessages?: readonly MessageDto[]
    readonly onSyncError?: (error: unknown) => void
}

/** Open an authenticated Socket.IO connection using the current in-memory access token. */
export function createChatSocket(): Socket {
    return io(undefined, {
        auth: (completeHandshake) => completeHandshake({
            [SOCKET_AUTH_FIELDS.TOKEN]: getAccessToken(),
        }),
    })
}

/** Subscribe once, authorize the room, and recover messages missed while disconnected.
 *
 * The initial view seeds de-duplication; forward recovery pages use the last known message ID.
 */
export function subscribeToConversation(
    socket: ChatSocket,
    conversationId: string,
    onMessage: (message: MessageDto) => void,
    options: ConversationSubscriptionOptions = {},
): () => void {
    const knownIds = new Set(options.initialMessages?.map((message) => message[MESSAGE_FIELDS.ID]) ?? [])
    let newestMessage = options.initialMessages?.reduce<MessageDto | null>(
        (newest, message) => compareMessages(message, newest) > 0 ? message : newest,
        null,
    ) ?? null
    let isDisposed = false

    const acceptMessage = (message: MessageDto): void => {
        if (isDisposed || knownIds.has(message[MESSAGE_FIELDS.ID])) return
        knownIds.add(message[MESSAGE_FIELDS.ID])
        if (!newestMessage || compareMessages(message, newestMessage) > 0) newestMessage = message
        onMessage(message)
    }

    const synchronize = async (): Promise<void> => {
        if (isDisposed || !socket.connected) return
        socket.emit(SOCKET_EVENTS.CONVERSATION_JOIN, conversationId)
        try {
            if (!newestMessage) {
                const latestPage: CursorPage<MessageDto> = await listMessages({ conversationId })
                latestPage.items.forEach(acceptMessage)
                return
            }

            let afterMessageId = newestMessage[MESSAGE_FIELDS.ID]
            while (!isDisposed) {
                const page = await listMessages({ conversationId, afterMessageId })
                page.items.forEach(acceptMessage)
                const nextMessageId = page.nextCursor
                if (!nextMessageId || nextMessageId === afterMessageId) return
                afterMessageId = nextMessageId
            }
        } catch (error) {
            options.onSyncError?.(error)
        }
    }

    const onConnect = (): void => { void synchronize() }
    const onSocketMessage = (message: MessageDto): void => acceptMessage(message)
    socket.on(SOCKET_EVENTS.CONNECT, onConnect)
    socket.on(SOCKET_EVENTS.MESSAGE_CREATED, onSocketMessage)
    if (socket.connected) onConnect()

    return () => {
        isDisposed = true
        socket.off(SOCKET_EVENTS.CONNECT, onConnect)
        socket.off(SOCKET_EVENTS.MESSAGE_CREATED, onSocketMessage)
    }
}

/** Merge an API response or socket event into a chronological, message-ID-unique list. */
export function mergeMessageById(messages: readonly MessageDto[], incoming: MessageDto): MessageDto[] {
    if (messages.some((message) => message[MESSAGE_FIELDS.ID] === incoming[MESSAGE_FIELDS.ID])) return [...messages]
    return [...messages, incoming].sort(compareMessages)
}

function compareMessages(left: MessageDto, right: MessageDto | null): number {
    if (!right) return 1
    const timestampOrder = left[MESSAGE_FIELDS.CREATED_AT].localeCompare(right[MESSAGE_FIELDS.CREATED_AT])
    return timestampOrder || left[MESSAGE_FIELDS.ID].localeCompare(right[MESSAGE_FIELDS.ID])
}
