import { TYPING_TIMING, type TypingEventDto } from "@linko/contracts"
import { REGEX } from "../../configs/constants/regex"
import type { RealtimeRepository } from "./realtime.types"

/** Authenticated connection context; client payload cannot choose its sender. */
export interface TypingUpdateInput {
    readonly userId: string
    readonly socketId: string
    readonly payload: unknown
    readonly isTyping: boolean
}

/** Authorize transient typing updates independently of transport delivery. */
export interface TypingHandler {
    /** Return an authorized event, or null for invalid or throttled input. */
    update(input: TypingUpdateInput): Promise<TypingEventDto | null>
    /** Release per-connection rate state after disconnection. */
    release(socketId: string): void
}

/** Validate membership and limit typing refreshes without persisting transient activity.
 * @layer Service
 */
export class TypingService implements TypingHandler {
    private readonly refreshes = new Map<string, Map<string, number>>()

    /** Inject membership persistence and a clock so timing remains deterministic. */
    constructor(private readonly membership: Pick<RealtimeRepository, "isCurrentMember">, private readonly now = Date.now) {}

    /** Return only authenticated member updates; stop always bypasses the refresh throttle. */
    async update(input: TypingUpdateInput): Promise<TypingEventDto | null> {
        const conversationId = this.parseConversation(input.payload)
        if (!conversationId) return null
        const refreshes = this.refreshes.get(input.socketId) ?? new Map<string, number>()
        const previous = refreshes.get(conversationId)
        if (input.isTyping && previous !== undefined && this.now() - previous < TYPING_TIMING.REFRESH_MS) return null
        if (!(await this.membership.isCurrentMember(conversationId, input.userId))) return null
        if (input.isTyping) refreshes.set(conversationId, this.now())
        else refreshes.delete(conversationId)
        this.refreshes.set(input.socketId, refreshes)
        return { conversationId, userId: input.userId, isTyping: input.isTyping }
    }

    /** Discard rate state when the owning socket ends. */
    release(socketId: string): void {
        this.refreshes.delete(socketId)
    }

    private parseConversation(payload: unknown): string | null {
        if (typeof payload !== "object" || payload === null || !("conversationId" in payload)) return null
        const candidate = payload.conversationId
        return typeof candidate === "string" && REGEX.MONGO_ID.test(candidate) ? candidate : null
    }
}
