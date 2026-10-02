import { HttpStatusCode } from "../configs/constants/httpStatusCode"
import { UserService } from "../services/user.service"
import type { Request, Response } from "express"

/** Expose the existing user search endpoint until the people feature migrates it. */
export class UserController {
    /** Bind the legacy user search use case. */
    constructor(private readonly service: UserService) {}

    /** Search public account summaries using the existing search contract. */
    searchUsers = async (request: Request, response: Response): Promise<void> => {
        const keyword = request.query.keyword
        const type = request.body.type
        if (!keyword) {
            response.status(HttpStatusCode.NO_CONTENT).json([])
            return
        }
        if (type !== "TYPING" && type !== "FULL") {
            response.status(HttpStatusCode.BAD_REQUEST).json({ message: "Invalid keyword type" })
            return
        }
        const users = await this.service.searchUserByKeywords({ keyword: String(keyword), type })
        response.status(HttpStatusCode.OK).json({ users })
    }
}
