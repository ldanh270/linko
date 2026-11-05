/** Durable reminder state used by jobs, inbox and lease recovery. */
export const REMINDER_STATUS = { PENDING: "pending", CLAIMED: "claimed", DELIVERED: "delivered", CANCELLED: "cancelled", FAILED: "failed" } as const
/** Reminder persistence fields shared by model and repository. */
export const REMINDER_FIELDS = { ID: "_id", OWNER: "ownerId", CONVERSATION: "conversationId", MESSAGE: "messageId", APPOINTMENT: "appointmentId", REVISION: "appointmentRevision", CLIENT: "clientMessageId", TITLE: "title", NOTE: "note", DUE: "dueAt", STATUS: "status", ATTEMPTS: "attempts", LEASE: "leaseUntil", TOKEN: "leaseToken", NEXT: "nextAttemptAt", DELIVERED: "deliveredAt", READ: "readAt", DELETED: "delFlag" } as const
/** Delivery receipt persistence keys. */
export const DELIVERY_FIELDS = { JOB: "jobId", OWNER: "ownerId", DELETED: "delFlag" } as const
