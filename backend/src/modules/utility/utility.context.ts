import type { MessageDto } from "@linko/contracts"
import type { Types } from "mongoose"
import { toMessageDto } from "../message/message.mapper"
import type { MessageRecord } from "../message/message.types"
import { NotFoundException } from "../../shared/errors/NotFoundException"
import { UTILITY_ERRORS } from "./utility.constants"
import type { UtilityAccessPort, UtilityActor } from "./utility.types"

/** Authorized neighborhood persistence behind context navigation. */
export interface MessageContextRepository {
  findContext(input: { readonly conversationId: Types.ObjectId; readonly messageId: Types.ObjectId; readonly viewerId: Types.ObjectId; readonly joinedAt: Date }): Promise<readonly MessageRecord[]>
}
/** Resolve a deep-linked message beyond currently loaded history.
 * @layer Service
 */
export class UtilityContextService {
  /** Inject history authorization and bounded context persistence. */
  constructor(private readonly access: UtilityAccessPort, private readonly repository: MessageContextRepository) {}
  /** Return visible messages around the authorized target, in chronological order. */
  async get(input: UtilityActor & { readonly messageId: Types.ObjectId }): Promise<readonly MessageDto[]> {
    const member = await this.access.require(input)
    const messages = await this.repository.findContext({ conversationId: input.conversationId, viewerId: input.actorId, messageId: input.messageId, joinedAt: member.joinedAt })
    if (!messages.some((message) => message.id.equals(input.messageId))) throw new NotFoundException(UTILITY_ERRORS.UNAVAILABLE)
    return messages.map(toMessageDto)
  }
}
