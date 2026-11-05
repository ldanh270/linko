import express, { type Router } from "express"
import { REMINDER_ROUTES, UTILITY_ROUTES } from "@linko/contracts"
import validate from "../../middlewares/validate.middleware"
import type { UtilityRuntime } from "../utility/utility.types"
import { MongooseReminderRepository } from "../reminder/reminder.repository"
import { ReminderService } from "../reminder/reminder.service"
import { ReminderWorker } from "../reminder/reminder.worker"
import { ReminderController } from "../reminder/reminder.controller"
import { reminderInboxSchema } from "../reminder/reminder.inbox.schema"
import { MongooseAppointmentRepository } from "./appointment.repository"
import { AppointmentService } from "./appointment.service"
import { AppointmentController } from "./appointment.controller"
import { appointmentResourceSchema, appointmentRsvpSchema, createAppointmentSchema, createReminderSchema, editReminderSchema, listAppointmentsSchema, reminderResourceSchema, updateAppointmentSchema } from "./appointment.schema"

/** Authenticated routers and explicit lifecycle for appointment/reminder scheduling. */
export interface SchedulingFeature { readonly conversationRouter: Router; readonly reminderRouter: Router; start(): void; stop(): Promise<void>; tick(): Promise<void> }

/** Compose scheduling collaborators once without starting workers on import.
 * @layer Composition
 */
export function createSchedulingFeature(runtime: UtilityRuntime): SchedulingFeature {
    const appointments = new MongooseAppointmentRepository()
    const reminders = new MongooseReminderRepository()
    const appointmentService = new AppointmentService({ repository: appointments, reminders, runtime })
    const reminderService = new ReminderService({ repository: reminders, runtime })
    const worker = new ReminderWorker({ appointments, reminders, runtime })
    const appointment = new AppointmentController(appointmentService)
    const reminder = new ReminderController(reminderService)
    const conversationRouter = express.Router()
    conversationRouter.get(UTILITY_ROUTES.APPOINTMENTS, validate(listAppointmentsSchema), appointment.list)
    conversationRouter.post(UTILITY_ROUTES.APPOINTMENTS, validate(createAppointmentSchema), appointment.create)
    conversationRouter.get(UTILITY_ROUTES.APPOINTMENT, validate(appointmentResourceSchema), appointment.get)
    conversationRouter.patch(UTILITY_ROUTES.APPOINTMENT, validate(updateAppointmentSchema), appointment.update)
    conversationRouter.post(UTILITY_ROUTES.CANCEL_APPOINTMENT, validate(appointmentResourceSchema), appointment.cancel)
    conversationRouter.put(UTILITY_ROUTES.RSVP, validate(appointmentRsvpSchema), appointment.respond)
    conversationRouter.post(UTILITY_ROUTES.MESSAGE_REMINDERS, validate(createReminderSchema), reminder.create)
    const reminderRouter = express.Router()
    reminderRouter.get(REMINDER_ROUTES.INBOX, validate(reminderInboxSchema), reminder.inbox)
    reminderRouter.get(REMINDER_ROUTES.LIST, reminder.list)
    reminderRouter.post(REMINDER_ROUTES.READ_ALL, reminder.readAll)
    reminderRouter.get(REMINDER_ROUTES.ITEM, validate(reminderResourceSchema), reminder.get)
    reminderRouter.patch(REMINDER_ROUTES.ITEM, validate(editReminderSchema), reminder.edit)
    reminderRouter.delete(REMINDER_ROUTES.ITEM, validate(reminderResourceSchema), reminder.dismiss)
    reminderRouter.patch(REMINDER_ROUTES.READ, validate(reminderResourceSchema), reminder.read)
    return { conversationRouter, reminderRouter, start: () => worker.start(), stop: () => worker.stop(), tick: () => worker.tick() }
}
