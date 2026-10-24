import { stdin, stderr, stdout } from "node:process"
import { createInterface } from "node:readline/promises"

import { BcryptPasswordHasher } from "../src/modules/auth/auth.security"

const PASSWORD_PROMPT = "Password to hash: "
const HASH_FAILURE_MESSAGE = "Could not hash password"

const main = async () => {
    const readline = createInterface({ input: stdin, output: stdout })

    try {
        const password = await readline.question(PASSWORD_PROMPT)
        const passwordHash = await new BcryptPasswordHasher().hash(password)
        stdout.write(`${passwordHash}\n`)
    } finally {
        readline.close()
    }
}

void main().catch((error: unknown) => {
    const reason = error instanceof Error ? error.message : "Unknown error"
    stderr.write(`${HASH_FAILURE_MESSAGE}: ${reason}\n`)
    process.exitCode = 1
})
