import { configureDnsServers } from "#/libs/database"

import mongoose from "mongoose"
import { pathToFileURL } from "node:url"

import { LINKO_COLLECTIONS } from "./databaseCollections"

/** Display collection counts for Linko's application database without modifying it. */
async function main(): Promise<void> {
    await import("dotenv/config")
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
        if (!database) throw new Error("Connected database is unavailable")

        const existingCollections = new Set(
            (await database.listCollections({}, { nameOnly: true }).toArray()).map(
                ({ name }) => name,
            ),
        )
        const counts = await Promise.all(
            LINKO_COLLECTIONS.map(
                async (name) =>
                    [
                        name,
                        existingCollections.has(name)
                            ? await database.collection(name).countDocuments()
                            : 0,
                    ] as const,
            ),
        )
        process.stdout.write(
            `${JSON.stringify({ database: mongoose.connection.name, collections: Object.fromEntries(counts) }, null, 2)}\n`,
        )
    } catch {
        process.stderr.write("Could not read database status; verify the connection and retry\n")
        process.exitCode = 1
    } finally {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    void main()
}
