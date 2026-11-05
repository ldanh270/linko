/** Stable safe errors emitted by common utility authorization. */
export const UTILITY_ERRORS = { UNAVAILABLE: "Conversation or message is unavailable", CLOSED: "This group has been closed", FRIENDSHIP: "An active friendship is required", INVALID: "Invalid utility message reference" } as const
/** Persistence fields used across utility access and context navigation. */
export const UTILITY_FIELDS = { REVISION: "utilityRevision", DIRECT_PINS: "pinnedMessageIds", KIND: "kind", RESOURCE_ID: "resourceId" } as const
/** Bounded context window avoids loading an entire chat for a pinned message. */
export const UTILITY_CONTEXT = { SIDE_LIMIT: 15 } as const
