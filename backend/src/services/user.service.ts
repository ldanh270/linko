import User from "#/models/User"
import { deleteStoredProfileImage, ImageParams, storeProfileImage } from "#/utils/image.util"

interface KeywordsType {
    keyword: string
    type: "TYPING" | "FULL"
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

        const uploadedImages: ImageParams[] = []
        const obsoleteImages: ImageParams[] = []

        try {
            for (const field of ["avatar", "background"] as const) {
                const currentImage = user[field] as ImageParams | undefined
                const file = files?.[field]?.[0]
                const shouldDelete = updateData[field] === "null"

                if (file) {
                    const newImage = await storeProfileImage({
                        userId,
                        field,
                        file,
                    })
                    uploadedImages.push(newImage)
                    user[field] = newImage
                    if (currentImage?.id) obsoleteImages.push(currentImage)
                } else if (shouldDelete) {
                    user[field] = null
                    if (currentImage?.id) obsoleteImages.push(currentImage)
                }
            }

            if (updateData.username) user.username = updateData.username
            if (updateData.displayName) user.displayName = updateData.displayName
            if (updateData.email) user.email = updateData.email
            if (updateData.phone) user.phone = updateData.phone
            if (updateData.bio) user.bio = updateData.bio

            await user.save()
        } catch (error) {
            for (const image of uploadedImages) {
                try {
                    await deleteStoredProfileImage(image)
                } catch (cleanupError) {
                    console.error("Failed to clean up new R2 profile image", cleanupError)
                }
            }
            throw error
        }

        for (const image of obsoleteImages) {
            try {
                await deleteStoredProfileImage(image)
            } catch (error) {
                console.error("Failed to clean up replaced profile image", error)
            }
        }

        return user
    }
}
