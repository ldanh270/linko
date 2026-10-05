import type { PublicUserDto } from "./users"
import type { EntityId } from "./envelope"
import {
    CONVERSATION_DTO_FIELDS,
    INBOX_FIELDS,
    INBOX_PARTICIPANT_FIELDS,
    type ConversationStatus,
    type ConversationType,
} from "./constants"

/** Shared friend routes used by backend registration and people adapters. */
export const FRIEND_ROUTE_PATHS = {
    ROOT: "/",
    SENT_REQUESTS: "/sent",
    RECEIVED_REQUESTS: "/received",
    ACCEPT: "/:requestId/accept",
    DECLINE: "/:requestId/decline",
    UNFRIEND: "/:friendId",
    DIRECT_CONVERSATION: "/:friendId/conversation",
} as const

/** Route parameters shared by friend request and direct conversation APIs. */
export const FRIEND_ROUTE_PARAMS = {
    REQUEST_ID: "requestId",
    FRIEND_ID: "friendId",
} as const

/** Stable field names used by friend requests and their write contract. */
export const FRIEND_REQUEST_FIELDS = {
    ID: "id",
    FROM: "from",
    TO: "to",
    MESSAGE: "message",
    CREATED_AT: "createdAt",
} as const

/** Fields accepted by the authenticated friend request route. */
export const FRIEND_REQUEST_BODY_FIELDS = {
    RECIPIENT_ID: "recipientId",
    MESSAGE: "message",
} as const

/** Direction values used to list the current user's requests. */
export const FRIEND_REQUEST_DIRECTION = {
    SENT: "SENT",
    RECEIVED: "RECEIVED",
} as const

/** Direction filter accepted by friend request listing. */
export type FriendRequestDirection = (typeof FRIEND_REQUEST_DIRECTION)[keyof typeof FRIEND_REQUEST_DIRECTION]

/** Safe friend request summary with no private account fields. */
export interface FriendRequestDto {
    readonly [FRIEND_REQUEST_FIELDS.ID]: EntityId
    readonly [FRIEND_REQUEST_FIELDS.FROM]: PublicUserDto
    readonly [FRIEND_REQUEST_FIELDS.TO]: PublicUserDto
    readonly [FRIEND_REQUEST_FIELDS.MESSAGE]: string | null
    readonly [FRIEND_REQUEST_FIELDS.CREATED_AT]: string
}

/** Request body accepted when one account invites another. */
export interface SendFriendRequestBody {
    readonly [FRIEND_REQUEST_BODY_FIELDS.RECIPIENT_ID]: EntityId
    readonly [FRIEND_REQUEST_BODY_FIELDS.MESSAGE]?: string
}

/** A friend's public profile, matching the existing public user contract. */
export type FriendDto = PublicUserDto

/** Safe direct conversation information needed to navigate into a private chat. */
export interface DirectConversationDto {
    readonly [INBOX_FIELDS.ID]: EntityId
    readonly [INBOX_FIELDS.TYPE]: ConversationType
    readonly [CONVERSATION_DTO_FIELDS.STATUS]: ConversationStatus
    readonly [INBOX_FIELDS.PARTICIPANTS]: readonly {
        readonly [INBOX_PARTICIPANT_FIELDS.ID]: EntityId
        readonly [INBOX_PARTICIPANT_FIELDS.DISPLAY_NAME]: string | null
        readonly [INBOX_PARTICIPANT_FIELDS.AVATAR_URL]: string | null
        readonly [INBOX_PARTICIPANT_FIELDS.JOINED_AT]: string | null
    }[]
    readonly [INBOX_FIELDS.CREATED_AT]: string
    readonly [INBOX_FIELDS.UPDATED_AT]: string
}
