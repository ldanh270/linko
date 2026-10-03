import mongoose, { type ClientSession } from "mongoose"

/** Opaque transaction context passed from services to Mongoose repositories. */
export interface TransactionContext {
    readonly session: ClientSession
}

/** Run a service operation atomically using a MongoDB session. */
export async function withTransaction<T>(operation: (transaction: TransactionContext) => Promise<T>): Promise<T> {
    const session = await mongoose.startSession()
    try {
        return await session.withTransaction(() => operation({ session }))
    } finally {
        await session.endSession()
    }
}
