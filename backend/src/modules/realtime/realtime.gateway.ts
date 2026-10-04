import { MESSAGE_FIELDS, SOCKET_EVENTS, type MessageDto } from "@linko/contracts"
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
import type { Server } from "socket.io"

/** Authenticate sockets and authorize every conversation room transition.
 *
 * @layer Service
 */
export class RealtimeGateway implements RealtimeMessagePublisher, RealtimeMembershipRevoker, RealtimeConversationNotifier {
    private server: Server | null = null

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
            socket.on(SOCKET_EVENTS.CONVERSATION_JOIN, (conversationId: unknown, acknowledge?: (joined: boolean) => void) => {
                void this.joinConversation(socket, conversationId).then((joined) => acknowledge?.(joined))
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
        server.to(conversationRoom(conversationId))
            .emit(SOCKET_EVENTS.MESSAGE_CREATED, message)

        const memberIds = await this.dependencies.repository.listCurrentMemberIds(conversationId)
        for (const memberId of memberIds) {
            if (memberId === senderId) continue
            server.to(userRoom(memberId)).emit(SOCKET_EVENTS.MESSAGE_CREATED, message)
        }
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

    private requireServer(): Server {
        if (!this.server) throw new Error("Realtime gateway has not been registered")
        return this.server
    }
}
