import type { RequestHandler } from "express"
import { Types } from "mongoose"
import { ApiResponse } from "../../shared/http/ApiResponse"
import type { UtilityContextService } from "./utility.context"

/** Translate validated deep links into a history-context query.
 * @layer Controller
 */
export class UtilityContextController {
  /** Inject the single context use case. */
  constructor(private readonly service: UtilityContextService) {}
  /** Return a viewer-safe chronological neighborhood. */
  readonly get: RequestHandler = async (request, response) => {
    const messages = await this.service.get({ conversationId: new Types.ObjectId(String(request.params.id)), messageId: new Types.ObjectId(String(request.params.messageId)), actorId: request.user._id })
    response.json(ApiResponse.ok(messages))
  }
}
