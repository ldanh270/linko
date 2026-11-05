import { LOCATION_DURATIONS, MESSAGE_LIMITS } from "@linko/contracts"
import { z } from "zod"
import { REGEX } from "../../configs/constants/regex"
import { LOCATION_BOUNDS as B } from "./location.constants"

const identifier = z.string().regex(REGEX.MONGO_ID)
const coordinateShape = {
    latitude: z.number().finite().min(-B.LATITUDE).max(B.LATITUDE), longitude: z.number().finite().min(-B.LONGITUDE).max(B.LONGITUDE),
    accuracy: z.number().finite().min(0).max(B.ACCURACY_METERS), publisherId: z.string().min(B.MIN_TOKEN_LENGTH).max(B.TOKEN_LENGTH),
}
/** Validate a share only after the user explicitly obtained a first location fix. */
export const locationCreateSchema = z.object({ params: z.object({ id: identifier }), body: z.object({
    ...coordinateShape, clientMessageId: z.string().min(1).max(MESSAGE_LIMITS.CLIENT_MESSAGE_ID_LENGTH),
    durationMinutes: z.number().refine((value) => LOCATION_DURATIONS.some((duration) => duration === value)),
}) })
/** Validate both identifiers for a visible location resource. */
export const locationResourceSchema = z.object({ params: z.object({ id: identifier, resourceId: identifier }) })
/** Bound location listing to one authorized conversation. */
export const locationListSchema = z.object({ params: z.object({ id: identifier }) })
/** Require a monotonic update sequence from the explicitly selected publisher. */
export const locationFixSchema = z.object({ params: locationResourceSchema.shape.params, body: z.object({
    ...coordinateShape, sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
}) })
