import {
    PIN_PARAMS,
    type ApiEnvelope,
    type PinnedMessageDto,
} from "@linko/contracts"
import type { RequestHandler } from "express"
import mongoose from "mongoose"

import { HttpStatusCode } from "../../configs/constants/httpStatusCode"
import { ApiResponse } from "../../shared/http/ApiResponse"
import { PIN_OPERATION_FIELDS } from "./pin.constants"
import { PinService } from "./pin.service"

type EmptyRequestBody = Record<string, never>
type PinRequestHandler = RequestHandler<Record<string, string>, ApiEnvelope<PinnedMessageDto[]>, EmptyRequestBody>

/** Translate validated pin requests into one service operation.
 *
 * @layer Controller
 */
export class PinController {
    /** Bind the pin use cases without coupling them to Express request state. */
    constructor(private readonly service: PinService) {}

    /** Pin a message and return the viewer-visible ordered pin list. */
    readonly pin: PinRequestHandler = async (request, response) => {
        const pins = await this.service.pin({
            [PIN_OPERATION_FIELDS.CONVERSATION_ID]: new mongoose.Types.ObjectId(
                request.params[PIN_PARAMS.CONVERSATION_ID],
            ),
            [PIN_OPERATION_FIELDS.MESSAGE_ID]: new mongoose.Types.ObjectId(
                request.params[PIN_PARAMS.MESSAGE_ID],
            ),
            [PIN_OPERATION_FIELDS.ACTOR_ID]: request.user._id,
        })
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(pins))
    }

    /** Remove a message pin and return the viewer-visible ordered pin list. */
    readonly unpin: PinRequestHandler = async (request, response) => {
        const pins = await this.service.unpin({
            [PIN_OPERATION_FIELDS.CONVERSATION_ID]: new mongoose.Types.ObjectId(
                request.params[PIN_PARAMS.CONVERSATION_ID],
            ),
            [PIN_OPERATION_FIELDS.MESSAGE_ID]: new mongoose.Types.ObjectId(
                request.params[PIN_PARAMS.MESSAGE_ID],
            ),
            [PIN_OPERATION_FIELDS.ACTOR_ID]: request.user._id,
        })
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(pins))
    }

    /** List message pins visible to the authenticated current group member. */
    readonly list: RequestHandler<Record<string, string>, ApiEnvelope<PinnedMessageDto[]>, EmptyRequestBody> =
        async (request, response) => {
            const pins = await this.service.list(
                new mongoose.Types.ObjectId(request.params[PIN_PARAMS.CONVERSATION_ID]),
                request.user._id,
            )
            response.status(HttpStatusCode.OK).json(ApiResponse.ok(pins))
        }
}
