/**
 * @file chat-utilities.ts
 * @module @linko/contracts/chat-utilities
 * @description Contracts, route constants, payload types, and event definitions for interactive
 * in-chat utilities: Polls, Scheduled Appointments, Personal Reminders, and Live Location sharing.
 */

/**
 * First-class timeline message kinds. Messages without a kind are treated as standard text.
 */
export const CHAT_MESSAGE_KIND = {
  TEXT: "text",
  POLL: "poll",
  APPOINTMENT: "appointment",
  LOCATION: "location",
} as const

/**
 * Supported timeline message utility kind type.
 */
export type ChatMessageKind = (typeof CHAT_MESSAGE_KIND)[keyof typeof CHAT_MESSAGE_KIND]

/**
 * Shared utility route paths mounted under /api/conversations.
 */
export const UTILITY_ROUTES = {
  POLLS: "/:id/polls",
  POLL: "/:id/polls/:resourceId",
  VOTE: "/:id/polls/:resourceId/vote",
  CLOSE_POLL: "/:id/polls/:resourceId/close",
  APPOINTMENTS: "/:id/appointments",
  APPOINTMENT: "/:id/appointments/:resourceId",
  RSVP: "/:id/appointments/:resourceId/rsvp",
  CANCEL_APPOINTMENT: "/:id/appointments/:resourceId/cancel",
  LOCATIONS: "/:id/locations",
  LOCATION: "/:id/locations/:resourceId",
  LOCATION_FIX: "/:id/locations/:resourceId/fix",
  STOP_LOCATION: "/:id/locations/:resourceId/stop",
  CONTEXT: "/:id/messages/:messageId/context",
  MESSAGE_REMINDERS: "/:id/messages/:messageId/reminders",
} as const

/**
 * Authenticated personal reminder API paths mounted at /api/reminders.
 */
export const REMINDER_ROUTES = {
  BASE: "/api/reminders",
  LIST: "/",
  INBOX: "/inbox",
  READ_ALL: "/read-all",
  ITEM: "/:resourceId",
  READ: "/:resourceId/read",
} as const

/**
 * Revisioned invalidation and private delivery real-time socket events.
 */
export const UTILITY_EVENTS = {
  CHANGED: "utility:changed",
  REMINDER: "reminder:delivered",
} as const

/**
 * Resource categories understood by utility invalidation and event handlers.
 */
export const UTILITY_KIND = {
  POLL: "poll",
  APPOINTMENT: "appointment",
  LOCATION: "location",
  PIN: "pin",
  REMINDER: "reminder",
} as const

/**
 * User-visible voting mode for interactive polls.
 */
export const POLL_MODE = {
  SINGLE: "single",
  MULTIPLE: "multiple",
} as const

/**
 * Appointment participation choices available to attendees.
 */
export const RSVP_STATUS = {
  GOING: "going",
  MAYBE: "maybe",
  DECLINED: "declined",
} as const

/**
 * Persisted utility resource lifecycle states.
 */
export const UTILITY_STATUS = {
  ACTIVE: "active",
  CLOSED: "closed",
  CANCELLED: "cancelled",
  ENDED: "ended",
} as const

/**
 * Validation constraints and limits enforced by backend schemas and frontend controls.
 */
export const UTILITY_LIMITS = {
  QUESTION: 200,
  OPTION: 120,
  MIN_OPTIONS: 2,
  MAX_OPTIONS: 10,
  TITLE: 120,
  DESCRIPTION: 2000,
  LOCATION_INTERVAL_MS: 5000,
  LOCATION_STALE_MS: 30000,
  LIST: 50,
} as const

/**
 * Supported durations for live location sharing sessions (in minutes).
 */
export const LOCATION_DURATIONS = [15, 60, 480] as const

/**
 * Standard reminder offsets prior to scheduled appointment start time (in minutes).
 */
export const REMINDER_OFFSETS = [0, 5, 15, 60] as const

/**
 * Common base fields present across all chat utility cards.
 *
 * @property id - Unique utility resource ID.
 * @property conversationId - Parent conversation containing this utility.
 * @property messageId - Corresponding timeline message referencing this utility card.
 * @property creatorId - User ID who created the utility resource.
 * @property createdAt - ISO timestamp when the utility was initiated.
 * @property revision - Monotonically increasing revision counter for optimistic concurrency and invalidation.
 */
export interface ChatUtilityDto {
  readonly id: string
  readonly conversationId: string
  readonly messageId: string
  readonly creatorId: string
  readonly createdAt: string
  readonly revision: number
}

/**
 * Aggregated option within a poll, containing vote count and voter identity list.
 *
 * @property id - Unique option ID.
 * @property text - Option label text.
 * @property count - Total votes submitted for this option.
 * @property voterIds - List of user IDs who voted for this option.
 */
export interface PollOptionDto {
  readonly id: string
  readonly text: string
  readonly count: number
  readonly voterIds: readonly string[]
}

