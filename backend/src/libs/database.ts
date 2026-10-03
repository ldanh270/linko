import { setServers } from "node:dns"

import mongoose from "mongoose"

/**
 * Connect to database
 * Using environment variables in .env file
 */
const connectDB = async () => {
    try {
        if (!process.env.MONGODB_CONNECTION_STRING) {
            throw new Error("Missing MONGODB_CONNECTION_STRING in .env file")
        }
        const dnsServers = process.env.DNS_SERVERS?.split(",")
            .map((server) => server.trim())
            .filter(Boolean)
        if (dnsServers?.length) {
            setServers(dnsServers)
        }
        // NOTE: Index transitions are applied only by the reviewed backfill command.
        await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, { autoIndex: false })

        console.log("Connect to database successfully")
    } catch (error) {
        console.error("Connect to database error:", error)
        process.exit(1)
    }
}

export { connectDB }
