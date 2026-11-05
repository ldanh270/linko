import { MESSAGE_FIELDS, PRESENCE_STATUS, SOCKET_LIFECYCLE, SOCKET_EVENTS, type MessageDto } from "@linko/contracts"
import { UTILITY_EVENTS, type UtilityChangedEvent } from "@linko/contracts"
import { REGEX } from "../../configs/constants/regex"
import {
    conversationRoom,
    REALTIME_FIELDS,
    userRoom,
} from "./realtime.constants"
import type {
    RealtimeGatewayDependencies,
    RealtimeConversationNotifier,
    RealtimeMembershipRevoker,
    RealtimeMessagePublisher,
    RealtimeSocket,
    SocketIdentity,
} from "./realtime.types"
import { authenticateRealtimeSocket } from "./realtime.auth"
import { presenceIdsSchema } from "./presence.schema"
import type { Server } from "socket.io"

/** Authenticate sockets and authorize every conversation room transition.
 *
 * @layer Service
 */
export class RealtimeGateway implements RealtimeMessagePublisher, RealtimeMembershipRevoker, RealtimeConversationNotifier {
    private server: Server | null = null

    /** Invalidate authorized queries without broadcasting private utility content. */
    async publishUtilityChange(event: UtilityChangedEvent): Promise<void> {
        this.requireServer().to(conversationRoom(event.conversationId)).emit(UTILITY_EVENTS.CHANGED, event)
    }

    /** Signal a durable reminder only to its recipient's authenticated sessions. */
    async publishReminder(userId: string, reminderId: string): Promise<void> {
        this.requireServer().to(userRoom(userId)).emit(UTILITY_EVENTS.REMINDER, { reminderId })
    }

    /** Bind shared token verification and active membership persistence. */
    constructor(private readonly dependencies: RealtimeGatewayDependencies) {}

    /** Verify handshake credentials and confirm the account remains active. */
    async authenticate(socket: RealtimeSocket): Promise<SocketIdentity> {
        return authenticateRealtimeSocket(socket, this.dependencies)
    }

    /** Install handshake authentication, private user rooms, and validated join handling. */
    register(server: Server): void {
        this.server = server
        server.use((socket, next) => {
            void this.authenticate(socket).then((identity) => {
                socket.data[REALTIME_FIELDS.USER_ID] = identity.userId
                next()
            }, (error: unknown) => next(error instanceof Error ? error : new Error("Socket authentication failed")))
        })
        server.on(SOCKET_EVENTS.CONNECTION, (socket) => {
            const userId = socket.data[REALTIME_FIELDS.USER_ID]
            if (typeof userId !== "string") {
                socket.disconnect(true)
                return
            }
            void socket.join(userRoom(userId))

            const connection = { userId, socketId: socket.id }
            const presence = this.dependencies.presence
            void presence?.connect(connection).then((changed) => {
                if (changed) this.publishPresence(userId, true)
            }).catch((error: unknown) => this.dependencies.onError?.(error))

            socket.on(SOCKET_EVENTS.PRESENCE_QUERY, (input: unknown, acknowledge?: unknown) => {
                if (typeof acknowledge !== "function") return
                const parsed = presenceIdsSchema.safeParse(input)
                if (!parsed.success || !presence) { acknowledge({}); return }
                void presence.getPresenceBatch(parsed.data).then((snapshot) => acknowledge(snapshot))
                    .catch((error: unknown) => { this.dependencies.onError?.(error); acknowledge({}) })
            })

            this.registerTyping(socket, userId)

            socket.on(SOCKET_EVENTS.CONVERSATION_JOIN, (conversationId: unknown, acknowledge?: (joined: boolean) => void) => {
                void this.joinConversation(socket, conversationId).then((joined) => acknowledge?.(joined))
            })

            socket.on(SOCKET_LIFECYCLE.DISCONNECT, () => {
                this.dependencies.typing?.release(socket.id)
                void presence?.disconnect(connection).then((changed) => {
                    if (changed) this.publishPresence(userId, false)
                }).catch((error: unknown) => this.dependencies.onError?.(error))
            })
        })
    }

