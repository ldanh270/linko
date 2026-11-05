import { ERROR_CODES, type CreateReminderRequest, type ReminderDto } from "@linko/contracts"
import type { Types } from "mongoose"
import { BusinessException } from "../../shared/errors/BusinessException"
import { ConflictException } from "../../shared/errors/ConflictException"
import { NotFoundException } from "../../shared/errors/NotFoundException"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import type { UtilityActor, UtilityRuntime } from "../utility/utility.types"
import { SCHEDULING_ERRORS } from "../appointment/appointment.constants"
import { validateReminderTime } from "../appointment/appointment.validation"
import { toReminderDto } from "./reminder.mapper"
import { REMINDER_STATUS } from "./reminder.constants"
import type { ReminderDocument, ReminderRepository } from "./reminder.types"

/** Own private reminder intent and authorized inbox actions.
 * @layer Service
 */
export class ReminderService {
    /** Bind access/transaction ports independently from durable job storage. */
    constructor(private readonly dependencies: { repository: ReminderRepository; runtime: UtilityRuntime }) {}

    /** Schedule a private visible-message reminder without posting another chat message. */
    async create(actor: UtilityActor & { messageId: Types.ObjectId }, input: CreateReminderRequest): Promise<ReminderDto> {
        const { repository, runtime } = this.dependencies
        try {
            const record = await runtime.transactionRunner.run(async (transaction) => {
                await runtime.access.require({ ...actor, write: true }, transaction)
                const existing = await repository.findByClient(actor.actorId, input.clientMessageId, transaction)
                if (existing) {
                    if (!existing.conversationId.equals(actor.conversationId) || !existing.messageId.equals(actor.messageId)) throw new ConflictException(ERROR_CODES.CONFLICT, SCHEDULING_ERRORS.REVISION)
                    return existing
                }
                validateReminderTime(input.dueAt, runtime.clock.now())
                return repository.schedule({ ownerId: actor.actorId, conversationId: actor.conversationId, messageId: actor.messageId, appointmentId: null, appointmentRevision: null, clientMessageId: input.clientMessageId, title: "Lời nhắc tin nhắn", note: input.note?.trim() ?? "", dueAt: new Date(input.dueAt) }, transaction)
            })
            return toReminderDto(record)
        } catch (error) {
            if (!isDuplicate(error)) throw error
            await runtime.access.require(actor)
            const existing = await repository.findByClient(actor.actorId, input.clientMessageId)
            if (!existing || !existing.conversationId.equals(actor.conversationId) || !existing.messageId.equals(actor.messageId)) throw error
            return toReminderDto(existing)
        }
    }

    /** List only the actor's records whose underlying content remains accessible. */
    async list(actorId: Types.ObjectId): Promise<ReminderDto[]> {
        const records = await this.dependencies.repository.list(actorId)
        const visible: ReminderDto[] = []
        for (const record of records) {
            try { await this.authorize(record, actorId); visible.push(toReminderDto(record)) }
            catch (error) { if (!(error instanceof BusinessException)) throw error }
        }
        return visible
    }

    /** Read one owned reminder without exposing an inaccessible source preview. */
    async get(actorId: Types.ObjectId, id: Types.ObjectId): Promise<ReminderDto> {
        return toReminderDto(await this.requireOwned(actorId, id))
    }

    /** Mark one accessible delivered record read. */
    async read(actorId: Types.ObjectId, id: Types.ObjectId): Promise<ReminderDto> {
        await this.requireOwned(actorId, id)
        await this.dependencies.repository.markRead([id], actorId, this.dependencies.runtime.clock.now())
        return this.get(actorId, id)
    }

    /** Mark the bounded currently visible inbox read without touching another user's rows. */
    async readAll(actorId: Types.ObjectId): Promise<void> {
        const visible = await this.list(actorId)
        const { Types } = await import("mongoose")
        await this.dependencies.repository.markRead(visible.map((item) => new Types.ObjectId(item.id)), actorId, this.dependencies.runtime.clock.now())
    }

    /** Edit a future private reminder while invalidating any in-flight lease. */
    async edit(actorId: Types.ObjectId, id: Types.ObjectId, input: { dueAt: string; note?: string }): Promise<ReminderDto> {
        const { runtime, repository } = this.dependencies
        return runtime.transactionRunner.run(async (transaction) => {
            const record = await this.requireOwned(actorId, id, transaction)
            await runtime.access.require({ actorId, conversationId: record.conversationId, messageId: record.messageId, write: true }, transaction)
            validateReminderTime(input.dueAt, runtime.clock.now())
            const updated = await repository.edit({ id, ownerId: actorId, dueAt: new Date(input.dueAt), note: input.note?.trim() ?? record.note }, transaction)
            if (!updated) throw new ConflictException(ERROR_CODES.CONFLICT, SCHEDULING_ERRORS.REVISION)
            return toReminderDto(updated)
        })
    }

    /** Dismiss/cancel an owned accessible intent through soft deletion. */
    async dismiss(actorId: Types.ObjectId, id: Types.ObjectId): Promise<void> {
        await this.requireOwned(actorId, id)
        await this.dependencies.repository.dismiss(id, actorId)
    }

    private async requireOwned(actorId: Types.ObjectId, id: Types.ObjectId, transaction?: TransactionContext): Promise<ReminderDocument> {
        const record = await this.dependencies.repository.find(id, transaction)
        if (!record || !record.ownerId.equals(actorId) || record.status === REMINDER_STATUS.CANCELLED || record.status === REMINDER_STATUS.FAILED) throw new NotFoundException(SCHEDULING_ERRORS.NOT_FOUND)
        await this.authorize(record, actorId, transaction)
        return record
    }

    private async authorize(record: ReminderDocument, actorId: Types.ObjectId, transaction?: TransactionContext): Promise<void> {
        await this.dependencies.runtime.access.require({ actorId, conversationId: record.conversationId, messageId: record.messageId }, transaction)
    }
}

function isDuplicate(error: unknown): boolean { return typeof error === "object" && error !== null && "code" in error && error.code === 11000 }
