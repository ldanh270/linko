/**
 * @file withTransaction.ts
 * @module backend/shared/persistence/withTransaction
 * @description Higher-order transaction boundary executor for MongoDB replica-set transactions.
 */

import mongoose, { type ClientSession } from "mongoose"

/**
 * Opaque transaction context passed from service boundaries down to Mongoose repositories.
 * Encapsulates the active MongoDB ClientSession to ensure all operations join the same transaction.
 */
export interface TransactionContext {
    readonly session: ClientSession
}

/**
 * Executes an asynchronous service operation atomically within a managed MongoDB transaction session.
 * Automatically commits the transaction upon successful completion or aborts it if an error occurs.
 *
 * @template T - The return type of the transactional operation.
 * @param operation - A callback function accepting the TransactionContext.
 * @returns The resolved result of the transaction operation.
 * @throws Any error thrown during the operation or commit process, triggering automatic rollback.
 */
export async function withTransaction<T>(operation: (transaction: TransactionContext) => Promise<T>): Promise<T> {
    const session = await mongoose.startSession()
    try {
        return await session.withTransaction(() => operation({ session }))
    } finally {
        await session.endSession()
    }
}

