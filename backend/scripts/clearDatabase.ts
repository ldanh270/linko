import { configureDnsServers } from "#/libs/database"

import mongoose from "mongoose"
import { stdin, stdout } from "node:process"
import { createInterface } from "node:readline/promises"
import { pathToFileURL } from "node:url"

import { LINKO_COLLECTIONS } from "./databaseCollections"

/** Delete records from Linko collections while retaining collections, indexes, and unrelated data. */
export async function clearLinkoCollections(
    database: NonNullable<typeof mongoose.connection.db>,
): Promise<Record<string, number>> {
    const existingCollections = new Set(
        (await database.listCollections({}, { nameOnly: true }).toArray()).map(({ name }) => name),
    )
    const results = await Promise.all(
        LINKO_COLLECTIONS.filter((name) => existingCollections.has(name)).map(
            async (name) =>
                [name, (await database.collection(name).deleteMany({})).deletedCount] as const,
        ),
    )
    return Object.fromEntries(results)
}

/** Ask the operator to confirm the exact connected database name before deleting data. */
async function confirmDatabaseName(databaseName: string): Promise<boolean> {
    const readline = createInterface({ input: stdin, output: stdout })
    const abort = new AbortController()
    const onEnd = () => abort.abort()
    stdin.once("end", onEnd)
    if (stdin.readableEnded) abort.abort()

    try {
        const answer = await readline.question(
            `Type database name "${databaseName}" to clear Linko collections: `,
            { signal: abort.signal },
        )
        return answer.trim() === databaseName
    } catch (error) {
        if (!abort.signal.aborted) throw error
        return false
    } finally {
        stdin.off("end", onEnd)
        readline.close()
    }
}

/** Connect to the configured database and clear Linko data only after explicit confirmation. */
async function main(): Promise<void> {
    await import("dotenv/config")
    if (process.env.NODE_ENV === "production") {
        process.stderr.write("Database clear is disabled when NODE_ENV=production\n")
        process.exitCode = 1
        return
    }

    const connectionString = process.env.MONGODB_CONNECTION_STRING
    if (!connectionString?.trim()) {
        process.stderr.write("MONGODB_CONNECTION_STRING is required\n")
        process.exitCode = 1
        return
    }

    try {
        configureDnsServers()
        await mongoose.connect(connectionString, { autoCreate: false, autoIndex: false })
        const database = mongoose.connection.db
        const databaseName = mongoose.connection.name
        if (!database || !databaseName) throw new Error("Connected database is unavailable")

        process.stdout.write(`Connected to database: ${databaseName}\n`)
        if (!(await confirmDatabaseName(databaseName))) {
            process.stdout.write("Database clear cancelled. No records were changed.\n")
            return
        }

        const deletedCounts = await clearLinkoCollections(database)
        process.stdout.write(`${JSON.stringify({ message: "Database cleared", deletedCounts })}\n`)
    } catch {
        process.stderr.write("Database clear failed; verify the connection and retry\n")
        process.exitCode = 1
    } finally {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    void main()
}
