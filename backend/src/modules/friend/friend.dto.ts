import {
    CONVERSATION_DTO_FIELDS,
    CONVERSATION_TYPE,
    FRIEND_REQUEST_FIELDS,
    INBOX_FIELDS,
    INBOX_PARTICIPANT_FIELDS,
    USER_PROFILE_FIELDS,
    type DirectConversationDto,
    type FriendDto,
    type FriendRequestDto,
    type PublicUserDto,
} from "@linko/contracts"

import type { DirectConversationRecord, FriendRequestRecord, PublicUserRecord } from "./friend.types"

/** Map selected account profile data to the shared safe public user contract. */
export function toPublicUserDto(user: PublicUserRecord): PublicUserDto {
    return {
        [USER_PROFILE_FIELDS.ID]: user.id.toString(),
        [USER_PROFILE_FIELDS.USERNAME]: user.username,
        [USER_PROFILE_FIELDS.DISPLAY_NAME]: user.displayName,
        [USER_PROFILE_FIELDS.AVATAR_URL]: user.avatarUrl,
        [USER_PROFILE_FIELDS.BACKGROUND_URL]: user.backgroundUrl,
        [USER_PROFILE_FIELDS.BIO]: user.bio,
    }
}

/** Map request state and public profiles without exposing persistence metadata. */
export function toFriendRequestDto(request: FriendRequestRecord): FriendRequestDto {
    return {
        [FRIEND_REQUEST_FIELDS.ID]: request.id.toString(),
        [FRIEND_REQUEST_FIELDS.FROM]: toPublicUserDto(request.from),
        [FRIEND_REQUEST_FIELDS.TO]: toPublicUserDto(request.to),
        [FRIEND_REQUEST_FIELDS.MESSAGE]: request.message,
        [FRIEND_REQUEST_FIELDS.CREATED_AT]: request.createdAt.toISOString(),
    }
}

/** Map a direct conversation to the safe navigation contract. */
export function toDirectConversationDto(conversation: DirectConversationRecord): DirectConversationDto {
    return {
        [INBOX_FIELDS.ID]: conversation.id.toString(),
        [INBOX_FIELDS.TYPE]: CONVERSATION_TYPE.DIRECT,
        [CONVERSATION_DTO_FIELDS.STATUS]: conversation.status,
        [INBOX_FIELDS.PARTICIPANTS]: conversation.participants.map((participant) => ({
            [INBOX_PARTICIPANT_FIELDS.ID]: participant.id.toString(),
            [INBOX_PARTICIPANT_FIELDS.DISPLAY_NAME]: participant.displayName,
            [INBOX_PARTICIPANT_FIELDS.AVATAR_URL]: participant.avatarUrl,
            [INBOX_PARTICIPANT_FIELDS.JOINED_AT]: participant.joinedAt?.toISOString() ?? null,
        })),
        [INBOX_FIELDS.CREATED_AT]: conversation.createdAt.toISOString(),
        [INBOX_FIELDS.UPDATED_AT]: conversation.updatedAt.toISOString(),
    }
}

/** Map a list of safe account records into friend DTOs. */
export function toFriendDtos(users: readonly PublicUserRecord[]): readonly FriendDto[] {
    return users.map(toPublicUserDto)
}
