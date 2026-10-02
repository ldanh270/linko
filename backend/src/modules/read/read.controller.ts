import {
    CONVERSATION_PARAMS,
    READ_REQUEST_FIELDS,
    type ApiEnvelope,
    type MarkConversationReadRequest,
    type ReadStateDto,
} from "@linko/contracts"
import type { RequestHandler } from "express"
import mongoose from "mongoose"

import { HttpStatusCode } from "../../configs/constants/httpStatusCode"
import { ApiResponse } from "../../shared/http/ApiResponse"
import { READ_OPERATION_FIELDS } from "./read.constants"
import { ReadStateService } from "./read.service"

type ReadRequestHandler = RequestHandler<Record<string, string>, ApiEnvelope<ReadStateDto>, MarkConversationReadRequest>

/** Translate validated read-state requests into the domain service operation.
 *
 * @layer Controller
 */
export class ReadStateController {
    /** Bind the read-state service without coupling it to Express request state. */
    constructor(private readonly service: ReadStateService) {}

    /** Advance the authenticated participant's cursor and return the safe read-state DTO. */
    readonly markRead: ReadRequestHandler = async (request, response) => {
        const state = await this.service.markRead({
            [READ_OPERATION_FIELDS.CONVERSATION_ID]: new mongoose.Types.ObjectId(
                request.params[CONVERSATION_PARAMS.ID],
            ),
            [READ_OPERATION_FIELDS.USER_ID]: request.user._id,
            [READ_OPERATION_FIELDS.LAST_VISIBLE_MESSAGE_ID]: new mongoose.Types.ObjectId(
                request.body[READ_REQUEST_FIELDS.LAST_VISIBLE_MESSAGE_ID],
            ),
        })
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(state))
    }
}
