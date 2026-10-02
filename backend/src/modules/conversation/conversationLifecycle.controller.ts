import {
    CONVERSATION_PARAMS,
    type ApiEnvelope,
    type GroupDto,
} from "@linko/contracts"
import type { RequestHandler } from "express"
import mongoose from "mongoose"

import { HttpStatusCode } from "../../configs/constants/httpStatusCode"
import { ApiResponse } from "../../shared/http/ApiResponse"
import { ConversationLifecycleService } from "./conversationLifecycle.service"
import type { CloseGroupInput, LeaveGroupInput } from "./conversationLifecycle.types"

type LifecycleRequestHandler<Data> = RequestHandler<Record<string, string>, ApiEnvelope<Data>, Record<string, never>>

/** Translate lifecycle HTTP inputs into one service operation. */
export class ConversationLifecycleController {
    /** Bind the leave and close use cases without coupling them to Express. */
    constructor(private readonly service: ConversationLifecycleService) {}

    /** Leave the requested group as the authenticated participant. */
    readonly leave: LifecycleRequestHandler<null> = async (request, response) => {
        await this.service.leave(this.createLeaveInput(request.params[CONVERSATION_PARAMS.ID], request.user._id))
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(null))
    }

    /** Close the requested group and return its safe terminal DTO. */
    readonly close: LifecycleRequestHandler<GroupDto> = async (request, response) => {
        const group = await this.service.close(this.createCloseInput(
            request.params[CONVERSATION_PARAMS.ID],
            request.user._id,
        ))
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(group))
    }

    private createLeaveInput(conversationId: string, actorId: mongoose.Types.ObjectId): LeaveGroupInput {
        return { conversationId: new mongoose.Types.ObjectId(conversationId), actorId }
    }

    private createCloseInput(conversationId: string, actorId: mongoose.Types.ObjectId): CloseGroupInput {
        return { conversationId: new mongoose.Types.ObjectId(conversationId), actorId }
    }
}
