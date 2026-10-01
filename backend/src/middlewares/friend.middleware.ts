import { HttpStatusCode } from "#/configs/constants/httpStatusCode"
import Friendship from "#/models/Friendship"

import { NextFunction, Request, Response } from "express"

const swap = (a: string, b: string) => (a < b ? [a, b] : [b, a])

// Only friends can send direct messages together
export const checkFriendship = async (req: Request, res: Response, next: NextFunction) => {
    const me = req.user._id.toString()

    const recipientId = req.body?.recipientId ?? null

    if (!recipientId)
        return res.status(HttpStatusCode.BAD_REQUEST).json({ message: "'recipientId' is required" })

    if (recipientId) {
        const [userA, userB] = swap(me, recipientId)

        const isFriend = await Friendship.findOne({ userA, userB })

        if (!isFriend)
            return res
                .status(HttpStatusCode.FORBIDDEN)
                .json({ message: "You are not friends with this user yet" })

        return next()
    }
}
