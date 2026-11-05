import { CHAT_MESSAGE_KIND, ERROR_CODES, REMINDER_OFFSETS, RSVP_STATUS, UTILITY_KIND, UTILITY_STATUS, type AppointmentDto, type AppointmentRsvpRequest, type CreateAppointmentRequest, type UpdateAppointmentRequest } from "@linko/contracts"
import { Types } from "mongoose"
import { BusinessException } from "../../shared/errors/BusinessException"
import { ConflictException } from "../../shared/errors/ConflictException"
import { ForbiddenException } from "../../shared/errors/ForbiddenException"
import { NotFoundException } from "../../shared/errors/NotFoundException"
import { ValidationException } from "../../shared/errors/ValidationException"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import type { UtilityActor, UtilityRuntime } from "../utility/utility.types"
import type { ReminderRepository } from "../reminder/reminder.types"
import { SCHEDULING_ERRORS, SCHEDULING_LIMITS } from "./appointment.constants"
import { canManageAppointment, toAppointmentDto } from "./appointment.mapper"
import type { AppointmentDocument, AppointmentRepository, AppointmentResponseDocument } from "./appointment.types"
import { validateAppointmentTime } from "./appointment.validation"

/** Orchestrate one-off group/direct appointments and explicit personal reminders.
 * @layer Service
 */
export class AppointmentService {
    /** Inject persistence and transaction/access boundaries. */
    constructor(private readonly dependencies: { repository: AppointmentRepository; reminders: ReminderRepository; runtime: UtilityRuntime }) {}

    /** Create a resource and its timeline card atomically; retries reuse the original. */
    async create(actor: UtilityActor, input: CreateAppointmentRequest): Promise<AppointmentDto> {
        const { runtime, repository } = this.dependencies
        let resourceId: Types.ObjectId
        try {
            resourceId = await runtime.transactionRunner.run(async (transaction) => {
                const membership = await runtime.access.require({ ...actor, write: true }, transaction)
                const existing = await repository.findByClient({ ...actor, clientMessageId: input.clientMessageId }, transaction)
                if (existing) return existing._id
                validateAppointmentTime(input, runtime.clock.now())
                if (input.sourceMessageId) await runtime.access.require({ ...actor, messageId: new Types.ObjectId(input.sourceMessageId) }, transaction)
                const id = new Types.ObjectId()
                const message = await runtime.timeline.create({ ...actor, clientMessageId: input.clientMessageId, kind: CHAT_MESSAGE_KIND.APPOINTMENT, resourceId: id, content: `Lịch hẹn: ${input.title}` }, transaction)
                const record = await repository.create({ _id: id, conversationId: actor.conversationId, creatorId: actor.actorId, messageId: new Types.ObjectId(message.id), clientMessageId: input.clientMessageId, ...editableFields(input), status: UTILITY_STATUS.ACTIVE, revision: 1 }, transaction)
                const offset = record.startsAt.getTime() - SCHEDULING_LIMITS.MINUTE_MS * 15 > runtime.clock.now().getTime() ? 15 : null
                await repository.respond({ appointmentId: id, userId: actor.actorId, status: RSVP_STATUS.GOING, reminderMinutes: offset, joinedAt: membership.joinedAt }, transaction)
                if (offset !== null) await this.schedule(record, actor.actorId, offset, transaction)
                return id
            })
        } catch (error) {
            if (!isDuplicate(error)) throw error
            await runtime.access.require(actor)
            const existing = await repository.findByClient({ ...actor, clientMessageId: input.clientMessageId })
            if (!existing) throw error
            resourceId = existing._id
        }
        const message = await runtime.timeline.find({ ...actor, clientMessageId: input.clientMessageId })
        if (message) await runtime.timeline.publish(message)
        return this.get(actor, resourceId)
    }

    /** Read one appointment only through its visible source message. */
    async get(actor: UtilityActor, id: Types.ObjectId): Promise<AppointmentDto> {
        const record = await this.requireRecord(actor, id)
        const membership = await this.dependencies.runtime.access.require({ ...actor, messageId: record.messageId })
        const responses = await this.eligibleResponses(record)
        return toAppointmentDto({ record, responses, actorId: actor.actorId, membership })
    }

    /** List a bounded set while omitting inaccessible historical resources. */
    async list(actor: UtilityActor): Promise<AppointmentDto[]> {
        await this.dependencies.runtime.access.require(actor)
        const records = await this.dependencies.repository.list(actor.conversationId)
        const results: AppointmentDto[] = []
        for (const record of records) {
            try { results.push(await this.get(actor, record._id)) }
            catch (error) { if (!(error instanceof BusinessException)) throw error }
        }
        return results
    }

    /** Edit with optimistic revision and rebuild pending jobs in the same transaction. */
    async update(actor: UtilityActor, id: Types.ObjectId, input: UpdateAppointmentRequest): Promise<AppointmentDto> {
        const { runtime, repository, reminders } = this.dependencies
        await runtime.transactionRunner.run(async (transaction) => {
            const record = await this.requireRecord(actor, id, transaction)
            const membership = await runtime.access.require({ ...actor, messageId: record.messageId, write: true }, transaction)
            if (!canManageAppointment(record, actor.actorId, membership)) throw new ForbiddenException(SCHEDULING_ERRORS.MANAGE)
            assertActive(record)
            validateAppointmentTime(input, runtime.clock.now())
            const updated = await repository.update({ id, revision: input.revision, fields: editableFields(input) }, transaction)
            if (!updated) throw new ConflictException(ERROR_CODES.CONFLICT, SCHEDULING_ERRORS.REVISION)
            await reminders.invalidate(id, transaction)
            for (const response of await this.eligibleResponses(updated, transaction)) {
                if (response.status !== RSVP_STATUS.DECLINED && response.reminderMinutes != null) await this.schedule(updated, response.userId, response.reminderMinutes, transaction)
            }
        })
        return this.changed(actor, id)
    }

