import { CHAT_MESSAGE_KIND, CONVERSATION_TYPE, ERROR_CODES, POLL_MODE, ROLE, UTILITY_KIND, UTILITY_STATUS, type PollDto } from "@linko/contracts"
import { Types } from "mongoose"
import { ConflictException } from "../../shared/errors/ConflictException"
import { ForbiddenException } from "../../shared/errors/ForbiddenException"
import { NotFoundException } from "../../shared/errors/NotFoundException"
import { ValidationException } from "../../shared/errors/ValidationException"
import { MessageDuplicateKeyError } from "../message/MessageDuplicateKeyError"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import type { UtilityActor, UtilityMembership } from "../utility/utility.types"
import { POLL_ERRORS } from "./poll.constants"
import type { EligiblePollVote, PollActor, PollCreateInput, PollDependencies, PollDocument, PollVoteInput } from "./poll.types"

/** Enforce named voting, idempotent creation and viewer-safe result access.
 * @layer Service
 */
export class PollService {
    /** Inject persistence and the common utility authorization/message boundary. */
    constructor(private readonly dependencies: PollDependencies) {}

    /** Create one poll and its timeline message atomically; retries return the existing poll. */
    async create(input: PollCreateInput): Promise<PollDto> {
        const { runtime, repository } = this.dependencies
        const existing = await repository.findByCommand(input)
        if (existing) return this.get({ ...input, resourceId: existing._id })
        if (input.request.closesAt && new Date(input.request.closesAt) <= runtime.clock.now()) throw new ValidationException(POLL_ERRORS.DEADLINE)
        try {
            const result = await runtime.transactionRunner.run(async (transaction) => {
                await runtime.access.require({ ...input, write: true }, transaction)
                const duplicate = await repository.findByCommand(input, transaction)
                if (duplicate) return { poll: duplicate, message: null }
                const previous = await runtime.timeline.find({ ...input, clientMessageId: input.request.clientMessageId }, transaction)
                if (previous) throw new ConflictException(ERROR_CODES.CONFLICT, POLL_ERRORS.IDEMPOTENCY)
                const resourceId = new Types.ObjectId()
                const message = await runtime.timeline.create({ ...input, clientMessageId: input.request.clientMessageId,
                    kind: CHAT_MESSAGE_KIND.POLL, resourceId, content: input.request.question }, transaction)
                const poll = await repository.create(input, resourceId, new Types.ObjectId(message.id), transaction)
                return { poll, message }
            })
            if (result.message) await runtime.timeline.publish(result.message)
            return this.get({ ...input, resourceId: result.poll._id })
        } catch (error: unknown) {
            if (!isDuplicateKey(error) && !(error instanceof MessageDuplicateKeyError)) throw error
            const prior = await repository.findByCommand(input)
            if (!prior) throw new ConflictException(ERROR_CODES.CONFLICT, POLL_ERRORS.IDEMPOTENCY)
            return this.get({ ...input, resourceId: prior._id })
        }
    }

    /** Read only a poll whose source message remains visible to the current member. */
    async get(input: PollActor): Promise<PollDto> {
        const { poll, membership } = await this.requireVisible(input)
        return this.toDto(poll, input.actorId, membership)
    }

    /** List visible polls without exposing hidden source messages through a secondary surface. */
    async list(input: UtilityActor): Promise<readonly PollDto[]> {
        const membership = await this.dependencies.runtime.access.require(input)
        const polls = await this.dependencies.repository.list(input, membership.joinedAt)
        const votes = await this.dependencies.repository.eligibleVotesMany(polls)
        return Promise.all(polls.map((poll) => this.toDto(poll, input.actorId, membership, votes.get(poll._id.toString()) ?? [])))
    }

    /** Replace a complete selection, or withdraw it explicitly, while the poll remains open. */
    async vote(input: PollVoteInput): Promise<PollDto> {
        const { runtime, repository } = this.dependencies
        await runtime.transactionRunner.run(async (transaction) => {
            const { poll } = await this.requireVisible(input, transaction, true)
            this.validateSelection(poll, input.optionIds)
            if (!(await repository.bumpRevision(poll, runtime.clock.now(), false, transaction))) throw new ConflictException(ERROR_CODES.CONFLICT, POLL_ERRORS.CLOSED)
            await repository.replaceVote(input, runtime.clock.now(), transaction)
        })
        const updated = await this.get(input)
        await this.notify(updated)
        return updated
    }

