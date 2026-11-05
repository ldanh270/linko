import { ERROR_CODES, type MessageDto } from "@linko/contracts"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import type { MessageRepository } from "../message/message.types"
import { toMessageDto } from "../message/message.mapper"
import type { UtilityMessageInput, UtilityTimelinePort } from "./utility.types"
import { ConflictException } from "../../shared/errors/ConflictException"
import { UTILITY_ERRORS } from "./utility.constants"

/** Adapt utility resource creation to the existing transactional chat timeline.
 * @pattern Adapter
 * @layer Service
 */
export class UtilityTimeline implements UtilityTimelinePort {
  /** Inject message storage, clock and best-effort post-commit transport. */
  constructor(private readonly dependencies: { readonly repository: MessageRepository; readonly now: () => Date; readonly publish: (message: MessageDto) => Promise<void>; readonly onError: (error: unknown) => void }) {}

  /** Insert a typed card and update unread/last-message state in one transaction. */
  async create(input: UtilityMessageInput, transaction: TransactionContext): Promise<MessageDto> {
    const previous = await this.find(input, transaction)
    if (previous) throw new ConflictException(ERROR_CODES.CONFLICT, UTILITY_ERRORS.CLIENT_KEY_USED)
    const message = await this.dependencies.repository.createMessage({
      conversationId: input.conversationId, senderId: input.actorId, clientMessageId: input.clientMessageId,
      content: input.content, kind: input.kind, resourceId: input.resourceId,
      replyToId: null, mentions: [], attachments: [], createdAt: this.dependencies.now(),
    }, transaction)
    await this.dependencies.repository.updateConversationAfterMessage(message, transaction)
    return toMessageDto(message)
  }

  /** Resolve a sender-scoped retry without creating a second resource/card. */
  async find(input: Pick<UtilityMessageInput, "conversationId" | "actorId" | "clientMessageId">, transaction?: TransactionContext): Promise<MessageDto | null> {
    const message = await this.dependencies.repository.findByClientMessageId(input.conversationId, input.actorId, input.clientMessageId, transaction)
    return message ? toMessageDto(message) : null
  }

  /** Keep committed messages successful even when realtime transport is unavailable. */
  async publish(message: MessageDto): Promise<void> {
    await this.dependencies.publish(message).catch(this.dependencies.onError)
  }
}