    /** Join only after the active membership record authorizes this exact socket identity. */
    async joinConversation(socket: RealtimeSocket, conversationId: unknown): Promise<boolean> {
        const userId = socket.data[REALTIME_FIELDS.USER_ID]
        if (typeof conversationId !== "string" || !REGEX.MONGO_ID.test(conversationId) || typeof userId !== "string") {
            return false
        }
        if (!(await this.dependencies.repository.isCurrentMember(conversationId, userId))) return false
        await socket.join(conversationRoom(conversationId))
        return true
    }

    /** Emit only the message DTO after its database transaction has committed. */
    async publishMessage(message: MessageDto): Promise<void> {
        const server = this.requireServer()
        const conversationId = message[MESSAGE_FIELDS.CONVERSATION_ID]
        const senderId = message[MESSAGE_FIELDS.SENDER_ID]
        const memberIds = await this.dependencies.repository.listCurrentMemberIds(conversationId)
        const rooms = [conversationRoom(conversationId), ...memberIds.filter((id) => id !== senderId).map(userRoom)]
        server.to(rooms).emit(SOCKET_EVENTS.MESSAGE_CREATED, message)
    }

    /** Tell current room listeners to reload the conversation summary. */
    async publishConversationUpdate(conversationId: string): Promise<void> {
        this.requireServer()
            .to(conversationRoom(conversationId))
            .emit(SOCKET_EVENTS.CONVERSATION_UPDATED, {
                [REALTIME_FIELDS.CONVERSATION_ID]: conversationId,
            })
    }

    /** Remove every connected socket for a departed user from the conversation room. */
    async revokeMember(conversation: string | import("mongoose").Types.ObjectId, user: string | import("mongoose").Types.ObjectId): Promise<void> {
        const conversationId = conversation.toString()
        const userId = user.toString()
        const server = this.requireServer()
        const sockets = await server.in(userRoom(userId)).fetchSockets()
        server.to(conversationRoom(conversationId)).emit(SOCKET_EVENTS.CONVERSATION_UPDATED, {
            [REALTIME_FIELDS.CONVERSATION_ID]: conversationId,
        })
        for (const socket of sockets) {
            if (socket.data[REALTIME_FIELDS.USER_ID] !== userId) continue
            await socket.leave(conversationRoom(conversationId))
            socket.emit(SOCKET_EVENTS.MEMBERSHIP_CHANGED, {
                [REALTIME_FIELDS.CONVERSATION_ID]: conversationId,
                [REALTIME_FIELDS.USER_ID]: userId,
            })
        }
    }

    /** Publish safe lifecycle transitions, including lease expiry without a disconnect event. */
    publishPresence(userId: string, isOnline: boolean): void {
        this.requireServer().emit(isOnline ? SOCKET_EVENTS.PRESENCE_ONLINE : SOCKET_EVENTS.PRESENCE_OFFLINE, {
            userId, status: isOnline ? PRESENCE_STATUS.ONLINE : PRESENCE_STATUS.OFFLINE,
            ...(!isOnline ? { lastActive: new Date().toISOString() } : {}),
        })
    }

    private registerTyping(socket: RealtimeSocket, userId: string): void {
        let pending = Promise.resolve()
        const enqueue = (payload: unknown, isTyping: boolean): void => {
            pending = pending.then(async () => {
                if (!socket.connected) return
                const event = await this.dependencies.typing?.update({ userId, socketId: socket.id, payload, isTyping })
                if (event && socket.connected) socket.to(conversationRoom(event.conversationId)).emit(SOCKET_EVENTS.TYPING_UPDATE, event)
            }).catch((error: unknown) => this.dependencies.onError?.(error))
        }
        socket.on(SOCKET_EVENTS.TYPING_START, (payload: unknown) => enqueue(payload, true))
        socket.on(SOCKET_EVENTS.TYPING_STOP, (payload: unknown) => enqueue(payload, false))
    }

    private requireServer(): Server {
        if (!this.server) throw new Error("Realtime gateway has not been registered")
        return this.server
    }
}
