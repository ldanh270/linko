import { ERROR_CODES, MESSAGE_LIMITS } from "@linko/contracts"

import { ForbiddenException } from "../../shared/errors/ForbiddenException"
import { ValidationException } from "../../shared/errors/ValidationException"
import { MESSAGE_ERROR_MESSAGES } from "./message.constants"
import type {
    ReplyMentionInput,
    ReplyMentionServiceDependencies,
    ValidatedMessageContext,
} from "./replyMention.types"

/** Validate that message references respect conversation history and membership.
 *
 * @layer Service
 */
export class ReplyMentionService {
    /** Inject the narrow repository used for member and reply-target visibility. */
    constructor(private readonly dependencies: ReplyMentionServiceDependencies) {}

    /** Accept only visible reply targets and current-member mentions.
     *
     * @param input - Sender, conversation, reply target, mentions, and optional transaction.
     * @returns Deduplicated mention IDs and the validated reply target ID.
     * @throws {ForbiddenException} When the sender or reply target is not visible.
     * @throws {ValidationException} When mentions are invalid or exceed the contract limit.
     */
    async validate(input: ReplyMentionInput): Promise<ValidatedMessageContext> {
        const memberContext = await this.dependencies.repository.findMemberContext(
            input.conversationId,
            input.senderId,
            input.transaction,
        )
        if (!memberContext) {
            throw new ForbiddenException(MESSAGE_ERROR_MESSAGES.NOT_A_MEMBER, ERROR_CODES.FORBIDDEN)
        }

        const mentions = uniqueIds(input.mentionIds)
        if (mentions.length > MESSAGE_LIMITS.MAX_MENTIONS) {
            throw new ValidationException(MESSAGE_ERROR_MESSAGES.TOO_MANY_MENTIONS)
        }
        if (mentions.some((mentionId) => !memberContext.activeMemberIds.some((memberId) => memberId.equals(mentionId)))) {
            throw new ValidationException(MESSAGE_ERROR_MESSAGES.NONMEMBER_MENTION)
        }

        const replyToId = input.replyToId
        if (replyToId) {
            await this.assertReplyVisible(input, replyToId, memberContext.joinedAt)
        }

        return { replyToId: input.replyToId, mentions }
    }

    private async assertReplyVisible(input: ReplyMentionInput, replyToId: NonNullable<ReplyMentionInput["replyToId"]>, joinedAt: Date): Promise<void> {
        const target = await this.dependencies.repository.findReplyTarget(
            input.conversationId,
            replyToId,
            input.senderId,
            input.transaction,
        )
        if (!target || target.createdAt < joinedAt) {
            throw new ForbiddenException(MESSAGE_ERROR_MESSAGES.INVALID_REPLY, ERROR_CODES.INVALID_REPLY)
        }
    }
}

function uniqueIds(ids: ReplyMentionInput["mentionIds"]): ReplyMentionInput["mentionIds"] {
    return [...new Map(ids.map((id): readonly [string, ReplyMentionInput["mentionIds"][number]] => [id.toString(), id])).values()]
}
