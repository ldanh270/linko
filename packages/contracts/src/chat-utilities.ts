/** First-class timeline kinds; old messages without a kind are ordinary text. */
export const CHAT_MESSAGE_KIND = { TEXT: "text", POLL: "poll", APPOINTMENT: "appointment", LOCATION: "location" } as const
/** Supported utility timeline kind. */
export type ChatMessageKind = (typeof CHAT_MESSAGE_KIND)[keyof typeof CHAT_MESSAGE_KIND]
/** Shared utility paths are mounted under /api/conversations. */
export const UTILITY_ROUTES = {
  POLLS: "/:id/polls", POLL: "/:id/polls/:resourceId", VOTE: "/:id/polls/:resourceId/vote", CLOSE_POLL: "/:id/polls/:resourceId/close",
  APPOINTMENTS: "/:id/appointments", APPOINTMENT: "/:id/appointments/:resourceId", RSVP: "/:id/appointments/:resourceId/rsvp", CANCEL_APPOINTMENT: "/:id/appointments/:resourceId/cancel",
  LOCATIONS: "/:id/locations", LOCATION: "/:id/locations/:resourceId", LOCATION_FIX: "/:id/locations/:resourceId/fix", STOP_LOCATION: "/:id/locations/:resourceId/stop",
  CONTEXT: "/:id/messages/:messageId/context",
  MESSAGE_REMINDERS: "/:id/messages/:messageId/reminders",
} as const
/** Authenticated personal reminder API paths mounted at /api/reminders. */
export const REMINDER_ROUTES = { BASE: "/api/reminders", LIST: "/", INBOX: "/inbox", READ_ALL: "/read-all", ITEM: "/:resourceId", READ: "/:resourceId/read" } as const
/** Revisioned invalidation and private delivery events, never raw coordinates. */
export const UTILITY_EVENTS = { CHANGED: "utility:changed", REMINDER: "reminder:delivered" } as const
/** Resource categories understood by invalidation consumers. */
export const UTILITY_KIND = { POLL: "poll", APPOINTMENT: "appointment", LOCATION: "location", PIN: "pin", REMINDER: "reminder" } as const
/** User-visible poll modes. */
export const POLL_MODE = { SINGLE: "single", MULTIPLE: "multiple" } as const
/** Appointment participation choices. */
export const RSVP_STATUS = { GOING: "going", MAYBE: "maybe", DECLINED: "declined" } as const
/** Persisted utility lifecycle states. */
export const UTILITY_STATUS = { ACTIVE: "active", CLOSED: "closed", CANCELLED: "cancelled", ENDED: "ended" } as const
/** Limits used by server validation and UI input controls. */
export const UTILITY_LIMITS = { QUESTION: 200, OPTION: 120, MIN_OPTIONS: 2, MAX_OPTIONS: 10, TITLE: 120, DESCRIPTION: 2000, LOCATION_INTERVAL_MS: 5000, LOCATION_STALE_MS: 30000, LIST: 50 } as const
/** Explicit live sharing durations, expressed in minutes. */
export const LOCATION_DURATIONS = [15, 60, 480] as const
/** Reminder offsets, expressed in minutes before the appointment. */
export const REMINDER_OFFSETS = [0, 5, 15, 60] as const
/** Common safe resource identity returned in chat cards. */
export interface ChatUtilityDto { readonly id: string; readonly conversationId: string; readonly messageId: string; readonly creatorId: string; readonly createdAt: string; readonly revision: number }
/** Publicly named poll option result. */
export interface PollOptionDto { readonly id: string; readonly text: string; readonly count: number; readonly voterIds: readonly string[] }
/** Viewer-authorized poll card. */
export interface PollDto extends ChatUtilityDto { readonly question: string; readonly mode: "single" | "multiple"; readonly options: readonly PollOptionDto[]; readonly selectedOptionIds: readonly string[]; readonly voterCount: number; readonly closesAt: string | null; readonly status: "active" | "closed"; readonly canClose: boolean }
/** Idempotent poll creation command. */
export interface CreatePollRequest { readonly clientMessageId: string; readonly question: string; readonly options: readonly string[]; readonly mode: "single" | "multiple"; readonly closesAt?: string | null }
/** One named appointment response. */
export interface AppointmentResponseDto { readonly userId: string; readonly status: "going" | "maybe" | "declined" }
/** Viewer-authorized appointment card. */
export interface AppointmentDto extends ChatUtilityDto { readonly updatedAt?: string; readonly title: string; readonly description: string; readonly startsAt: string; readonly endsAt: string | null; readonly timezone: string; readonly place: string; readonly status: "active" | "cancelled"; readonly responses: readonly AppointmentResponseDto[]; readonly myResponse: "going" | "maybe" | "declined" | null; readonly reminderMinutes: number | null; readonly canManage: boolean }
/** Idempotent one-off appointment creation command. */
export interface CreateAppointmentRequest { readonly clientMessageId: string; readonly title: string; readonly description?: string; readonly startsAt: string; readonly endsAt?: string | null; readonly timezone: string; readonly place?: string; readonly sourceMessageId?: string }
/** Appointment editable fields; optimistic concurrency uses revision. */
export interface UpdateAppointmentRequest { readonly revision: number; readonly title: string; readonly description?: string; readonly startsAt: string; readonly endsAt?: string | null; readonly timezone: string; readonly place?: string }
/** An explicit RSVP and optional personal reminder. */
export interface AppointmentRsvpRequest { readonly status: "going" | "maybe" | "declined"; readonly reminderMinutes: number | null }
/** Latest accepted location fix; never a route history. */
export interface LocationFixDto { readonly latitude: number; readonly longitude: number; readonly accuracy: number; readonly updatedAt: string }
/** Viewer-authorized live location card; ended sessions contain no coordinate. */
export interface LocationShareDto extends ChatUtilityDto { readonly expiresAt: string; readonly endedAt: string | null; readonly status: "active" | "ended"; readonly position: LocationFixDto | null; readonly canStop: boolean; readonly isStale: boolean }
/** Idempotent foreground share creation with an initial fix. */
export interface CreateLocationRequest { readonly clientMessageId: string; readonly durationMinutes: number; readonly publisherId: string; readonly latitude: number; readonly longitude: number; readonly accuracy: number }
/** Monotonic update from the explicitly chosen publishing tab. */
export interface UpdateLocationRequest { readonly publisherId: string; readonly sequence: number; readonly latitude: number; readonly longitude: number; readonly accuracy: number }
/** Persisted personal reminder or delivery; safe source preview comes from authorized reads. */
export interface ReminderDto { readonly id: string; readonly conversationId: string; readonly messageId: string; readonly title: string; readonly note: string; readonly dueAt: string; readonly deliveredAt: string | null; readonly readAt: string | null; readonly status: "pending" | "delivered"; readonly appointmentId: string | null }
/** Authorized cursor page and complete unread count for the personal inbox. */
export interface ReminderInboxDto { readonly items: readonly ReminderDto[]; readonly nextCursor: string | null; readonly unreadCount: number }
/** An explicit private message reminder. */
export interface CreateReminderRequest { readonly dueAt: string; readonly note?: string; readonly clientMessageId: string }
/** Versioned event safe to broadcast to conversation rooms without sensitive content. */
export interface UtilityChangedEvent { readonly conversationId: string; readonly kind: string; readonly resourceId: string; readonly revision: number }