    /** Cancel an appointment idempotently, including every undispatched reminder. */
    async cancel(actor: UtilityActor, id: Types.ObjectId): Promise<AppointmentDto> {
        const { runtime, repository, reminders } = this.dependencies
        await runtime.transactionRunner.run(async (transaction) => {
            const record = await this.requireRecord(actor, id, transaction)
            const membership = await runtime.access.require({ ...actor, messageId: record.messageId }, transaction)
            if (!canManageAppointment(record, actor.actorId, membership)) throw new ForbiddenException(SCHEDULING_ERRORS.MANAGE)
            if (record.status !== UTILITY_STATUS.CANCELLED) await repository.update({ id, revision: record.revision, fields: { status: UTILITY_STATUS.CANCELLED } }, transaction)
            await reminders.invalidate(id, transaction)
        })
        return this.changed(actor, id)
    }

    /** Replace the actor's RSVP and reminder choice, never another member's choice. */
    async respond(actor: UtilityActor, id: Types.ObjectId, input: AppointmentRsvpRequest): Promise<AppointmentDto> {
        const { runtime, repository, reminders } = this.dependencies
        await runtime.transactionRunner.run(async (transaction) => {
            const record = await this.requireRecord(actor, id, transaction)
            const membership = await runtime.access.require({ ...actor, messageId: record.messageId, write: true }, transaction)
            assertActive(record)
            const offset = input.status === RSVP_STATUS.DECLINED ? null : input.reminderMinutes
            if (offset !== null && (!(REMINDER_OFFSETS as readonly number[]).includes(offset) || record.startsAt.getTime() - offset * SCHEDULING_LIMITS.MINUTE_MS <= runtime.clock.now().getTime())) throw new ValidationException(SCHEDULING_ERRORS.OFFSET)
            await repository.respond({ appointmentId: id, userId: actor.actorId, status: input.status, reminderMinutes: offset, joinedAt: membership.joinedAt }, transaction)
            const updated = await repository.update({ id, revision: record.revision, fields: {} }, transaction)
            if (!updated) throw new ConflictException(ERROR_CODES.CONFLICT, SCHEDULING_ERRORS.REVISION)
            await reminders.invalidate(id, transaction, actor.actorId)
            await reminders.rebase({ appointmentId: id, fromRevision: record.revision, toRevision: updated.revision }, transaction)
            if (offset !== null) await this.schedule(updated, actor.actorId, offset, transaction)
        })
        return this.changed(actor, id)
    }

    private async requireRecord(actor: UtilityActor, id: Types.ObjectId, transaction?: TransactionContext): Promise<AppointmentDocument> {
        await this.dependencies.runtime.access.require(actor, transaction)
        const record = await this.dependencies.repository.find(id, transaction)
        if (!record || !record.conversationId.equals(actor.conversationId)) throw new NotFoundException(SCHEDULING_ERRORS.NOT_FOUND)
        await this.dependencies.runtime.access.require({ ...actor, messageId: record.messageId }, transaction)
        return record
    }

    private async eligibleResponses(record: AppointmentDocument, transaction?: TransactionContext): Promise<AppointmentResponseDocument[]> {
        const { runtime, repository } = this.dependencies
        const responses = await repository.responses(record._id, transaction)
        const eligible: AppointmentResponseDocument[] = []
        for (const response of responses) {
            try {
                const member = await runtime.access.require({ conversationId: record.conversationId, actorId: response.userId, messageId: record.messageId }, transaction)
                if (member.joinedAt.getTime() <= response.joinedAt.getTime()) eligible.push(response)
            } catch (error) { if (!(error instanceof BusinessException)) throw error }
        }
        return eligible
    }

    private async schedule(record: AppointmentDocument, ownerId: Types.ObjectId, offset: number, transaction: TransactionContext): Promise<void> {
        const dueAt = new Date(record.startsAt.getTime() - offset * SCHEDULING_LIMITS.MINUTE_MS)
        if (dueAt <= this.dependencies.runtime.clock.now()) return
        await this.dependencies.reminders.schedule({ ownerId, conversationId: record.conversationId, messageId: record.messageId, appointmentId: record._id, appointmentRevision: record.revision, clientMessageId: `${record._id}:${ownerId}:${record.revision}`, title: record.title, note: "", dueAt }, transaction)
    }

    private async changed(actor: UtilityActor, id: Types.ObjectId): Promise<AppointmentDto> {
        const result = await this.get(actor, id)
        await this.dependencies.runtime.notifier.changed({ conversationId: actor.conversationId.toString(), kind: UTILITY_KIND.APPOINTMENT, resourceId: id.toString(), revision: result.revision })
        return result
    }
}

function editableFields(input: Omit<CreateAppointmentRequest, "clientMessageId">) {
    return { title: input.title.trim(), description: input.description?.trim() ?? "", startsAt: new Date(input.startsAt), endsAt: input.endsAt ? new Date(input.endsAt) : null, timezone: input.timezone, place: input.place?.trim() ?? "" }
}
function assertActive(record: AppointmentDocument): void {
    if (record.status !== UTILITY_STATUS.ACTIVE) throw new ConflictException(ERROR_CODES.CONFLICT, SCHEDULING_ERRORS.CANCELLED)
}
function isDuplicate(error: unknown): boolean { return typeof error === "object" && error !== null && "code" in error && error.code === 11000 }
