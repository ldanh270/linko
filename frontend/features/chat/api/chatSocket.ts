import {
    MESSAGE_FIELDS,
    SOCKET_AUTH_FIELDS,
    SOCKET_EVENTS,
    type CursorPage,
    type MessageDto,
} from "@linko/contracts"
import { io } from "socket.io-client"

import { getAccessToken } from "../../auth/api/auth.api"
import { API_ORIGIN } from "@/shared/http/apiOrigin"
import { listMessages } from "./messages.api"

/** Socket listener subset needed for conversation subscription and tests. */
export interface ChatSocket {
    readonly connected: boolean
    emit<Args extends readonly unknown[]>(event: string, ...args: Args): void
    on<Args extends readonly unknown[]>(event: string, listener: (...args: Args) => void): ChatSocket
    off<Args extends readonly unknown[]>(event: string, listener: (...args: Args) => void): ChatSocket
    disconnect(): void
}

/** Optional recovery inputs for a conversation listener. */
export interface ConversationSubscriptionOptions {
    readonly initialMessages?: readonly MessageDto[]
    readonly onSyncError?: (error: unknown) => void
}

let sharedSocketInstance: ChatSocket | null = null

/** Open an authenticated Socket.IO connection using the current in-memory access token. */
export function createChatSocket(): ChatSocket {
    return io(API_ORIGIN || undefined, {
        auth: (completeHandshake) => completeHandshake({
            [SOCKET_AUTH_FIELDS.TOKEN]: getAccessToken(),
        }),
    }) as unknown as ChatSocket
}

/** Return the shared authenticated Socket.IO connection for the active session. */
export function getSharedChatSocket(): ChatSocket {
    if (!sharedSocketInstance) {
        sharedSocketInstance = createChatSocket()
    }
    return sharedSocketInstance
}

/** Disconnect and reset the shared socket connection upon user logout. */
export function resetSharedChatSocket(): void {
    if (sharedSocketInstance) {
        sharedSocketInstance.disconnect()
        sharedSocketInstance = null
    }
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
        if (isDisposed || message[MESSAGE_FIELDS.CONVERSATION_ID] !== conversationId || knownIds.has(message[MESSAGE_FIELDS.ID])) return
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

/** Merge an API response or socket event into a chronological, message-ID-unique list.
 *
 * Optimistic temporary messages are replaced in-place when matching clientMessageId arrives.
 */
export function mergeMessageById(messages: readonly MessageDto[], incoming: MessageDto): MessageDto[] {
    const next = [...messages]
    const index = next.findIndex((item) => {
        if (item[MESSAGE_FIELDS.ID] === incoming[MESSAGE_FIELDS.ID]) return true
        if (
            item[MESSAGE_FIELDS.ID].startsWith("temp-")
            && Boolean(item[MESSAGE_FIELDS.CLIENT_MESSAGE_ID])
            && item[MESSAGE_FIELDS.CLIENT_MESSAGE_ID] === incoming[MESSAGE_FIELDS.CLIENT_MESSAGE_ID]
        ) {
            return true
        }
        return false
    })

    if (index >= 0) {
        next[index] = incoming
    } else {
        next.push(incoming)
    }
    return next.sort(compareMessages)
}

function compareMessages(left: MessageDto, right: MessageDto | null): number {
    if (!right) return 1
    const timestampOrder = left[MESSAGE_FIELDS.CREATED_AT].localeCompare(right[MESSAGE_FIELDS.CREATED_AT])
    return timestampOrder || left[MESSAGE_FIELDS.ID].localeCompare(right[MESSAGE_FIELDS.ID])
}
