import { FRIEND_ROUTE_PATHS, USER_ROUTE_PATHS } from "@linko/contracts"
import express, { type Router } from "express"

import validate from "../../middlewares/validate.middleware"
import { FriendController } from "./friend.controller"
import { friendRouteParamsSchema, searchPeopleSchema, sendFriendRequestSchema } from "./friend.schema"

/** Register authenticated friend lifecycle and public people search routes. */
export function createFriendRouter(controller: FriendController): Router {
    const router = express.Router()
    router.get(FRIEND_ROUTE_PATHS.ROOT, controller.listFriends)
    router.get(FRIEND_ROUTE_PATHS.SENT_REQUESTS, controller.listSentRequests)
    router.get(FRIEND_ROUTE_PATHS.RECEIVED_REQUESTS, controller.listReceivedRequests)
    router.post(FRIEND_ROUTE_PATHS.ROOT, validate(sendFriendRequestSchema), controller.sendRequest)
    router.post(FRIEND_ROUTE_PATHS.ACCEPT, validate(friendRouteParamsSchema), controller.accept)
    router.post(FRIEND_ROUTE_PATHS.DECLINE, validate(friendRouteParamsSchema), controller.decline)
    router.delete(FRIEND_ROUTE_PATHS.UNFRIEND, validate(friendRouteParamsSchema), controller.unfriend)
    router.post(FRIEND_ROUTE_PATHS.DIRECT_CONVERSATION, validate(friendRouteParamsSchema), controller.openDirectConversation)
    return router
}

/** Register the query-string people search endpoint in the existing users API namespace. */
export function createPeopleSearchRouter(controller: FriendController): Router {
    const router = express.Router()
    router.get(USER_ROUTE_PATHS.SEARCH, validate(searchPeopleSchema), controller.searchPeople)
    return router
}
