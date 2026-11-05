import { CONVERSATION_TYPE, ROLE, RSVP_STATUS, UTILITY_STATUS, type AppointmentDto } from "@linko/contracts"
import type { Types } from "mongoose"
import type { UtilityMembership } from "../utility/utility.types"
import type { AppointmentDocument, AppointmentResponseDocument } from "./appointment.types"

/** Determine management rights from creator identity and current group role. */
export function canManageAppointment(record: AppointmentDocument, actorId: Types.ObjectId, membership: UtilityMembership): boolean {
    return record.creatorId.equals(actorId) || (membership.type === CONVERSATION_TYPE.GROUP && (membership.role === ROLE.OWNER || membership.role === ROLE.ADMIN))
}

/** Map authorized appointment and response snapshots without internal audit fields. */
export function toAppointmentDto(input: { record: AppointmentDocument; responses: readonly AppointmentResponseDocument[]; actorId: Types.ObjectId; membership: UtilityMembership }): AppointmentDto {
    const { record, actorId, membership, responses } = input
    const mine = responses.find((response) => response.userId.equals(actorId))
    return {
        id: record._id.toString(), conversationId: record.conversationId.toString(), messageId: record.messageId.toString(), creatorId: record.creatorId.toString(), createdAt: record.createdAt.toISOString(), revision: record.revision,
        title: record.title, description: record.description, startsAt: record.startsAt.toISOString(), endsAt: record.endsAt?.toISOString() ?? null,
        updatedAt: record.updatedAt.toISOString(),
        timezone: record.timezone, place: record.place, status: record.status === UTILITY_STATUS.CANCELLED ? UTILITY_STATUS.CANCELLED : UTILITY_STATUS.ACTIVE,
        responses: responses.map((response) => ({ userId: response.userId.toString(), status: response.status as typeof RSVP_STATUS[keyof typeof RSVP_STATUS] })),
        myResponse: mine ? mine.status as typeof RSVP_STATUS[keyof typeof RSVP_STATUS] : null, reminderMinutes: mine?.reminderMinutes ?? null,
        canManage: canManageAppointment(record, actorId, membership),
    }
}
