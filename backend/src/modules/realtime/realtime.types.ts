import type { MessageDto } from "@linko/contracts"
import type { Types } from "mongoose"
import type { Socket } from "socket.io"

/** Authenticated identity attached to one live Socket.IO connection. */
export interface SocketIdentity {
    readonly userId: string
}

/** Persistence operations required before granting a socket identity or room access. */
export interface RealtimeRepository {
    /** Return whether an account exists and has not been soft deleted. */
    isActiveUser(userId: string): Promise<boolean>
    /** Return whether an account is a current participant in an active conversation. */
    isCurrentMember(conversationId: string, userId: string): Promise<boolean>
}

/** Verify access credentials using the shared auth issuer and audience rules. */
export interface RealtimeTokenVerifier {
    /** Return the token subject when a signature and claims are valid. */
    verifyAccessToken(accessToken: string): string | null
}

/** Dependencies required to authenticate a handshake before it receives socket rooms. */
export interface RealtimeAuthenticationDependencies {
    readonly tokenVerifier: RealtimeTokenVerifier
    readonly repository: RealtimeRepository
}

/** Publish a stored DTO only after its write transaction commits. */
export interface RealtimeMessagePublisher {
    /** Send the safe persisted message to connected conversation members. */
    publishMessage(message: MessageDto): Promise<void>
}

/** Remove a departed user from all live sockets after membership commits. */
export interface RealtimeMembershipRevoker {
    /** Revoke one user’s access to a conversation room and notify their sockets. */
    revokeMember(conversationId: string | Types.ObjectId, userId: string | Types.ObjectId): Promise<void>
}

/** Notify conversation listeners that their cached conversation summary is stale. */
export interface RealtimeConversationNotifier {
    /** Publish a safe invalidation event after conversation state commits. */
    publishConversationUpdate(conversationId: string): Promise<void>
}

/** Dependencies for the Socket.IO authorization and event gateway. */
export interface RealtimeGatewayDependencies {
    readonly tokenVerifier: RealtimeTokenVerifier
    readonly repository: RealtimeRepository
}

/** Socket shape accepted by the authorization boundary. */
export type RealtimeSocket = Socket
