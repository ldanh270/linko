import type { CreatePollRequest } from "@linko/contracts"
import type { RequestHandler, Request } from "express"
import { Types } from "mongoose"
import { ApiResponse } from "../../shared/http/ApiResponse"
import { HttpStatusCode } from "../../configs/constants/httpStatusCode"
import { PollService } from "./poll.service"
import type { PollActor } from "./poll.types"

/** Translate validated HTTP requests into one poll service operation.
 * @layer Controller
 */
export class PollController {
    /** Bind poll use cases once at the composition root. */
    constructor(private readonly service: PollService) {}
    /** Return visible conversation polls. */
    readonly list: RequestHandler = async (request, response) => { response.json(ApiResponse.ok(await this.service.list(actor(request)))) }
    /** Create a poll and return its safe viewer result. */
    readonly create: RequestHandler<Record<string, string>, unknown, CreatePollRequest> = async (request, response) => {
        response.status(HttpStatusCode.CREATED).json(ApiResponse.ok(await this.service.create({ ...actor(request), request: request.body })))
    }
    /** Return one visible poll. */
    readonly get: RequestHandler = async (request, response) => { response.json(ApiResponse.ok(await this.service.get(actor(request)))) }
    /** Atomically replace the authenticated user's complete vote. */
    readonly vote: RequestHandler<Record<string, string>, unknown, { optionIds: string[] }> = async (request, response) => {
        response.json(ApiResponse.ok(await this.service.vote({ ...actor(request), optionIds: request.body.optionIds })))
    }
    /** Withdraw the authenticated user's vote. */
    readonly withdraw: RequestHandler = async (request, response) => { response.json(ApiResponse.ok(await this.service.vote({ ...actor(request), optionIds: [] }))) }
    /** Close a poll without deleting its results. */
    readonly close: RequestHandler = async (request, response) => { response.json(ApiResponse.ok(await this.service.close(actor(request)))) }
}

function actor(request: Request): PollActor {
    return { conversationId: new Types.ObjectId(String(request.params.id)), actorId: request.user._id,
        resourceId: new Types.ObjectId(request.params.resourceId ? String(request.params.resourceId) : undefined) }
}
