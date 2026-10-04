import {
    FRIEND_REQUEST_BODY_FIELDS,
    FRIEND_REQUEST_DIRECTION,
    FRIEND_ROUTE_PARAMS,
    USER_SEARCH_MODE,
    USER_SEARCH_QUERY_PARAMS,
    type ApiEnvelope,
    type DirectConversationDto,
    type FriendDto,
    type FriendRequestDto,
    type SendFriendRequestBody,
    type UserSearchMode,
} from "@linko/contracts"
import type { RequestHandler } from "express"
import mongoose from "mongoose"

import { HttpStatusCode } from "../../configs/constants/httpStatusCode"
import { ApiResponse } from "../../shared/http/ApiResponse"
import type { FriendService } from "./friend.service"

type EmptyRequestBody = Record<string, never>

/** Translate authenticated friend and people search HTTP requests into one domain operation.
 *
 * @layer Controller
 */
export class FriendController {
    /** Bind the friend domain service without coupling its rules to Express. */
    constructor(private readonly service: FriendService) {}

    /** List safe public profiles for the authenticated user's active friends. */
    readonly listFriends: RequestHandler<Record<string, string>, ApiEnvelope<readonly FriendDto[]>, EmptyRequestBody> = async (request, response) => {
        const friends = await this.service.listFriends(request.user._id)
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(friends))
    }

    /** List outgoing pending friend requests. */
    readonly listSentRequests: RequestHandler<Record<string, string>, ApiEnvelope<readonly FriendRequestDto[]>, EmptyRequestBody> = async (request, response) => {
        const requests = await this.service.listRequests(request.user._id, FRIEND_REQUEST_DIRECTION.SENT)
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(requests))
    }

    /** List incoming pending friend requests. */
    readonly listReceivedRequests: RequestHandler<Record<string, string>, ApiEnvelope<readonly FriendRequestDto[]>, EmptyRequestBody> = async (request, response) => {
        const requests = await this.service.listRequests(request.user._id, FRIEND_REQUEST_DIRECTION.RECEIVED)
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(requests))
    }

    /** Search the public user directory using validated URL query parameters. */
    readonly searchPeople: RequestHandler<Record<string, string>, ApiEnvelope<readonly FriendDto[]>, EmptyRequestBody> = async (request, response) => {
        const rawType = request.query[USER_SEARCH_QUERY_PARAMS.TYPE]
        const type: UserSearchMode = rawType === USER_SEARCH_MODE.FULL ? USER_SEARCH_MODE.FULL : USER_SEARCH_MODE.TYPING
        const people = await this.service.searchPeople({
            actorId: request.user._id,
            keyword: String(request.query[USER_SEARCH_QUERY_PARAMS.KEYWORD]),
            type,
        })
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(people))
    }

    /** Create one pending request from the current account to the requested recipient. */
    readonly sendRequest: RequestHandler<Record<string, string>, ApiEnvelope<FriendRequestDto>, SendFriendRequestBody> = async (request, response) => {
        const friendRequest = await this.service.sendRequest({
            actorId: request.user._id,
            recipientId: new mongoose.Types.ObjectId(request.body[FRIEND_REQUEST_BODY_FIELDS.RECIPIENT_ID]),
            message: request.body[FRIEND_REQUEST_BODY_FIELDS.MESSAGE],
        })
        response.status(HttpStatusCode.CREATED).json(ApiResponse.ok(friendRequest))
    }

    /** Accept the incoming request identified by the validated route parameter. */
    readonly accept: RequestHandler<Record<string, string>, ApiEnvelope<FriendDto>, EmptyRequestBody> = async (request, response) => {
        const friend = await this.service.accept({
            actorId: request.user._id,
            requestId: new mongoose.Types.ObjectId(request.params[FRIEND_ROUTE_PARAMS.REQUEST_ID]),
        })
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(friend))
    }

    /** Decline the incoming request identified by the validated route parameter. */
    readonly decline: RequestHandler<Record<string, string>, ApiEnvelope<null>, EmptyRequestBody> = async (request, response) => {
        await this.service.decline({
            actorId: request.user._id,
            requestId: new mongoose.Types.ObjectId(request.params[FRIEND_ROUTE_PARAMS.REQUEST_ID]),
        })
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(null))
    }

    /** Remove an active friendship after translating its route parameter. */
    readonly unfriend: RequestHandler<Record<string, string>, ApiEnvelope<null>, EmptyRequestBody> = async (request, response) => {
        await this.service.unfriend({
            actorId: request.user._id,
            friendId: new mongoose.Types.ObjectId(request.params[FRIEND_ROUTE_PARAMS.FRIEND_ID]),
        })
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(null))
    }

    /** Find or create the current user's one direct conversation with a friend. */
    readonly openDirectConversation: RequestHandler<Record<string, string>, ApiEnvelope<DirectConversationDto>, EmptyRequestBody> = async (request, response) => {
        const conversation = await this.service.getOrCreateDirectConversation({
            actorId: request.user._id,
            friendId: new mongoose.Types.ObjectId(request.params[FRIEND_ROUTE_PARAMS.FRIEND_ID]),
        })
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(conversation))
    }
}
