import {
    CONVERSATION_QUERY_PARAMS,
    INBOX_FIELDS,
    INBOX_LIMITS,
    MEMBERSHIP_FIELDS,
} from "@linko/contracts"

/** Database-only fields used to sort and select one current inbox participant. */
export const INBOX_MODEL_FIELDS = {
    ACTIVITY_AT: "activityAt",
    CURRENT_PARTICIPANT: "currentParticipant",
    PARTICIPANT_VARIABLE: "participant",
} as const

/** Opaque cursor fields serialized between inbox pages. */
export const INBOX_CURSOR_FIELDS = {
    ACTIVITY_AT: INBOX_MODEL_FIELDS.ACTIVITY_AT,
    ID: INBOX_FIELDS.ID,
} as const

/** Stable safe validation messages for inbox pagination. */
export const INBOX_ERROR_MESSAGES = {
    INVALID_KIND: "Conversation kind is invalid",
    INVALID_CURSOR: "Inbox cursor is invalid",
    INVALID_PAGE_LIMIT: `Inbox page size must be between 1 and ${INBOX_LIMITS.MAX_PAGE_SIZE}`,
    INVALID_RECORD: "Inbox query returned a conversation without its current member",
} as const

/** Request keys passed from the validated controller into inbox service operations. */
export const INBOX_OPERATION_FIELDS = {
    USER_ID: MEMBERSHIP_FIELDS.USER_ID,
    KIND: CONVERSATION_QUERY_PARAMS.KIND,
    CURSOR: CONVERSATION_QUERY_PARAMS.CURSOR,
    LIMIT: CONVERSATION_QUERY_PARAMS.LIMIT,
    ACTIVITY_AT: INBOX_MODEL_FIELDS.ACTIVITY_AT,
} as const

/** Maximum encoded cursor length and ObjectId shape accepted by the inbox service. */
export const INBOX_CURSOR_ID_PATTERN = /^[a-f\d]{24}$/i
