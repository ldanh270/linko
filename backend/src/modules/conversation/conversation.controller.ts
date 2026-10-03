import {
    CONVERSATION_KIND,
    CONVERSATION_PARAMS,
    CONVERSATION_QUERY_PARAMS,
    GROUP_FIELDS,
    type ApiEnvelope,
    type ConversationSummaryDto,
    type CreateGroupRequest,
    type GroupDto,
    type GroupSummaryDto,
    type UpdateGroupRequest,
} from "@linko/contracts"
import type { RequestHandler } from "express"
import mongoose from "mongoose"

import { HttpStatusCode } from "../../configs/constants/httpStatusCode"
import { ApiResponse } from "../../shared/http/ApiResponse"
import { CONVERSATION_OPERATION_FIELDS } from "./conversation.constants"
import { ConversationService } from "./conversation.service"

type ConversationRequestHandler<Body, Data> = RequestHandler<Record<string, string>, ApiEnvelope<Data>, Body>
type EmptyRequestBody = Record<string, never>
type ConversationListResponse = GroupSummaryDto[] | { readonly conversations: ConversationSummaryDto[] }

/** Translate authenticated group HTTP requests into one conversation service operation.
 *
 * @layer Controller
 */
export class ConversationController {
    /** Bind the group use cases without coupling business rules to Express. */
    constructor(private readonly service: ConversationService) {}

    /** Create a group from validated fields and return its safe DTO. */
    readonly createGroup: ConversationRequestHandler<CreateGroupRequest, GroupDto> = async (request, response) => {
        const group = await this.service.createGroup({
            [GROUP_FIELDS.OWNER_ID]: request.user._id,
            [GROUP_FIELDS.NAME]: request.body[GROUP_FIELDS.NAME],
            [GROUP_FIELDS.DESCRIPTION]: request.body[GROUP_FIELDS.DESCRIPTION],
            ...(request.file ? { [GROUP_FIELDS.AVATAR]: request.file } : {}),
        })
        response.status(HttpStatusCode.CREATED).json(ApiResponse.ok(group))
    }

    /** Return either the requested group list or the existing mixed conversation inbox. */
    readonly listConversations: ConversationRequestHandler<EmptyRequestBody, ConversationListResponse> = async (request, response) => {
        const kind = request.query[CONVERSATION_QUERY_PARAMS.KIND]
        const data = kind === CONVERSATION_KIND.GROUP
            ? await this.service.listMyGroups(request.user._id)
            : { conversations: await this.service.listMyConversations(request.user._id) }
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(data))
    }

    /** Update group metadata using the authenticated account as the actor. */
    readonly updateGroup: ConversationRequestHandler<UpdateGroupRequest, GroupDto> = async (request, response) => {
        const group = await this.service.updateGroup({
            [CONVERSATION_OPERATION_FIELDS.CONVERSATION_ID]: new mongoose.Types.ObjectId(
                request.params[CONVERSATION_PARAMS.ID],
            ),
            [CONVERSATION_OPERATION_FIELDS.ACTOR_ID]: request.user._id,
            [GROUP_FIELDS.NAME]: request.body[GROUP_FIELDS.NAME],
            [GROUP_FIELDS.DESCRIPTION]: request.body[GROUP_FIELDS.DESCRIPTION],
            ...(request.file ? { [GROUP_FIELDS.AVATAR]: request.file } : {}),
        })
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(group))
    }
}
