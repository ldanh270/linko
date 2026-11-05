import { API_ROUTES, REMINDER_ROUTES, UTILITY_ROUTES, type PollDto, type AppointmentDto, type LocationShareDto, type ReminderDto, type MessageDto, type CreatePollRequest, type CreateAppointmentRequest, type UpdateAppointmentRequest, type AppointmentRsvpRequest, type CreateLocationRequest, type UpdateLocationRequest, type CreateReminderRequest } from "@linko/contracts"
import { authenticatedApiClient } from "@/features/auth/api/auth.api"
import type { ReminderInboxDto } from "@linko/contracts"

/** Build a shared route using validated resource identifiers without duplicating endpoint strings. */
export function utilityPath(route: string, conversationId: string, resourceId = ""): string {
  return API_ROUTES.CONVERSATIONS + route.replace(":id", encodeURIComponent(conversationId)).replace(":resourceId", encodeURIComponent(resourceId))
}
/** Typed transport for utility resources; all authorization remains on the server. */
export const utilityApi = {
  polls: (id: string) => authenticatedApiClient.request<PollDto[]>({ path: utilityPath(UTILITY_ROUTES.POLLS, id) }),
  poll: (id: string, resource: string) => authenticatedApiClient.request<PollDto>({ path: utilityPath(UTILITY_ROUTES.POLL, id, resource) }),
  createPoll: (id: string, body: CreatePollRequest) => authenticatedApiClient.request<PollDto>({ path: utilityPath(UTILITY_ROUTES.POLLS, id), method: "POST", body }),
  vote: (id: string, resource: string, optionIds: readonly string[]) => authenticatedApiClient.request<PollDto>({ path: utilityPath(UTILITY_ROUTES.VOTE, id, resource), method: "PUT", body: { optionIds } }),
  withdraw: (id: string, resource: string) => authenticatedApiClient.request<PollDto>({ path: utilityPath(UTILITY_ROUTES.VOTE, id, resource), method: "DELETE" }),
  closePoll: (id: string, resource: string) => authenticatedApiClient.request<PollDto>({ path: utilityPath(UTILITY_ROUTES.CLOSE_POLL, id, resource), method: "POST" }),
  appointments: (id: string) => authenticatedApiClient.request<AppointmentDto[]>({ path: utilityPath(UTILITY_ROUTES.APPOINTMENTS, id) }),
  appointment: (id: string, resource: string) => authenticatedApiClient.request<AppointmentDto>({ path: utilityPath(UTILITY_ROUTES.APPOINTMENT, id, resource) }),
  createAppointment: (id: string, body: CreateAppointmentRequest) => authenticatedApiClient.request<AppointmentDto>({ path: utilityPath(UTILITY_ROUTES.APPOINTMENTS, id), method: "POST", body }),
  editAppointment: (id: string, resource: string, body: UpdateAppointmentRequest) => authenticatedApiClient.request<AppointmentDto>({ path: utilityPath(UTILITY_ROUTES.APPOINTMENT, id, resource), method: "PATCH", body }),
  rsvp: (id: string, resource: string, body: AppointmentRsvpRequest) => authenticatedApiClient.request<AppointmentDto>({ path: utilityPath(UTILITY_ROUTES.RSVP, id, resource), method: "PUT", body }),
  cancelAppointment: (id: string, resource: string) => authenticatedApiClient.request<AppointmentDto>({ path: utilityPath(UTILITY_ROUTES.CANCEL_APPOINTMENT, id, resource), method: "POST" }),
  locations: (id: string) => authenticatedApiClient.request<LocationShareDto[]>({ path: utilityPath(UTILITY_ROUTES.LOCATIONS, id) }),
  location: (id: string, resource: string) => authenticatedApiClient.request<LocationShareDto>({ path: utilityPath(UTILITY_ROUTES.LOCATION, id, resource) }),
  createLocation: (id: string, body: CreateLocationRequest) => authenticatedApiClient.request<LocationShareDto>({ path: utilityPath(UTILITY_ROUTES.LOCATIONS, id), method: "POST", body }),
  fix: (id: string, resource: string, body: UpdateLocationRequest) => authenticatedApiClient.request<LocationShareDto>({ path: utilityPath(UTILITY_ROUTES.LOCATION_FIX, id, resource), method: "PUT", body }),
  stopLocation: (id: string, resource: string) => authenticatedApiClient.request<LocationShareDto>({ path: utilityPath(UTILITY_ROUTES.STOP_LOCATION, id, resource), method: "POST" }),
  context: (id: string, message: string) => authenticatedApiClient.request<MessageDto[]>({ path: utilityPath(UTILITY_ROUTES.CONTEXT, id).replace(":messageId", encodeURIComponent(message)) }),
  reminders: () => authenticatedApiClient.request<ReminderDto[]>({ path: REMINDER_ROUTES.BASE + REMINDER_ROUTES.LIST }),
  reminder: (resource: string) => authenticatedApiClient.request<ReminderDto>({ path: REMINDER_ROUTES.BASE + REMINDER_ROUTES.ITEM.replace(":resourceId", encodeURIComponent(resource)) }),
  reminderInbox: (cursor?: string) => authenticatedApiClient.request<ReminderInboxDto>({ path: REMINDER_ROUTES.BASE + REMINDER_ROUTES.INBOX + (cursor ? `?cursor=${encodeURIComponent(cursor)}` : "") }),
  editReminder: (resource: string, body: { readonly dueAt: string; readonly note?: string }) => authenticatedApiClient.request<ReminderDto>({ path: REMINDER_ROUTES.BASE + REMINDER_ROUTES.ITEM.replace(":resourceId", encodeURIComponent(resource)), method: "PATCH", body }),
  createReminder: (id: string, message: string, body: CreateReminderRequest) => authenticatedApiClient.request<ReminderDto>({ path: utilityPath(UTILITY_ROUTES.MESSAGE_REMINDERS, id).replace(":messageId", encodeURIComponent(message)), method: "POST", body }),
  readReminder: (resource: string) => authenticatedApiClient.request<ReminderDto>({ path: REMINDER_ROUTES.BASE + REMINDER_ROUTES.READ.replace(":resourceId", encodeURIComponent(resource)), method: "PATCH" }),
  readAll: () => authenticatedApiClient.request<unknown>({ path: REMINDER_ROUTES.BASE + REMINDER_ROUTES.READ_ALL, method: "POST" }),
  dismissReminder: (resource: string) => authenticatedApiClient.request<unknown>({ path: REMINDER_ROUTES.BASE + REMINDER_ROUTES.ITEM.replace(":resourceId", encodeURIComponent(resource)), method: "DELETE" }),
}
