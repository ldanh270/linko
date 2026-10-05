import { spawn } from "node:child_process"
import { pathToFileURL } from "node:url"

/** Open the configured MongoDB database in an installed `mongosh` process. */
async function main(): Promise<void> {
    await import("dotenv/config")
    const connectionString = process.env.MONGODB_CONNECTION_STRING
    if (!connectionString?.trim()) {
        process.stderr.write("MONGODB_CONNECTION_STRING is required\n")
        process.exitCode = 1
        return
    }

    const shell = spawn("mongosh", [connectionString], { stdio: "inherit" })
    shell.on("error", (error: NodeJS.ErrnoException) => {
        process.stderr.write(
            error.code === "ENOENT"
                ? "mongosh is not installed or is missing from PATH\n"
                : "Could not start mongosh\n",
        )
        process.exitCode = 1
    })
    shell.on("exit", (code) => {
        process.exitCode = code ?? 1
    })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    void main()
}