    /** Close a poll for its creator or a current group owner/admin. */
    async close(input: PollActor): Promise<PollDto> {
        const { runtime, repository } = this.dependencies
        await runtime.transactionRunner.run(async (transaction) => {
            const { poll, membership } = await this.requireVisible(input, transaction, true)
            if (!this.canManage(poll, input.actorId, membership)) throw new ForbiddenException(POLL_ERRORS.MANAGER)
            if (this.isClosed(poll)) return
            if (!(await repository.bumpRevision(poll, runtime.clock.now(), true, transaction))) throw new ConflictException(ERROR_CODES.CONFLICT, POLL_ERRORS.CLOSED)
        })
        const updated = await this.get(input)
        await this.notify(updated)
        return updated
    }

    private async requireVisible(input: PollActor, transaction?: TransactionContext, write = false): Promise<{ poll: PollDocument; membership: UtilityMembership }> {
        await this.dependencies.runtime.access.require({ ...input, write }, transaction)
        const poll = await this.dependencies.repository.find(input, transaction)
        if (!poll) throw new NotFoundException(POLL_ERRORS.NOT_FOUND)
        const membership = await this.dependencies.runtime.access.require({ ...input, messageId: poll.messageId, write }, transaction)
        return { poll, membership }
    }

    private validateSelection(poll: PollDocument, optionIds: readonly string[]): void {
        if (this.isClosed(poll)) throw new ConflictException(ERROR_CODES.CONFLICT, POLL_ERRORS.CLOSED)
        if (new Set(optionIds).size !== optionIds.length || optionIds.some((id) => !poll.options.some((option) => option._id.toString() === id))) {
            throw new ValidationException(POLL_ERRORS.INVALID_OPTIONS)
        }
        if (optionIds.length > 0 && poll.mode === POLL_MODE.SINGLE && optionIds.length !== 1) throw new ValidationException(POLL_ERRORS.SINGLE)
    }

    private isClosed(poll: PollDocument): boolean {
        return poll.status === UTILITY_STATUS.CLOSED || Boolean(poll.closesAt && poll.closesAt <= this.dependencies.runtime.clock.now())
    }

    private canManage(poll: PollDocument, actorId: Types.ObjectId, membership: UtilityMembership): boolean {
        return poll.creatorId.equals(actorId) || (membership.type === CONVERSATION_TYPE.GROUP && (membership.role === ROLE.OWNER || membership.role === ROLE.ADMIN))
    }

    private async toDto(poll: PollDocument, actorId: Types.ObjectId, membership: UtilityMembership, snapshot?: readonly EligiblePollVote[]): Promise<PollDto> {
        const votes = snapshot ?? await this.dependencies.repository.eligibleVotes(poll)
        return {
            id: poll._id.toString(), conversationId: poll.conversationId.toString(), messageId: poll.messageId.toString(), creatorId: poll.creatorId.toString(),
            createdAt: poll.createdAt.toISOString(), revision: poll.revision, question: poll.question, mode: poll.mode as PollDto["mode"],
            options: poll.options.map((option) => {
                const id = option._id.toString()
                const voterIds = votes.filter((vote) => vote.optionIds.includes(id)).map((vote) => vote.userId)
                return { id, text: option.text, count: voterIds.length, voterIds }
            }),
            selectedOptionIds: votes.find((vote) => vote.userId === actorId.toString())?.optionIds ?? [], voterCount: votes.length,
            closesAt: poll.closesAt?.toISOString() ?? null, status: this.isClosed(poll) ? UTILITY_STATUS.CLOSED : UTILITY_STATUS.ACTIVE,
            canClose: !this.isClosed(poll) && this.canManage(poll, actorId, membership),
        }
    }

    private async notify(poll: PollDto): Promise<void> {
        await this.dependencies.runtime.notifier.changed({ conversationId: poll.conversationId, kind: UTILITY_KIND.POLL, resourceId: poll.id, revision: poll.revision })
    }
}

function isDuplicateKey(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === 11000
}
