import {
    FRIEND_REQUEST_BODY_FIELDS,
    FRIEND_ROUTE_PARAMS,
    USER_SEARCH_MODE,
    USER_SEARCH_QUERY_PARAMS,
} from "@linko/contracts"
import { z } from "zod"

import { REGEX } from "../../configs/constants/regex"
import { FRIEND_SEARCH_LIMITS } from "./friend.constants"

/** Validate public people search parameters from the URL query string. */
export const searchPeopleSchema = z.object({
    query: z.object({
        [USER_SEARCH_QUERY_PARAMS.KEYWORD]: z.string()
            .trim()
            .min(FRIEND_SEARCH_LIMITS.MIN_KEYWORD_LENGTH)
            .max(FRIEND_SEARCH_LIMITS.MAX_KEYWORD_LENGTH),
        [USER_SEARCH_QUERY_PARAMS.TYPE]: z.enum(USER_SEARCH_MODE).default(USER_SEARCH_MODE.TYPING),
    }).strict(),
})

/** Validate a friend request body without accepting extra private fields. */
export const sendFriendRequestSchema = z.object({
    body: z.object({
        [FRIEND_REQUEST_BODY_FIELDS.RECIPIENT_ID]: z.string().regex(REGEX.MONGO_ID),
        [FRIEND_REQUEST_BODY_FIELDS.MESSAGE]: z.string().trim().max(300).optional(),
    }).strict(),
})

/** Validate one friend request or friend route parameter. */
export const friendRouteParamsSchema = z.object({
    params: z.object({
        [FRIEND_ROUTE_PARAMS.REQUEST_ID]: z.string().regex(REGEX.MONGO_ID).optional(),
        [FRIEND_ROUTE_PARAMS.FRIEND_ID]: z.string().regex(REGEX.MONGO_ID).optional(),
    }).strict(),
})
