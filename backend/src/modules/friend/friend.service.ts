import { ERROR_CODES, type DirectConversationDto, type FriendDto, type FriendRequestDto } from "@linko/contracts"

import { ConflictException } from "../../shared/errors/ConflictException"
import { ForbiddenException } from "../../shared/errors/ForbiddenException"
import { NotFoundException } from "../../shared/errors/NotFoundException"
import { ValidationException } from "../../shared/errors/ValidationException"
import { FRIEND_ERROR_MESSAGES, FRIEND_INDEX_NAMES } from "./friend.constants"
import { toDirectConversationDto, toFriendDtos, toFriendRequestDto, toPublicUserDto } from "./friend.dto"
import type {
    FriendRequestActionInput,
    FriendRequestDirection,
    FriendServiceDependencies,
    ObjectId,
    OpenDirectConversationInput,
    SearchPeopleInput,
    SendFriendRequestInput,
    UnfriendInput,
} from "./friend.types"

/** Enforce friendship lifecycle rules and friend-scoped direct chat access.
 *
 * @layer Service
 */
export class FriendService {
    /** Inject friend persistence and MongoDB transaction boundaries. */
    constructor(private readonly dependencies: FriendServiceDependencies) {}

    /** Search only public account fields and omit the current viewer.
     *
     * @param input - Authenticated viewer, keyword, and bounded search mode.
     * @returns Safe public user DTOs.
     */
    async searchPeople(input: SearchPeopleInput): Promise<readonly FriendDto[]> {
        const users = await this.dependencies.repository.searchPeople(input)
        return toFriendDtos(users)
    }

    /** List active friends for the authenticated account. */
    async listFriends(userId: ObjectId): Promise<readonly FriendDto[]> {
        return toFriendDtos(await this.dependencies.repository.listFriends(userId))
    }

    /** List the authenticated account's pending outgoing or incoming requests. */
    async listRequests(userId: ObjectId, direction: FriendRequestDirection): Promise<readonly FriendRequestDto[]> {
        const requests = await this.dependencies.repository.listRequests(userId, direction)
        return requests.map(toFriendRequestDto)
    }

    /** Create one directed pending request unless the pair is already connected or pending.
     *
     * @param input - Authenticated sender, recipient, and optional note.
     * @returns The safe request DTO.
     * @throws {ValidationException} When a user requests themself.
     * @throws {NotFoundException} When the recipient account is unavailable.
     * @throws {ConflictException} When a friendship or request already exists.
     */
    async sendRequest(input: SendFriendRequestInput): Promise<FriendRequestDto> {
        if (input.actorId.equals(input.recipientId)) {
            throw new ValidationException(FRIEND_ERROR_MESSAGES.SELF_REQUEST)
        }
        return this.dependencies.transactionRunner.run(async (transaction) => {
            const recipient = await this.dependencies.repository.findPublicUser(input.recipientId, transaction)
            if (!recipient) throw new NotFoundException(FRIEND_ERROR_MESSAGES.USER_NOT_FOUND)
            if (await this.dependencies.repository.areFriends(input.actorId, input.recipientId, transaction)) {
                throw new ConflictException(ERROR_CODES.FRIENDSHIP_EXISTS, FRIEND_ERROR_MESSAGES.ALREADY_FRIENDS)
            }
            if (await this.dependencies.repository.hasPendingRequest(input.actorId, input.recipientId, transaction)) {
                throw new ConflictException(ERROR_CODES.FRIEND_REQUEST_PENDING, FRIEND_ERROR_MESSAGES.REQUEST_PENDING)
            }
            const request = await this.dependencies.repository.createRequest(input, transaction)
            return toFriendRequestDto(request)
        })
    }

    /** Accept a pending incoming request and create the friendship in one transaction. */
    async accept(input: FriendRequestActionInput): Promise<FriendDto> {
        const result = await this.dependencies.transactionRunner.run((transaction) =>
            this.dependencies.repository.acceptRequest(input, transaction),
        )
        if (result.status === "missing") throw new NotFoundException(FRIEND_ERROR_MESSAGES.REQUEST_NOT_FOUND)
        if (result.status === "forbidden") {
            throw new ForbiddenException(FRIEND_ERROR_MESSAGES.REQUEST_FORBIDDEN)
        }
        return toPublicUserDto(result.friend)
    }

    /** Decline a pending incoming request without creating a friendship. */
    async decline(input: FriendRequestActionInput): Promise<void> {
        const result = await this.dependencies.transactionRunner.run((transaction) =>
            this.dependencies.repository.declineRequest(input, transaction),
        )
        if (result === "missing") throw new NotFoundException(FRIEND_ERROR_MESSAGES.REQUEST_NOT_FOUND)
        if (result === "forbidden") throw new ForbiddenException(FRIEND_ERROR_MESSAGES.REQUEST_FORBIDDEN)
    }

    /** Remove an active friendship so future direct sends fail their repository check. */
    async unfriend(input: UnfriendInput): Promise<void> {
        const removed = await this.dependencies.transactionRunner.run((transaction) =>
            this.dependencies.repository.unfriend(input, transaction),
        )
        if (!removed) throw new NotFoundException(FRIEND_ERROR_MESSAGES.FRIENDSHIP_NOT_FOUND)
    }

    /** Return the unique direct conversation for an active friendship, creating it atomically when absent. */
    async getOrCreateDirectConversation(input: OpenDirectConversationInput): Promise<DirectConversationDto> {
        const [userA, userB] = canonicalPair(input.actorId, input.friendId)
        if (userA.equals(userB)) throw new ValidationException(FRIEND_ERROR_MESSAGES.SELF_REQUEST)

        try {
            const conversation = await this.dependencies.transactionRunner.run(async (transaction) => {
                if (!(await this.dependencies.repository.areFriends(userA, userB, transaction))) {
                    throw new ForbiddenException(FRIEND_ERROR_MESSAGES.NOT_FRIENDS, ERROR_CODES.NOT_FRIENDS)
                }
                return this.dependencies.repository.getOrCreateDirectConversation({ ...input, actorId: userA, friendId: userB }, transaction)
            })
            return toDirectConversationDto(conversation)
        } catch (error) {
            if (!isDirectConversationDuplicate(error)) throw error
            if (!(await this.dependencies.repository.areFriends(userA, userB))) {
                throw new ForbiddenException(FRIEND_ERROR_MESSAGES.NOT_FRIENDS, ERROR_CODES.NOT_FRIENDS)
            }
            const conversation = await this.dependencies.repository.findDirectConversation(userA, userB)
            if (!conversation) throw error
            return toDirectConversationDto(conversation)
        }
    }
}

function canonicalPair(userA: ObjectId, userB: ObjectId): readonly [ObjectId, ObjectId] {
    return userA.toString().localeCompare(userB.toString()) <= 0 ? [userA, userB] : [userB, userA]
}

function isDirectConversationDuplicate(error: unknown): boolean {
    if (typeof error !== "object" || error === null || !("code" in error) || error.code !== 11000) return false
    return "message" in error && typeof error.message === "string"
        && error.message.includes(FRIEND_INDEX_NAMES.ACTIVE_DIRECT_CONVERSATION_PAIR)
}
