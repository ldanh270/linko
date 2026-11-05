import type { RequestHandler } from "express"
import { Types } from "mongoose"
import { ApiResponse } from "../../shared/http/ApiResponse"
import type { ReminderService } from "./reminder.service"

/** Translate authenticated private inbox actions without trusting client owner IDs.
 * @layer Controller
 */
export class ReminderController {
    /** Bind private reminder use cases. */
    constructor(private readonly service: ReminderService) {}
    /** Schedule one private reminder from an authorized chat message. */
    readonly create: RequestHandler<Record<string, string>> = async (request, response) => {
        const actor = { actorId: request.user._id, conversationId: new Types.ObjectId(request.params.id), messageId: new Types.ObjectId(request.params.messageId) }
        response.status(201).json(ApiResponse.ok(await this.service.create(actor, request.body)))
    }
    /** List the current user's visible reminder inbox. */
    readonly list: RequestHandler<Record<string, string>> = async (request, response) => {
        response.json(ApiResponse.ok(await this.service.list(request.user._id)))
    }
    /** Return a validated owner-scoped page and authoritative authorized unread count. */
    readonly inbox: RequestHandler<Record<string, string>> = async (request, response) => {
        const cursor = typeof request.query.cursor === "string" ? new Types.ObjectId(request.query.cursor) : undefined
        response.json(ApiResponse.ok(await this.service.inbox(request.user._id, cursor)))
    }
    /** Read one owned reminder and its source link. */
    readonly get: RequestHandler<Record<string, string>> = async (request, response) => {
        response.json(ApiResponse.ok(await this.service.get(request.user._id, new Types.ObjectId(request.params.resourceId))))
    }
    /** Mark one delivered reminder read. */
    readonly read: RequestHandler<Record<string, string>> = async (request, response) => {
        response.json(ApiResponse.ok(await this.service.read(request.user._id, new Types.ObjectId(request.params.resourceId))))
    }
    /** Mark all currently accessible delivered inbox records read. */
    readonly readAll: RequestHandler<Record<string, string>> = async (request, response) => {
        await this.service.readAll(request.user._id)
        response.json(ApiResponse.ok(null))
    }
    /** Edit one future private intent while invalidating an old worker lease. */
    readonly edit: RequestHandler<Record<string, string>> = async (request, response) => {
        response.json(ApiResponse.ok(await this.service.edit(request.user._id, new Types.ObjectId(request.params.resourceId), request.body)))
    }
    /** Soft-delete one owned reminder or delivery. */
    readonly dismiss: RequestHandler<Record<string, string>> = async (request, response) => {
        await this.service.dismiss(request.user._id, new Types.ObjectId(request.params.resourceId))
        response.json(ApiResponse.ok(null))
    }
}
