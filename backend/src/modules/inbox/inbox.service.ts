import {
    CONVERSATION_KIND,
    CURSOR_PAGE_FIELDS,
    INBOX_LIMITS,
    type ConversationKind,
} from "@linko/contracts"
import mongoose from "mongoose"

import { ValidationException } from "../../shared/errors/ValidationException"
import {
    INBOX_CURSOR_ID_PATTERN,
    INBOX_CURSOR_FIELDS,
    INBOX_ERROR_MESSAGES,
} from "./inbox.constants"
import { toInboxItemDto } from "./inbox.mapper"
import type {
    InboxCursor,
    InboxPageDto,
    InboxServiceDependencies,
    ListInboxInput,
} from "./inbox.types"

/** Validate inbox filters and return a stable page for the authenticated participant.
 *
 * @layer Service
 */
export class InboxService {
    /** Bind the inbox persistence port. */
    constructor(private readonly dependencies: InboxServiceDependencies) {}

    /** List current conversations with caller-only unread counts and visible previews.
     *
     * @param input - Authenticated user, optional conversation filter/cursor, and bounded page size.
     * @returns A stable activity-ordered page and an opaque cursor for older items.
     * @throws {ValidationException} When the filter, cursor, or page size is invalid.
     */
    async list(input: ListInboxInput): Promise<InboxPageDto> {
        validateKind(input.kind)
        validatePageLimit(input.limit)
        const cursor = input.cursor ? decodeCursor(input.cursor) : null
        const page = await this.dependencies.repository.findPage({
            userId: input.userId,
            kind: input.kind,
            cursor,
            limit: input.limit,
        })
        const lastItem = page.items.length > 0 ? page.items[page.items.length - 1] : undefined
        return {
            [CURSOR_PAGE_FIELDS.ITEMS]: page.items.map(toInboxItemDto),
            [CURSOR_PAGE_FIELDS.NEXT_CURSOR]: page.hasMore && lastItem ? encodeCursor(lastItem) : null,
        }
    }
}

function validateKind(kind: ConversationKind): void {
    if (!Object.values(CONVERSATION_KIND).includes(kind)) {
        throw new ValidationException(INBOX_ERROR_MESSAGES.INVALID_KIND)
    }
}

function validatePageLimit(limit: number): void {
    if (!Number.isInteger(limit) || limit < 1 || limit > INBOX_LIMITS.MAX_PAGE_SIZE) {
        throw new ValidationException(INBOX_ERROR_MESSAGES.INVALID_PAGE_LIMIT)
    }
}

function encodeCursor(item: { readonly id: mongoose.Types.ObjectId; readonly activityAt: Date }): string {
    return Buffer.from(JSON.stringify({
        [INBOX_CURSOR_FIELDS.ACTIVITY_AT]: item.activityAt.toISOString(),
        [INBOX_CURSOR_FIELDS.ID]: item.id.toString(),
    })).toString("base64url")
}

function decodeCursor(value: string): InboxCursor {
    if (value.length > INBOX_LIMITS.MAX_CURSOR_LENGTH) {
        throw new ValidationException(INBOX_ERROR_MESSAGES.INVALID_CURSOR)
    }
    try {
        const decoded: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"))
        if (!isInboxCursor(decoded)) throw new ValidationException(INBOX_ERROR_MESSAGES.INVALID_CURSOR)
        const activityAt = new Date(decoded.activityAt)
        if (Number.isNaN(activityAt.getTime())) throw new ValidationException(INBOX_ERROR_MESSAGES.INVALID_CURSOR)
        return { activityAt, id: new mongoose.Types.ObjectId(decoded.id) }
    } catch (error) {
        if (error instanceof ValidationException) throw error
        throw new ValidationException(INBOX_ERROR_MESSAGES.INVALID_CURSOR)
    }
}

function isInboxCursor(value: unknown): value is { readonly activityAt: string; readonly id: string } {
    if (typeof value !== "object" || value === null) return false
    if (!(INBOX_CURSOR_FIELDS.ACTIVITY_AT in value) || !(INBOX_CURSOR_FIELDS.ID in value)) return false
    const activityAt = value[INBOX_CURSOR_FIELDS.ACTIVITY_AT]
    const id = value[INBOX_CURSOR_FIELDS.ID]
    return typeof activityAt === "string"
        && typeof id === "string"
        && INBOX_CURSOR_ID_PATTERN.test(id)
}
