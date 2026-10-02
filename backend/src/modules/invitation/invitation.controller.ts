import {
    CONVERSATION_PARAMS,
    INVITATION_HEADERS,
    INVITATION_PARAMS,
    type ApiEnvelope,
    type InvitationPreviewDto,
    type InvitationSummaryDto,
    type IssuedInvitationDto,
} from "@linko/contracts"
import type { Request, RequestHandler } from "express"
import mongoose from "mongoose"

import { HttpStatusCode } from "../../configs/constants/httpStatusCode"
import { ApiResponse } from "../../shared/http/ApiResponse"
import { ValidationException } from "../../shared/errors/ValidationException"
import { InvitationService } from "./invitation.service"
import { INVITATION_MESSAGES } from "./invitation.constants"
import type { IssueInvitationInput, ManageInvitationsInput, RevokeInvitationInput } from "./invitation.types"

type InvitationRequestHandler<Body, Data> = RequestHandler<Record<string, string>, ApiEnvelope<Data>, Body>
type EmptyRequestBody = Record<string, never>

/** Translate invitation HTTP inputs and outputs while leaving authorization to the service.
 *
 * @layer Controller
 */
export class InvitationController {
    /** Bind invitation use cases without coupling the service to Express. */
    constructor(private readonly service: InvitationService) {}

    /** Issue one active invitation link for the authenticated owner or admin. */
    readonly issue: InvitationRequestHandler<EmptyRequestBody, IssuedInvitationDto> = async (request, response) => {
        const issued = await this.service.issue(this.createIssueInput(
            request.params[CONVERSATION_PARAMS.ID],
            request.user._id,
            request,
        ))
        response.status(HttpStatusCode.CREATED).json(ApiResponse.ok(issued))
    }

    /** Return safe invitation summaries to an authenticated group manager. */
    readonly list: InvitationRequestHandler<EmptyRequestBody, InvitationSummaryDto[]> = async (request, response) => {
        const invitations = await this.service.list(
            this.createManageInput(request.params[CONVERSATION_PARAMS.ID], request.user._id),
        )
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(invitations))
    }

    /** Revoke one invitation for the authenticated owner or admin. */
    readonly revoke: InvitationRequestHandler<EmptyRequestBody, null> = async (request, response) => {
        await this.service.revoke(this.createRevokeInput(
            request.params[CONVERSATION_PARAMS.ID],
            request.params[INVITATION_PARAMS.INVITATION_ID],
            request.user._id,
        ))
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(null))
    }

    /** Return a cache-free, minimal public preview without exposing the token in a response. */
    readonly preview: InvitationRequestHandler<EmptyRequestBody, InvitationPreviewDto> = async (request, response) => {
        const preview = await this.service.preview(request.params[INVITATION_PARAMS.TOKEN])
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(preview))
    }

    private createManageInput(conversationId: string, actorId: mongoose.Types.ObjectId): ManageInvitationsInput {
        return { conversationId: new mongoose.Types.ObjectId(conversationId), actorId }
    }

    private createIssueInput(
        conversationId: string,
        actorId: mongoose.Types.ObjectId,
        request: Request,
    ): IssueInvitationInput {
        const idempotencyKey = request.get(INVITATION_HEADERS.IDEMPOTENCY_KEY)
        if (!idempotencyKey) throw new ValidationException(INVITATION_MESSAGES.IDEMPOTENCY_KEY_REQUIRED)
        return { ...this.createManageInput(conversationId, actorId), idempotencyKey }
    }

    private createRevokeInput(
        conversationId: string,
        invitationId: string,
        actorId: mongoose.Types.ObjectId,
    ): RevokeInvitationInput {
        return {
            conversationId: new mongoose.Types.ObjectId(conversationId),
            invitationId: new mongoose.Types.ObjectId(invitationId),
            actorId,
        }
    }
}
