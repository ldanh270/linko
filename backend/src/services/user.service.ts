import User from "../models/User"

interface KeywordsType {
    readonly keyword: string
    readonly type: "TYPING" | "FULL"
}

/** Keep the legacy people search query available while profile persistence moves to its module. */
export class UserService {
    /** Find account summaries matching the existing search interaction. */
    async searchUserByKeywords({ keyword, type }: KeywordsType) {
        const limit = type === "TYPING" ? 5 : 50
        return User.find({
            $or: [
                { username: { $regex: keyword, $options: "i" } },
                { fullName: { $regex: keyword, $options: "i" } },
            ],
        })
            .select("_id username fullName avatar.url")
            .limit(limit)
    }
}
