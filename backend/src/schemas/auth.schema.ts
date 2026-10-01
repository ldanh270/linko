import { REGEX } from "#/configs/constants/regex"

import zod from "zod"

const signupSchema = zod.object({
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
            ),
        password: zod
            .string()
            .regex(
                REGEX.PASSWORD,
                "Password must have minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number and 1 special character.",
            ),
        displayName: zod.string().min(1, "Display name cannot empty"),
        email: zod.email("Invalid email").trim(),
    }),
})

const loginSchema = zod.object({
    body: zod.object({
        username: zod.string().min(1, "Username cannot be empty.").trim().toLowerCase(),
        password: zod.string().min(1, "Username cannot be empty."),
    }),
})

export { signupSchema, loginSchema }
