import type { Request } from "express"
import type { RequestHandler } from "express"
import { Types } from "mongoose"
import { ApiResponse } from "../../shared/http/ApiResponse"
import type { UtilityActor } from "../utility/utility.types"
import type { AppointmentService } from "./appointment.service"

type ActorRequest = Request<Record<string, string>>

/** Translate validated appointment HTTP commands into one domain operation.
 * @layer Controller
 */
export class AppointmentController {
    /** Bind appointment use cases at the composition boundary. */
    constructor(private readonly service: AppointmentService) {}
    /** Create one appointment and its first-class timeline message. */
    readonly create: RequestHandler<Record<string, string>> = async (request, response) => {
        response.status(201).json(ApiResponse.ok(await this.service.create(actor(request), request.body)))
    }
    /** List visible appointment cards. */
    readonly list: RequestHandler<Record<string, string>> = async (request, response) => {
        response.json(ApiResponse.ok(await this.service.list(actor(request))))
    }
    /** Read one viewer-authorized appointment. */
    readonly get: RequestHandler<Record<string, string>> = async (request, response) => {
        response.json(ApiResponse.ok(await this.service.get(actor(request), resource(request))))
    }
    /** Edit using the submitted optimistic revision. */
    readonly update: RequestHandler<Record<string, string>> = async (request, response) => {
        response.json(ApiResponse.ok(await this.service.update(actor(request), resource(request), request.body)))
    }
    /** Cancel an appointment without deleting its historical card. */
    readonly cancel: RequestHandler<Record<string, string>> = async (request, response) => {
        response.json(ApiResponse.ok(await this.service.cancel(actor(request), resource(request))))
    }
    /** Set the current user's attendance and reminder preference. */
    readonly respond: RequestHandler<Record<string, string>> = async (request, response) => {
        response.json(ApiResponse.ok(await this.service.respond(actor(request), resource(request), request.body)))
    }
}

function actor(request: ActorRequest): UtilityActor { return { actorId: request.user._id, conversationId: new Types.ObjectId(request.params.id) } }
function resource(request: ActorRequest): Types.ObjectId { return new Types.ObjectId(request.params.resourceId) }
