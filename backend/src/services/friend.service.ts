import { HttpStatusCode } from "#/configs/constants/httpStatusCode"
import FriendRequest, { FriendRequestType } from "#/models/FriendRequest"
import Friendship from "#/models/Friendship"
import User from "#/models/User"

import { QueryFilter, Types } from "mongoose"

export class FriendService {
    getAllFriends = async (userId: string) => {
        // Find user's friendships in database
        const friendShips = await Friendship.find({
            $or: [{ userA: userId }, { userB: userId }],
        })
            .populate("userA", "_id displayName avatar.url")
            .populate("userB", "_id displayName avatar.url")
            .lean()

        // User have no friend
        if (friendShips.length === 0) return []

        // Get friend list of userId
        const friends = friendShips.map((fs) =>
            fs.userA._id.toString() === userId.toString() ? fs.userB : fs.userA,
        )

        return friends
    }

    getAllFriendRequests = async (userId: string, type: "SENT" | "RECEIVED" | "BOTH") => {
        let filter: QueryFilter<FriendRequestType> = {}
        const selectFields = "_id username displayName avatar.url"

        if (type === "SENT") {
            // SENT: Only Sent requests (from: userId)
            filter = { from: userId }
        } else if (type === "RECEIVED") {
            // RECEIVED: Only Received requests (to: UserId)
            filter = { to: userId }
        } else {
            // BOTH: Both Sent & Received
            filter = {
                $or: [{ from: userId }, { to: userId }],
            }
        }

        // Friend request list result
        const query = FriendRequest.find(filter) // No await here to add populate below

        // Populate to get friends data
        if (type === "SENT") {
            // Only received users (to)
            query.select("-from").populate("to", selectFields)
        } else if (type === "RECEIVED") {
            // Only sent users (from)
            query.select("-to").populate("from", selectFields)
        } else {
            // BOTH
            query.populate("from", selectFields)
            query.populate("to", selectFields)
        }

        const list = await query.exec() // Execute query

        return list
    }

    sendFriendRequest = async (from: string, to: string, message?: string) => {
        // Check is toUser exists
        const user = await User.exists({ _id: to })
        if (!user) throw new Error("toUser not exists")

        // Swap by _id to check friendship existing
        let userA = from.toString()
        let userB = to.toString()

        if (userA > userB) [userA, userB] = [userB, userA] // Swap userA & userB if userA > userB

        // Get already friend or existing request status
        const [alreadyFriend, existingRequest] = await Promise.all([
            Friendship.findOne({ userA, userB }),
            FriendRequest.findOne({
                $or: [
                    { from, to },
                    {
                        from: to,
                        to: from,
                    },
                ],
            }),
        ])

        // Already be friends
        if (alreadyFriend) throw new Error("Users are already friends")

        // Already sent request
        if (existingRequest) throw new Error("Friend request already pending")

        // Create friend request in database
        const request = await FriendRequest.create({ from, to, message })

        await request.populate("to", "_id username displayName avatar.url")

        return request
    }

    acceptRequest = async (requestId: string, userId: string) => {
        const friendRequest = await FriendRequest.findOne({ _id: requestId })

        // Validate
        if (!friendRequest) throw new Error("Friend request not exists")

        // Only received user can be accept request
        if (userId.toString() !== friendRequest.to.toString())
            throw new Error("Only invited user can be accept request")

        // Swap if userA > userB before create friendship
        let userA = userId.toString()
        let userB = friendRequest.from.toString()

        if (userA > userB) [userA, userB] = [userB, userA] // Swap userA & userB if userA > userB

        // Create friendship
        const friendship = await Friendship.create({ userA, userB })

        // Delete request
        await FriendRequest.findByIdAndDelete(requestId)

        await friendship.populate([
            { path: "userA", select: "name avatar email" },
            { path: "userB", select: "name avatar email" },
        ])

        return friendship
    }

    declineRequest = async (requestId: string, userId: string) => {
        const friendRequest = await FriendRequest.findOne({ _id: requestId })

        // Validate
        if (!friendRequest) throw new Error("Friend request not exists")

        // Only received user can be deny request
        if (userId.toString() !== friendRequest.to.toString())
            throw new Error("Only invited user can be decline request")

        // Delete request
        await FriendRequest.findByIdAndDelete(requestId)
    }

    unfriend = async (userId: string, friendId: string) => {
        let [userA, userB] = [userId, friendId]

        // Swap if userId > friendId (In database userA always < userB)
        if (userA > userB) [userA, userB] = [userB, userA]

        // Delete friendship
        await Friendship.findOneAndDelete({ userA, userB })
    }
}
