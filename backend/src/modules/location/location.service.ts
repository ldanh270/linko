import { CHAT_MESSAGE_KIND, ERROR_CODES, UTILITY_KIND, UTILITY_LIMITS, UTILITY_STATUS, type LocationShareDto } from "@linko/contracts"
import { Types } from "mongoose"
import { ConflictException } from "../../shared/errors/ConflictException"
import { ForbiddenException } from "../../shared/errors/ForbiddenException"
import { NotFoundException } from "../../shared/errors/NotFoundException"
import { MessageDuplicateKeyError } from "../message/MessageDuplicateKeyError"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import type { UtilityActor } from "../utility/utility.types"
import { LOCATION_ERRORS } from "./location.constants"
import type { LocationActor, LocationCreateInput, LocationDependencies, LocationDocument, LocationUpdateInput } from "./location.types"

/** Govern explicit foreground consent and expose only fresh, authorized coordinates.
 * @layer Service
 */
export class LocationService {
    /** Inject storage and shared access/message/clock/notification ports. */
    constructor(private readonly dependencies: LocationDependencies) {}

    /** Start one time-limited share per person/conversation with an initial accepted fix. */
    async create(input: LocationCreateInput): Promise<LocationShareDto> {
        const { runtime, repository } = this.dependencies
        const existing = await repository.findByCommand(input)
        if (existing) return this.get({ ...input, resourceId: existing._id })
        try {
            const result = await runtime.transactionRunner.run(async (transaction) => {
                await runtime.access.require({ ...input, write: true }, transaction)
                const duplicate = await repository.findByCommand(input, transaction)
                if (duplicate) return { share: duplicate, message: null }
                await repository.expireForCreator(input, runtime.clock.now(), transaction)
                if (await repository.findActive(input, transaction)) throw new ConflictException(ERROR_CODES.CONFLICT, LOCATION_ERRORS.ACTIVE)
                const prior = await runtime.timeline.find({ ...input, clientMessageId: input.request.clientMessageId }, transaction)
                if (prior) throw new ConflictException(ERROR_CODES.CONFLICT, LOCATION_ERRORS.IDEMPOTENCY)
                const resourceId = new Types.ObjectId()
                const message = await runtime.timeline.create({ ...input, clientMessageId: input.request.clientMessageId,
                    kind: CHAT_MESSAGE_KIND.LOCATION, resourceId, content: LOCATION_ERRORS.PREVIEW }, transaction)
                const share = await repository.create(input, resourceId, new Types.ObjectId(message.id), runtime.clock.now(), transaction)
                return { share, message }
            })
            if (result.message) await runtime.timeline.publish(result.message)
            return this.get({ ...input, resourceId: result.share._id })
        } catch (error: unknown) {
            if (!isDuplicateKey(error) && !(error instanceof MessageDuplicateKeyError)) throw error
            const prior = await repository.findByCommand(input)
            if (!prior) throw new ConflictException(ERROR_CODES.CONFLICT, LOCATION_ERRORS.ACTIVE)
            return this.get({ ...input, resourceId: prior._id })
        }
    }

    /** Read coordinates only after checking current conversation and source-message access. */
    async get(input: LocationActor): Promise<LocationShareDto> {
        const share = await this.requireVisible(input)
        return this.toDto(share, input.actorId)
    }

    /** List viewer-visible recent shares, omitting hidden and otherwise inaccessible source cards. */
    async list(input: UtilityActor): Promise<readonly LocationShareDto[]> {
        const membership = await this.dependencies.runtime.access.require(input)
        const shares = await this.dependencies.repository.list(input, membership.joinedAt)
        const eligible = await this.dependencies.repository.currentOwnerShareIds(shares)
        return Promise.all(shares.map((share) => this.toDto(share, input.actorId, eligible.has(share._id.toString()))))
    }

