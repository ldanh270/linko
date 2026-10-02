import {
    CONVERSATION_PARAMS,
    MEMBERSHIP_PARAMS,
    MEMBERSHIP_REQUEST_FIELDS,
    type ApiEnvelope,
    type ChangeMemberRoleRequest,
    type MemberDto,
    type TransferOwnerRequest,
} from "@linko/contracts"
import type { RequestHandler } from "express"
import mongoose from "mongoose"

import { HttpStatusCode } from "../../configs/constants/httpStatusCode"
import { ApiResponse } from "../../shared/http/ApiResponse"
import { MEMBERSHIP_OPERATION_FIELDS } from "./membership.constants"
import { MembershipService } from "./membership.service"

/** Translate authenticated membership HTTP requests into one service operation. */
type MembershipRequestHandler<Body, Data> = RequestHandler<Record<string, string>, ApiEnvelope<Data>, Body>
type EmptyRequestBody = Record<string, never>

/** Translate member management HTTP requests while leaving authorization to the service.
 *
 * @layer Controller
 */
export class MembershipController {
    /** Bind membership use cases without coupling the service to Express. */
    constructor(private readonly service: MembershipService) {}

    /** List safe member details to a current participant. */
    readonly list: MembershipRequestHandler<EmptyRequestBody, MemberDto[]> = async (request, response) => {
        const members = await this.service.list(
            new mongoose.Types.ObjectId(request.params[CONVERSATION_PARAMS.ID]),
            request.user._id,
        )
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(members))
    }

    /** Change one member role after the service rechecks the current actor role. */
    readonly changeRole: MembershipRequestHandler<ChangeMemberRoleRequest, MemberDto> = async (request, response) => {
        const member = await this.service.changeRole({
            [MEMBERSHIP_OPERATION_FIELDS.CONVERSATION_ID]: new mongoose.Types.ObjectId(request.params[CONVERSATION_PARAMS.ID]),
            [MEMBERSHIP_OPERATION_FIELDS.ACTOR_ID]: request.user._id,
            [MEMBERSHIP_OPERATION_FIELDS.TARGET_USER_ID]: new mongoose.Types.ObjectId(request.params[MEMBERSHIP_PARAMS.USER_ID]),
            [MEMBERSHIP_REQUEST_FIELDS.ROLE]: request.body[MEMBERSHIP_REQUEST_FIELDS.ROLE],
        })
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(member))
    }

    /** Remove one member and return the shared success envelope. */
    readonly remove: MembershipRequestHandler<EmptyRequestBody, null> = async (request, response) => {
        await this.service.remove({
            [MEMBERSHIP_OPERATION_FIELDS.CONVERSATION_ID]: new mongoose.Types.ObjectId(request.params[CONVERSATION_PARAMS.ID]),
            [MEMBERSHIP_OPERATION_FIELDS.ACTOR_ID]: request.user._id,
            [MEMBERSHIP_OPERATION_FIELDS.TARGET_USER_ID]: new mongoose.Types.ObjectId(request.params[MEMBERSHIP_PARAMS.USER_ID]),
        })
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(null))
    }

    /** Transfer owner and membership roles in the service's transaction boundary. */
    readonly transferOwner: MembershipRequestHandler<TransferOwnerRequest, null> = async (request, response) => {
        await this.service.transferOwner({
            [MEMBERSHIP_OPERATION_FIELDS.CONVERSATION_ID]: new mongoose.Types.ObjectId(request.params[CONVERSATION_PARAMS.ID]),
            [MEMBERSHIP_OPERATION_FIELDS.ACTOR_ID]: request.user._id,
            [MEMBERSHIP_OPERATION_FIELDS.NEW_OWNER_ID]: new mongoose.Types.ObjectId(request.body[MEMBERSHIP_REQUEST_FIELDS.NEW_OWNER_ID]),
        })
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(null))
    }
}
