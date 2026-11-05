import { CONVERSATION_STATUS, CONVERSATION_TYPE, ERROR_CODES } from "@linko/contracts"
import type { Types } from "mongoose"
import { NotFoundException } from "../../shared/errors/NotFoundException"
import { ConflictException } from "../../shared/errors/ConflictException"
import { ForbiddenException } from "../../shared/errors/ForbiddenException"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import { UTILITY_ERRORS } from "./utility.constants"
import type { UtilityAccessPort, UtilityActor, UtilityMembership } from "./utility.types"

/** Persistence operations required by common utility authorization. */
export interface UtilityAccessRepository {
  membership(input: UtilityActor, transaction?: TransactionContext): Promise<UtilityMembership | null>
  visibleMessage(input: UtilityActor, joinedAt: Date, transaction?: TransactionContext): Promise<boolean>
  areFriends(memberIds: readonly Types.ObjectId[], transaction?: TransactionContext): Promise<boolean>
  fence(input: UtilityActor, transaction: TransactionContext): Promise<void>
}

/** Enforce the same membership/history contract for every chat utility.
 * @layer Service
 */
export class UtilityAccessService implements UtilityAccessPort {
  /** Inject membership and history persistence. */
  constructor(private readonly repository: UtilityAccessRepository) {}

  /** Require current membership, visible context and write eligibility. */
  async require(input: UtilityActor, transaction?: TransactionContext): Promise<UtilityMembership> {
    const member = await this.repository.membership(input, transaction)
    if (!member) throw new NotFoundException(UTILITY_ERRORS.UNAVAILABLE)
    if (input.messageId && !await this.repository.visibleMessage(input, member.joinedAt, transaction)) {
      throw new NotFoundException(UTILITY_ERRORS.UNAVAILABLE)
    }
    if (!input.write) return member
    if (member.status === CONVERSATION_STATUS.CLOSED) throw new ConflictException(ERROR_CODES.GROUP_CLOSED, UTILITY_ERRORS.CLOSED)
    if (member.type === CONVERSATION_TYPE.DIRECT && !await this.repository.areFriends(member.memberIds, transaction)) {
      throw new ForbiddenException(UTILITY_ERRORS.FRIENDSHIP, ERROR_CODES.FRIENDSHIP_REQUIRED)
    }
    if (transaction) await this.repository.fence(input, transaction)
    return member
  }
}