    /** Accept a throttled monotonic fix only from the original owner and publishing session. */
    async update(input: LocationUpdateInput): Promise<LocationShareDto> {
        const { runtime, repository } = this.dependencies
        await runtime.transactionRunner.run(async (transaction) => {
            const share = await this.requireVisible(input, transaction, true)
            if (!share.creatorId.equals(input.actorId)) throw new ForbiddenException(LOCATION_ERRORS.OWNER)
            if (!(await this.isActive(share, transaction))) throw new ConflictException(ERROR_CODES.CONFLICT, LOCATION_ERRORS.ENDED)
            if (!(await repository.acceptFix(input, runtime.clock.now(), transaction))) throw new ConflictException(ERROR_CODES.CONFLICT, LOCATION_ERRORS.STALE_FIX)
        })
        const updated = await this.get(input)
        await this.notify(updated)
        return updated
    }

    /** Stop sharing immediately; ended cards intentionally contain no last-known coordinate. */
    async stop(input: LocationActor): Promise<LocationShareDto> {
        const { runtime, repository } = this.dependencies
        await runtime.transactionRunner.run(async (transaction) => {
            const share = await this.requireVisible(input, transaction)
            if (!share.creatorId.equals(input.actorId)) throw new ForbiddenException(LOCATION_ERRORS.OWNER)
            await repository.end(input, runtime.clock.now(), transaction)
        })
        const updated = await this.get(input)
        await this.notify(updated)
        return updated
    }

    /** Remove precise stored coordinates for expired consent or no-longer-active creators. */
    async cleanup(): Promise<void> {
        const { runtime, repository } = this.dependencies
        for (const share of await repository.cleanupCandidates()) {
            if (await this.isActive(share)) continue
            if (!(await repository.end({ conversationId: share.conversationId, actorId: share.creatorId, resourceId: share._id }, runtime.clock.now()))) continue
            await runtime.notifier.changed({ conversationId: share.conversationId.toString(), kind: UTILITY_KIND.LOCATION, resourceId: share._id.toString(), revision: share.revision + 1 })
        }
    }

    private async requireVisible(input: LocationActor, transaction?: TransactionContext, write = false): Promise<LocationDocument> {
        await this.dependencies.runtime.access.require({ ...input, write }, transaction)
        const share = await this.dependencies.repository.find(input, transaction)
        if (!share) throw new NotFoundException(LOCATION_ERRORS.NOT_FOUND)
        await this.dependencies.runtime.access.require({ ...input, messageId: share.messageId, write }, transaction)
        return share
    }

    private async isActive(share: LocationDocument, transaction?: TransactionContext): Promise<boolean> {
        return share.status === UTILITY_STATUS.ACTIVE && share.expiresAt > this.dependencies.runtime.clock.now()
            && await this.dependencies.repository.ownerIsCurrent(share, transaction)
    }

    private async toDto(share: LocationDocument, actorId: Types.ObjectId, ownerIsCurrent?: boolean): Promise<LocationShareDto> {
        const active = share.status === UTILITY_STATUS.ACTIVE && share.expiresAt > this.dependencies.runtime.clock.now()
            && (ownerIsCurrent ?? await this.dependencies.repository.ownerIsCurrent(share))
        const hasPosition = active && typeof share.latitude === "number" && typeof share.longitude === "number" && typeof share.accuracy === "number" && share.lastFixAt
        return {
            id: share._id.toString(), conversationId: share.conversationId.toString(), messageId: share.messageId.toString(), creatorId: share.creatorId.toString(),
            createdAt: share.createdAt.toISOString(), revision: share.revision, expiresAt: share.expiresAt.toISOString(),
            endedAt: active ? null : (share.endedAt ?? new Date(Math.min(share.expiresAt.getTime(), this.dependencies.runtime.clock.now().getTime()))).toISOString(), status: active ? UTILITY_STATUS.ACTIVE : UTILITY_STATUS.ENDED,
            position: hasPosition ? { latitude: Number(share.latitude), longitude: Number(share.longitude), accuracy: Number(share.accuracy), updatedAt: new Date(hasPosition).toISOString() } : null,
            canStop: active && share.creatorId.equals(actorId), isStale: active && (!share.lastFixAt || this.dependencies.runtime.clock.now().getTime() - share.lastFixAt.getTime() > UTILITY_LIMITS.LOCATION_STALE_MS),
        }
    }

    private async notify(share: LocationShareDto): Promise<void> {
        await this.dependencies.runtime.notifier.changed({ conversationId: share.conversationId, kind: UTILITY_KIND.LOCATION, resourceId: share.id, revision: share.revision })
    }
}

function isDuplicateKey(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === 11000
}
