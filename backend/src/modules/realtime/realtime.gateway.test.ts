import {
    MESSAGE_FIELDS,
    SOCKET_EVENTS,
    type MessageDto,
} from "@linko/contracts"
import type { Server, Socket } from "socket.io"
import mongoose from "mongoose"
import { describe, expect, it, vi } from "vitest"

import { UnauthorizedException } from "../../shared/errors/UnauthorizedException"
import { AuthTokenService } from "../auth/auth.security"
import { RealtimeGateway } from "./realtime.gateway"
import { userRoom } from "./realtime.constants"
import type { RealtimeRepository, RealtimeTokenVerifier } from "./realtime.types"

const USER_ID = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011")
const OTHER_USER_ID = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012")
const CONVERSATION_ID = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013")
const MESSAGE_ID = "507f1f77bcf86cd799439014"

describe("RealtimeGateway", () => {
    it("should_reject_a_socket_without_a_valid_access_token", async () => {
        const gateway = createGateway({ tokenVerifier: { verifyAccessToken: vi.fn().mockReturnValue(null) } })

        await expect(gateway.authenticate(createSocket(undefined)))
            .rejects.toBeInstanceOf(UnauthorizedException)
    })

    it("should_reject_a_valid_token_for_a_deleted_or_missing_user", async () => {
        const gateway = createGateway({
            tokenVerifier: { verifyAccessToken: vi.fn().mockReturnValue(USER_ID.toString()) },
            repository: { isActiveUser: vi.fn().mockResolvedValue(false) },
        })

        await expect(gateway.authenticate(createSocket("valid-token")))
            .rejects.toBeInstanceOf(UnauthorizedException)
    })

    it("should_accept_a_signed_access_token_with_the_shared_auth_claims", async () => {
        const tokenVerifier = new AuthTokenService("realtime-test-secret-that-is-long-enough")
        const gateway = createGateway({
            tokenVerifier: { verifyAccessToken: tokenVerifier.verifyAccessToken.bind(tokenVerifier) },
        })

        await expect(gateway.authenticate(createSocket(tokenVerifier.createAccessToken(USER_ID.toString()))))
            .resolves.toEqual({ userId: USER_ID.toString() })
        await expect(gateway.authenticate(createSocket("invalid-token")))
            .rejects.toBeInstanceOf(UnauthorizedException)
    })

    it("should_not_join_a_conversation_for_a_nonmember", async () => {
        const socket = createSocket("valid-token")
        socket.data.userId = USER_ID.toString()
        const gateway = createGateway({ repository: { isCurrentMember: vi.fn().mockResolvedValue(false) } })

        await expect(gateway.joinConversation(socket, CONVERSATION_ID.toString())).resolves.toBe(false)

        expect(socket.join).not.toHaveBeenCalled()
    })

    it("should_publish_the_safe_message_dto_to_its_conversation_room", async () => {
        const transport = createTransport()
        const gateway = createGateway()
        gateway.register(transport.server)
        const message = createMessage()

        await gateway.publishMessage(message)

        expect(transport.emit).toHaveBeenCalledWith(SOCKET_EVENTS.MESSAGE_CREATED, message)
        expect(transport.server.to).toHaveBeenCalledWith(expect.stringContaining(CONVERSATION_ID.toString()))
    })

    it("should_fan_out_message_events_to_other_current_members_private_rooms", async () => {
        const transport = createTransport()
        const listCurrentMemberIds = vi.fn().mockResolvedValue([USER_ID.toString(), OTHER_USER_ID.toString()])
        const gateway = createGateway({ repository: { listCurrentMemberIds } })
        gateway.register(transport.server)
        const message = createMessage()

        await gateway.publishMessage(message)

        expect(listCurrentMemberIds).toHaveBeenCalledWith(CONVERSATION_ID.toString())
        expect(transport.server.to).toHaveBeenCalledWith(userRoom(OTHER_USER_ID.toString()))
        expect(transport.server.to).not.toHaveBeenCalledWith(userRoom(USER_ID.toString()))
        expect(transport.emit).toHaveBeenCalledWith(SOCKET_EVENTS.MESSAGE_CREATED, message)
    })

    it("should_publish_a_conversation_invalidation_to_current_room_members", async () => {
        const transport = createTransport()
        const gateway = createGateway()
        gateway.register(transport.server)

        await gateway.publishConversationUpdate(CONVERSATION_ID.toString())

        expect(transport.server.to).toHaveBeenCalledWith(expect.stringContaining(CONVERSATION_ID.toString()))
        expect(transport.emit).toHaveBeenCalledWith(SOCKET_EVENTS.CONVERSATION_UPDATED, {
            conversationId: CONVERSATION_ID.toString(),
        })
    })

    it("should_leave_a_removed_member's_conversation_room_and_notify_their_sockets", async () => {
        const socket = createSocket("valid-token")
        socket.data.userId = OTHER_USER_ID.toString()
        const transport = createTransport([socket])
        const gateway = createGateway()
        gateway.register(transport.server)

        await gateway.revokeMember(CONVERSATION_ID, OTHER_USER_ID)

        expect(socket.leave).toHaveBeenCalledWith(expect.stringContaining(CONVERSATION_ID.toString()))
        expect(socket.emit).toHaveBeenCalledWith(SOCKET_EVENTS.MEMBERSHIP_CHANGED, {
            conversationId: CONVERSATION_ID.toString(),
            userId: OTHER_USER_ID.toString(),
        })
    })
})

