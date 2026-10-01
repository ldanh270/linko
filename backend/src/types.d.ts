import { Types } from "mongoose"

type Image = {
    url?: string
    id?: string
}

declare global {
    namespace Express {
        interface Request {
            user?: {
                _id: Types.ObjectId
                username: string
                email: string
                hashPassword?: string
                displayName?: string
                phone?: string
                avatar?: Image
                background?: Image
                bio?: string
                lastActive?: Date
            }
        }
    }
}
