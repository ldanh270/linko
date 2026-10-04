import { ATTACHMENT_ROUTE_PARAMS } from "./attachment.constants"
import { REGEX } from "../../configs/constants/regex"
import zod from "zod"

/** Validate the two identifiers used to resolve one protected download. */
export const downloadAttachmentSchema = zod.object({
    params: zod.object({
        [ATTACHMENT_ROUTE_PARAMS.MESSAGE_ID]: zod.string().regex(REGEX.MONGO_ID),
        [ATTACHMENT_ROUTE_PARAMS.ATTACHMENT_ID]: zod.string().regex(REGEX.MONGO_ID),
    }),
})
