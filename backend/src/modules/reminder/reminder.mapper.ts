import type { ReminderDto } from "@linko/contracts"
import type { ReminderDocument } from "./reminder.types"
import { REMINDER_STATUS } from "./reminder.constants"

/** Strip lease, retry, actor/IP and internal scheduling metadata from an inbox item. */
export function toReminderDto(record: ReminderDocument): ReminderDto {
    return { id: record._id.toString(), conversationId: record.conversationId.toString(), messageId: record.messageId.toString(), title: record.title, note: record.note, dueAt: record.dueAt.toISOString(), deliveredAt: record.deliveredAt?.toISOString() ?? null, readAt: record.readAt?.toISOString() ?? null, status: record.status === REMINDER_STATUS.DELIVERED ? "delivered" : "pending", appointmentId: record.appointmentId?.toString() ?? null }
}
