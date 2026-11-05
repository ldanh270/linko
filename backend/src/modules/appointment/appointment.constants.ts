/** Appointment persistence fields shared by schemas and repositories. */
export const APPOINTMENT_FIELDS = { ID: "_id", CONVERSATION_ID: "conversationId", MESSAGE_ID: "messageId", CREATOR_ID: "creatorId", CLIENT_ID: "clientMessageId", TITLE: "title", DESCRIPTION: "description", START: "startsAt", END: "endsAt", ZONE: "timezone", PLACE: "place", STATUS: "status", REVISION: "revision", CREATED: "createdAt", UPDATED: "updatedAt", DELETED: "delFlag" } as const
/** Response fields used by attendance and reminder authorization. */
export const RESPONSE_FIELDS = { APPOINTMENT: "appointmentId", USER: "userId", STATUS: "status", OFFSET: "reminderMinutes", JOINED: "joinedAt", DELETED: "delFlag" } as const
/** Safe expected scheduling errors. */
export const SCHEDULING_ERRORS = { NOT_FOUND: "Appointment or reminder not found", TIME: "Choose a future time with an explicit UTC offset and valid timezone", END: "End time must be after start time", MANAGE: "Only the creator or a group manager can change this appointment", REVISION: "This appointment changed. Reload before editing", CANCELLED: "This appointment is cancelled", OFFSET: "Choose a supported reminder time that is still in the future", NOTE: "The reminder note is too long" } as const
/** Scheduling bounds and explicit instant syntax. */
export const SCHEDULING_LIMITS = { MINUTE_MS: 60000, MAX_NOTE: 500, MAX_PLACE: 500, WORKER_MS: 5000, LEASE_MS: 60000, MAX_ATTEMPTS: 5, BATCH: 20, MAX_ALERT_AGE_MS: 86400000, MAX_ID: 128 } as const
/** Require an explicit offset so DST ambiguity is resolved before submission. */
export const INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/
