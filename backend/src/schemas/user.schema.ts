import { REGEX } from "#/configs/constants/regex"

import zod from "zod"

const updateUserSchema = zod.object({
    body: zod.object({
        username: zod
            .string()
            .min(3, "Username must at least 3 characters")
            .max(30, "Username must not exceed 30 characters")
            .trim()
            .toLowerCase()
            .regex(
                REGEX.USERNAME,
                "Username can only contain lowercase letters, numbers, underscores (_) and dots (.)",
            )
            .optional(),
        displayName: zod
            .string()
            .min(1, "Display name cannot empty")
            .max(50, "Username must not exceed 30 characters")
            .optional(),
        email: zod.email("Invalid email").trim().optional(),
        phone: zod.string().regex(REGEX.PHONE, "Invalid phone format").optional(),
        bio: zod.string().max(200).optional().optional(),
    }),
})

export { updateUserSchema }
