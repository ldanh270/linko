import User from "#/models/User"

export const checkUniqueFields = async ({ key, value }: { key: string; value: string }) => {
    // Find user with {key: value} pair
    const user = await User.findOne({ [key]: value })

    // If existing user
    if (user) return user

    // If not exists
    return null
}