/**
 * Fully hydrated Poll Data Transfer Object for rendering poll message cards.
 *
 * @property question - The question being polled.
 * @property mode - Single or multiple choice vote policy.
 * @property options - List of poll options and their results.
 * @property selectedOptionIds - Option IDs chosen by the viewing user.
 * @property voterCount - Total distinct voters who participated.
 * @property closesAt - Optional deadline when voting closes.
 * @property status - Current state ('active' | 'closed').
 * @property canClose - Whether the viewing user possesses permission to close the poll.
 */
export interface PollDto extends ChatUtilityDto {
  readonly question: string
  readonly mode: "single" | "multiple"
  readonly options: readonly PollOptionDto[]
  readonly selectedOptionIds: readonly string[]
  readonly voterCount: number
  readonly closesAt: string | null
  readonly status: "active" | "closed"
  readonly canClose: boolean
}

/**
 * Request payload for creating a new poll.
 */
export interface CreatePollRequest {
  readonly clientMessageId: string
  readonly question: string
  readonly options: readonly string[]
  readonly mode: "single" | "multiple"
  readonly closesAt?: string | null
}

/**
 * Individual attendee RSVP response record.
 */
export interface AppointmentResponseDto {
  readonly userId: string
  readonly status: "going" | "maybe" | "declined"
}

/**
 * Fully hydrated Appointment Data Transfer Object.
 */
export interface AppointmentDto extends ChatUtilityDto {
  readonly updatedAt?: string
  readonly title: string
  readonly description: string
  readonly startsAt: string
  readonly endsAt: string | null
  readonly timezone: string
  readonly place: string
  readonly status: "active" | "cancelled"
  readonly responses: readonly AppointmentResponseDto[]
  readonly myResponse: "going" | "maybe" | "declined" | null
  readonly reminderMinutes: number | null
  readonly canManage: boolean
}

/**
 * Request payload for creating a new scheduled appointment.
 */
export interface CreateAppointmentRequest {
  readonly clientMessageId: string
  readonly title: string
  readonly description?: string
  readonly startsAt: string
  readonly endsAt?: string | null
  readonly timezone: string
  readonly place?: string
  readonly sourceMessageId?: string
}

/**
 * Request payload for updating an appointment, utilizing optimistic revision locking.
 */
export interface UpdateAppointmentRequest {
  readonly revision: number
  readonly title: string
  readonly description?: string
  readonly startsAt: string
  readonly endsAt?: string | null
  readonly timezone: string
  readonly place?: string
}

/**
 * Request payload for updating attendee RSVP and optional personal reminder offset.
 */
export interface AppointmentRsvpRequest {
  readonly status: "going" | "maybe" | "declined"
  readonly reminderMinutes: number | null
}

/**
 * Geographic GPS fix details accepted by live location tracking.
 */
export interface LocationFixDto {
  readonly latitude: number
  readonly longitude: number
  readonly accuracy: number
  readonly updatedAt: string
}

/**
 * Live location sharing session card details.
 */
export interface LocationShareDto extends ChatUtilityDto {
  readonly expiresAt: string
  readonly endedAt: string | null
  readonly status: "active" | "ended"
  readonly position: LocationFixDto | null
  readonly canStop: boolean
  readonly isStale: boolean
}

/**
 * Initial request payload to start foreground live location sharing.
 */
export interface CreateLocationRequest {
  readonly clientMessageId: string
  readonly durationMinutes: number
  readonly publisherId: string
  readonly latitude: number
  readonly longitude: number
  readonly accuracy: number
}

/**
 * Monotonic location fix update payload emitted by the publisher tab.
 */
export interface UpdateLocationRequest {
  readonly publisherId: string
  readonly sequence: number
  readonly latitude: number
  readonly longitude: number
  readonly accuracy: number
}

/**
 * Personal reminder entry returned by reminder APIs.
 */
export interface ReminderDto {
  readonly id: string
  readonly conversationId: string
  readonly messageId: string
  readonly title: string
  readonly note: string
  readonly dueAt: string
  readonly deliveredAt: string | null
  readonly readAt: string | null
  readonly status: "pending" | "delivered"
  readonly appointmentId: string | null
}

/**
 * Paginated reminder inbox response with overall unread count.
 */
export interface ReminderInboxDto {
  readonly items: readonly ReminderDto[]
  readonly nextCursor: string | null
  readonly unreadCount: number
}

/**
 * Payload for creating a new standalone reminder for a specific message.
 */
export interface CreateReminderRequest {
  readonly dueAt: string
  readonly note?: string
  readonly clientMessageId: string
}

/**
 * Safe, privacy-preserving invalidation event broadcast over Socket.IO rooms.
 * Informs clients that a utility resource changed revision without sending raw coordinates or sensitive data.
 */
export interface UtilityChangedEvent {
  readonly conversationId: string
  readonly kind: string
  readonly resourceId: string
  readonly revision: number
}

