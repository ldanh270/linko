import { ERROR_CODES, SOCKET_AUTH_FIELDS } from "@linko/contracts"
import { REGEX } from "../../configs/constants/regex"
import { UnauthorizedException } from "../../shared/errors/UnauthorizedException"
import { AUTH_MESSAGES } from "../auth/auth.constants"
import type { RealtimeAuthenticationDependencies, RealtimeSocket, SocketIdentity } from "./realtime.types"

/** Authenticate one handshake and reject deleted accounts before socket registration. */
export async function authenticateRealtimeSocket(
    socket: RealtimeSocket,
    dependencies: RealtimeAuthenticationDependencies,
): Promise<SocketIdentity> {
    const token = socket.handshake.auth[SOCKET_AUTH_FIELDS.TOKEN]
    if (typeof token !== "string") throw createUnauthorizedException()
    const userId = dependencies.tokenVerifier.verifyAccessToken(token)
    if (!userId || !REGEX.MONGO_ID.test(userId) || !(await dependencies.repository.isActiveUser(userId))) {
        throw createUnauthorizedException()
    }
    return { userId }
}

function createUnauthorizedException(): UnauthorizedException {
    return new UnauthorizedException(ERROR_CODES.UNAUTHORIZED, AUTH_MESSAGES.INVALID_SESSION)
}
