import type { ApiEnvelope, ProfileDto, PublicUserDto, UpdateProfileRequest } from "@linko/contracts"
import type { RequestHandler } from "express"
import mongoose from "mongoose"

import { HttpStatusCode } from "../../configs/constants/httpStatusCode"
import { ApiResponse } from "../../shared/http/ApiResponse"
import { PROFILE_FIELDS, PROFILE_ROUTE_PARAMS } from "./profile.constants"
import { ProfileService } from "./profile.service"
import type { UpdateProfileInput } from "./profile.types"

/** Translate authenticated profile HTTP requests into profile use cases.
 *
 * @layer Controller
 */
export class ProfileController {
    /** Bind profile use cases without coupling business rules to Express. */
    constructor(private readonly service: ProfileService) {}

    /** Return private profile data for the authenticated owner. */
    readonly getMine: RequestHandler<Record<string, string>, ApiEnvelope<ProfileDto>, Record<string, never>> = async (request, response) => {
        const profile = await this.service.getMine(request.user._id)
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(profile))
    }

    /** Return the redacted public profile of one signed-in user's target. */
    readonly getPublic: RequestHandler<Record<string, string>, ApiEnvelope<PublicUserDto>, Record<string, never>> = async (request, response) => {
        const userId = new mongoose.Types.ObjectId(request.params[PROFILE_ROUTE_PARAMS.USER_ID])
        const profile = await this.service.getPublic(userId)
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(profile))
    }

    /** Update text fields and optional profile images for the authenticated owner. */
    readonly updateMine: RequestHandler<Record<string, string>, ApiEnvelope<ProfileDto>, UpdateProfileRequest> = async (request, response) => {
        const files = request.files as Record<string, Express.Multer.File[]> | undefined
        const avatar = files?.[PROFILE_FIELDS.AVATAR]?.[0]
        const background = files?.[PROFILE_FIELDS.BACKGROUND]?.[0]
        const input: UpdateProfileInput = {
            [PROFILE_FIELDS.USER_ID]: request.user._id,
            ...request.body,
            ...(avatar ? { [PROFILE_FIELDS.AVATAR]: avatar } : {}),
            ...(background ? { [PROFILE_FIELDS.BACKGROUND]: background } : {}),
        }
        const profile = await this.service.updateMine(input)
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(profile))
    }
}
