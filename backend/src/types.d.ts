import type { UserType } from "#/models/User"
import type { HydratedDocument } from "mongoose"

declare global {
    namespace Express {
        interface Request {
            user: HydratedDocument<UserType>
        }
    }
}
