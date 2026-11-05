import type { CreateLocationRequest, UpdateLocationRequest } from "@linko/contracts"
import type { Request, RequestHandler } from "express"
import { Types } from "mongoose"
import { ApiResponse } from "../../shared/http/ApiResponse"
import { HttpStatusCode } from "../../configs/constants/httpStatusCode"
import { LocationService } from "./location.service"
import type { LocationActor } from "./location.types"

/** Translate HTTP transport into one authorized location operation.
 * @layer Controller
 */
export class LocationController {
    /** Bind the foreground sharing service once. */
    constructor(private readonly service: LocationService) {}
    /** List viewer-visible shares. */
    readonly list: RequestHandler = async (request, response) => { response.json(ApiResponse.ok(await this.service.list(actor(request)))) }
    /** Start a deliberate time-limited sharing session. */
    readonly create: RequestHandler<Record<string, string>, unknown, CreateLocationRequest> = async (request, response) => {
        response.status(HttpStatusCode.CREATED).json(ApiResponse.ok(await this.service.create({ ...actor(request), request: request.body })))
    }
    /** Return the currently authorized latest coordinate. */
    readonly get: RequestHandler = async (request, response) => { response.json(ApiResponse.ok(await this.service.get(actor(request)))) }
    /** Accept a foreground publisher fix without broadcasting its coordinate. */
    readonly update: RequestHandler<Record<string, string>, unknown, UpdateLocationRequest> = async (request, response) => {
        response.json(ApiResponse.ok(await this.service.update({ ...actor(request), request: request.body })))
    }
    /** Stop an owned session and remove precise stored position. */
    readonly stop: RequestHandler = async (request, response) => { response.json(ApiResponse.ok(await this.service.stop(actor(request)))) }
}

function actor(request: Request): LocationActor {
    return { conversationId: new Types.ObjectId(String(request.params.id)), actorId: request.user._id,
        resourceId: new Types.ObjectId(request.params.resourceId ? String(request.params.resourceId) : undefined) }
}