/** Build one gateway with overridable token and membership boundaries. */
function createGateway(overrides: {
    readonly tokenVerifier?: Partial<RealtimeTokenVerifier>
    readonly repository?: Partial<RealtimeRepository>
} = {}): RealtimeGateway {
    return new RealtimeGateway({
        tokenVerifier: {
            verifyAccessToken: vi.fn().mockReturnValue(USER_ID.toString()),
            ...overrides.tokenVerifier,
        },
        repository: {
            isActiveUser: vi.fn().mockResolvedValue(true),
            isCurrentMember: vi.fn().mockResolvedValue(true),
            listCurrentMemberIds: vi.fn().mockResolvedValue([]),
            ...overrides.repository,
        } as RealtimeRepository,
    })
}

/** Build the small socket surface used by authentication, room, and revocation tests. */
function createSocket(token: string | undefined) {
    return {
        handshake: { auth: token === undefined ? {} : { token } },
        data: {} as Record<string, unknown>,
        join: vi.fn().mockResolvedValue(undefined),
        leave: vi.fn().mockResolvedValue(undefined),
        emit: vi.fn(),
        on: vi.fn(),
        disconnect: vi.fn(),
    } as unknown as Socket
}

/** Build one replaceable Socket.IO server interface without opening a network listener. */
function createTransport(sockets: readonly Socket[] = []) {
    const emit = vi.fn()
    const server = {
        use: vi.fn(),
        on: vi.fn(),
        to: vi.fn(() => ({ emit })),
        in: vi.fn(() => ({ fetchSockets: vi.fn().mockResolvedValue(sockets) })),
    } as unknown as Server
    return { server, emit }
}

/** Construct a complete safe message DTO to exercise room event serialization. */
function createMessage(): MessageDto {
    return {
        [MESSAGE_FIELDS.ID]: MESSAGE_ID,
        [MESSAGE_FIELDS.CONVERSATION_ID]: CONVERSATION_ID.toString(),
        [MESSAGE_FIELDS.SENDER_ID]: USER_ID.toString(),
        [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: "realtime-message",
        [MESSAGE_FIELDS.CONTENT]: "Visible message",
        [MESSAGE_FIELDS.REPLY_TO]: null,
        [MESSAGE_FIELDS.MENTIONS]: [],
        [MESSAGE_FIELDS.ATTACHMENTS]: [],
        [MESSAGE_FIELDS.CREATED_AT]: "2026-10-04T12:00:00.000Z",
        [MESSAGE_FIELDS.UPDATED_AT]: "2026-10-04T12:00:00.000Z",
    }
}
