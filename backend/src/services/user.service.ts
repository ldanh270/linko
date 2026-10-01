import cloudinary from "#/configs/cloudinary.config"
import User from "#/models/User"
import { processImageHelper } from "#/utils/image.util"

interface KeywordsType {
    keyword: string
    type: "TYPING" | "FULL"
}

interface ImageParams {
    url: string
    id: string
}

interface UpdateUserParams {
    userId: string
    updateData: {
        username?: string
        displayName?: string
        email?: string
        phone?: string
        avatar?: string // Can be null (if delete)
        background?: string // Can be null (if delete)
        bio?: string
    }
    files?: { [key: string]: Express.Multer.File[] } // File từ Multer
}

export class UserService {
    searchUserByKeywords = async ({ keyword, type }: KeywordsType) => {
        const TYPING_LIMIT = 5
        const FULL_LIMIT = 50

        /**
         *  Limit by type
         */
        const limit = type === "TYPING" ? TYPING_LIMIT : FULL_LIMIT

        /**
         * $regex allow keyword approximately
         * $options to allow case-insensitive
         */
        const users = await User.find({
            $or: [
                { username: { $regex: keyword, $options: "i" } },
                { fullName: { $regex: keyword, $options: "i" } },
            ],
        })
            .select("_id username fullName avatar.url")
            .limit(limit)

        return users
    }

    getUserInfo = async ({ userId }: { userId: string }) => {
        const user = await User.findById({ _id: userId })

        return user
    }

    /**
     * Update current user info
     * @param userId Current user id
     * @param updateData Update required fields (text)
     * @param files Image such as avatar, background to update
     * @returns New user with updated info
     */
    updateUserInfo = async ({ userId, updateData, files }: UpdateUserParams) => {
        //  Check user
        const user = await User.findById(userId)
        if (!user) throw new Error("User not found")

        /**
         * Update avatar
         */
        if (files?.avatar?.[0]) {
            const newAvatar = await processImageHelper({
                currentImage: user.avatar as ImageParams,
                newFile: files?.avatar?.[0],
                shouldDelete: updateData.avatar === "null",
            })

            // Only update if return value different with undefined
            if (newAvatar !== undefined) {
                user.avatar = newAvatar
            }
        }

        /**
         * Update background
         */
        if (files?.background?.[0]) {
            const newBackground = await processImageHelper({
                currentImage: user.background as ImageParams,
                newFile: files?.background?.[0],
                shouldDelete: updateData.background === "null",
            })

            // Only update if return value different with undefined
            if (newBackground !== undefined) {
                user.background = newBackground
            }
        }

        /**
         * Update Text Fields
         */
        if (updateData.username) user.username = updateData.username
        if (updateData.displayName) user.displayName = updateData.displayName

        if (updateData.email) user.email = updateData.email
        if (updateData.phone) user.phone = updateData.phone

        if (updateData.bio) user.bio = updateData.bio

        // Save updated user
        await user.save()

        return user
    }
}
