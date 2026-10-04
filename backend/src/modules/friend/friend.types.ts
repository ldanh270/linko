import type {
    ConversationStatus,
    UserSearchMode,
} from "@linko/contracts"
import { FRIEND_REQUEST_DIRECTION } from "@linko/contracts"
import type { Types } from "mongoose"

import type { TransactionContext } from "../../shared/persistence/withTransaction"

/** MongoDB ObjectId used by persistence-facing friend operations. */
export type ObjectId = Types.ObjectId

/** Profile data safe to map into friend, request, and public search responses. */
export interface PublicUserRecord {
    readonly id: ObjectId
    readonly username: string
    readonly displayName: string
    readonly avatarUrl: string | null
    readonly backgroundUrl: string | null
    readonly bio: string | null
}

/** Pending request fields required to construct the public request DTO. */
export interface FriendRequestRecord {
    readonly id: ObjectId
    readonly from: PublicUserRecord
    readonly to: PublicUserRecord
    readonly message: string | null
    readonly createdAt: Date
}

/** Direct conversation participant fields required by the navigation DTO. */
export interface DirectConversationParticipantRecord {
    readonly id: ObjectId
    readonly displayName: string | null
    readonly avatarUrl: string | null
    readonly joinedAt: Date | null
}

/** Direct conversation data safe for opening an existing or newly created chat. */
export interface DirectConversationRecord {
    readonly id: ObjectId
    readonly status: ConversationStatus
    readonly participants: readonly DirectConversationParticipantRecord[]
    readonly createdAt: Date
    readonly updatedAt: Date
}

/** Normalized input for one friend request command. */
export interface SendFriendRequestInput {
    readonly actorId: ObjectId
    readonly recipientId: ObjectId
    readonly message?: string
}

/** Authenticated request decision and route-owned request identifier. */
export interface FriendRequestActionInput {
    readonly actorId: ObjectId
    readonly requestId: ObjectId
}

/** Authenticated pair used to remove one active friendship. */
export interface UnfriendInput {
    readonly actorId: ObjectId
    readonly friendId: ObjectId
}

/** Authenticated pair used to find or create one direct conversation. */
export interface OpenDirectConversationInput {
    readonly actorId: ObjectId
    readonly friendId: ObjectId
}

/** Validated people search query and current viewer. */
export interface SearchPeopleInput {
    readonly actorId: ObjectId
    readonly keyword: string
    readonly type: UserSearchMode
}

/** Result direction for listing one user's outgoing or incoming requests. */
export type FriendRequestDirection = (typeof FRIEND_REQUEST_DIRECTION)[keyof typeof FRIEND_REQUEST_DIRECTION]

/** Outcome of an atomic accept or decline against one pending request. */
export type FriendRequestActionResult =
    | { readonly status: "completed"; readonly friend: PublicUserRecord }
    | { readonly status: "missing" }
    | { readonly status: "forbidden" }

/** Outcome of an atomic decline against one pending request. */
export type DeclineFriendRequestResult = "declined" | "missing" | "forbidden"

/** Persistence operations used by friend and direct conversation rules. */
export interface FriendRepository {
    /** Read a profile only for an active account. */
    findPublicUser(userId: ObjectId, transaction?: TransactionContext): Promise<PublicUserRecord | null>
    /** Search safe public profiles while excluding the current viewer. */
    searchPeople(input: SearchPeopleInput): Promise<readonly PublicUserRecord[]>
    /** List active friends for one user. */
    listFriends(userId: ObjectId): Promise<readonly PublicUserRecord[]>
    /** List the caller's pending sent or received requests. */
    listRequests(userId: ObjectId, direction: FriendRequestDirection): Promise<readonly FriendRequestRecord[]>
    /** Check whether a canonical pair has an active friendship. */
    areFriends(userA: ObjectId, userB: ObjectId, transaction?: TransactionContext): Promise<boolean>
    /** Check both directions for an existing active pending request. */
    hasPendingRequest(userA: ObjectId, userB: ObjectId, transaction?: TransactionContext): Promise<boolean>
    /** Persist one directed request and return its safe account records. */
    createRequest(input: SendFriendRequestInput, transaction: TransactionContext): Promise<FriendRequestRecord>
    /** Accept one pending request and create the canonical active friendship atomically. */
    acceptRequest(input: FriendRequestActionInput, transaction: TransactionContext): Promise<FriendRequestActionResult>
    /** Decline one pending request only when the actor is its recipient. */
    declineRequest(input: FriendRequestActionInput, transaction: TransactionContext): Promise<DeclineFriendRequestResult>
    /** Soft-delete one canonical active friendship. */
    unfriend(input: UnfriendInput, transaction: TransactionContext): Promise<boolean>
    /** Find or atomically create the one direct conversation for a canonical pair. */
    getOrCreateDirectConversation(
        input: OpenDirectConversationInput,
        transaction: TransactionContext,
    ): Promise<DirectConversationRecord>
    /** Recover an existing direct conversation after a unique-key creation race. */
    findDirectConversation(userA: ObjectId, userB: ObjectId): Promise<DirectConversationRecord | null>
}

/** Execute related friend and conversation changes atomically. */
export interface FriendTransactionRunner {
    /** Run a friend operation inside one MongoDB transaction. */
    run<T>(operation: (transaction: TransactionContext) => Promise<T>): Promise<T>
}

/** Constructor collaborators for friend use cases. */
export interface FriendServiceDependencies {
    readonly repository: FriendRepository
    readonly transactionRunner: FriendTransactionRunner
}
