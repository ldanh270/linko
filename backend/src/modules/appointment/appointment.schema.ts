import { z } from "zod"
import { REMINDER_OFFSETS, RSVP_STATUS, UTILITY_LIMITS } from "@linko/contracts"
import { SCHEDULING_LIMITS } from "./appointment.constants"

const identifier = z.string().regex(/^[a-f\d]{24}$/i)
const instant = z.string().datetime({ offset: true })
const place = z.string().trim().max(SCHEDULING_LIMITS.MAX_PLACE).refine((value) => !/^\w+:/.test(value) || /^https:\/\//i.test(value), "Meeting links must use HTTPS")
const fields = { title: z.string().trim().min(1).max(UTILITY_LIMITS.TITLE), description: z.string().trim().max(UTILITY_LIMITS.DESCRIPTION).optional(), startsAt: instant, endsAt: instant.nullable().optional(), timezone: z.string().min(1).max(100), place: place.optional() }
const params = z.object({ id: identifier })
const resourceParams = params.extend({ resourceId: identifier })

/** Validate appointment list/current-membership parameters. */
export const listAppointmentsSchema = z.object({ params })
/** Validate idempotent one-off appointment creation before domain rules. */
export const createAppointmentSchema = z.object({ params, body: z.object({ ...fields, clientMessageId: z.string().min(1).max(SCHEDULING_LIMITS.MAX_ID), sourceMessageId: identifier.optional() }).strict() })
/** Validate one appointment target. */
export const appointmentResourceSchema = z.object({ params: resourceParams })
/** Validate edit fields with optimistic concurrency revision. */
export const updateAppointmentSchema = z.object({ params: resourceParams, body: z.object({ ...fields, revision: z.number().int().min(1) }).strict() })
/** Validate an explicit personal RSVP/reminder choice. */
export const appointmentRsvpSchema = z.object({ params: resourceParams, body: z.object({ status: z.enum(Object.values(RSVP_STATUS)), reminderMinutes: z.number().int().refine((value) => (REMINDER_OFFSETS as readonly number[]).includes(value)).nullable() }).strict() })
/** Validate a private source-message reminder command. */
export const createReminderSchema = z.object({ params: params.extend({ messageId: identifier }), body: z.object({ clientMessageId: z.string().min(1).max(SCHEDULING_LIMITS.MAX_ID), dueAt: instant, note: z.string().trim().max(SCHEDULING_LIMITS.MAX_NOTE).optional() }).strict() })
/** Validate a personal inbox target without accepting an owner from the client. */
export const reminderResourceSchema = z.object({ params: z.object({ resourceId: identifier }) })
/** Validate editing an undelivered private message reminder. */
export const editReminderSchema = z.object({ params: z.object({ resourceId: identifier }), body: z.object({ dueAt: instant, note: z.string().trim().max(SCHEDULING_LIMITS.MAX_NOTE).optional() }).strict() })
