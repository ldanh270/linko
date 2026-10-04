import {
    CONVERSATION_PARAMS,
    NOTIFICATION_PREFERENCE_REQUEST_FIELDS,
    type ApiEnvelope,
    type NotificationPreferenceDto,
    type SetNotificationPreferenceRequest,
} from "@linko/contracts"
import type { RequestHandler } from "express"
import mongoose from "mongoose"

import { HttpStatusCode } from "../../configs/constants/httpStatusCode"
import { ApiResponse } from "../../shared/http/ApiResponse"
import { NOTIFICATION_FIELDS } from "./notification.constants"
import { NotificationPreferenceService } from "./notification.service"

type PreferenceRequestHandler = RequestHandler<Record<string, string>, ApiEnvelope<NotificationPreferenceDto>>
type SetPreferenceRequestHandler = RequestHandler<
    Record<string, string>,
    ApiEnvelope<NotificationPreferenceDto>,
    SetNotificationPreferenceRequest
>

/** Translate validated preference requests into the notification preference service.
 *
 * @layer Controller
 */
export class NotificationPreferenceController {
    /** Bind preference use cases without coupling service rules to Express. */
    constructor(private readonly service: NotificationPreferenceService) {}

    /** Read the authenticated participant's current notification preference. */
    readonly get: PreferenceRequestHandler = async (request, response) => {
        const preference = await this.service.get(
            request.user._id,
            new mongoose.Types.ObjectId(request.params[CONVERSATION_PARAMS.ID]),
        )
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(preference))
    }

    /** Set the authenticated participant's group notification preference. */
    readonly set: SetPreferenceRequestHandler = async (request, response) => {
        const preference = await this.service.setMuted({
            [NOTIFICATION_FIELDS.CONVERSATION_ID]: new mongoose.Types.ObjectId(
                request.params[CONVERSATION_PARAMS.ID],
            ),
            [NOTIFICATION_FIELDS.USER_ID]: request.user._id,
            [NOTIFICATION_PREFERENCE_REQUEST_FIELDS.IS_MUTED]:
                request.body[NOTIFICATION_PREFERENCE_REQUEST_FIELDS.IS_MUTED],
        })
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(preference))
    }
}
