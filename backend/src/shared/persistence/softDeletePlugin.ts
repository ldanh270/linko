/**
 * @file softDeletePlugin.ts
 * @module backend/shared/persistence/softDeletePlugin
 * @description Mongoose plugin that implements transparent soft-delete filtering and guards
 * against accidental hard deletions across all managed schemas.
 */

import type { Model, Query, Schema, UpdateWriteOpResult } from "mongoose"

const ACTIVE_FILTER = { delFlag: { $ne: true } } as const
const DELETE_ERROR = "Use softDelete instead of a hard delete"

/**
 * Mongoose schema plugin that adds soft-delete fields and hooks.
 * Automatically appends `{ delFlag: { $ne: true } }` to find, count, and aggregate operations
 * unless explicitly bypassed with `{ includeDeleted: true }`. Intercepts and throws on direct hard-delete attempts.
 *
 * @param schema - The Mongoose schema to extend with soft-delete capabilities.
 */
export function softDeletePlugin(schema: Schema): void {
    schema.add({ delFlag: { type: Boolean, default: false, index: true } })

    schema.pre(/^find/, function (this: Query<unknown, unknown>) {
        if (!this.getOptions().includeDeleted) this.where(ACTIVE_FILTER)
    })
    schema.pre("countDocuments", function () {
        if (!this.getOptions().includeDeleted) this.where(ACTIVE_FILTER)
    })
    schema.pre("aggregate", function () {
        if (!this.options.includeDeleted) this.pipeline().unshift({ $match: ACTIVE_FILTER })
    })

    schema.pre(["deleteOne", "deleteMany", "findOneAndDelete"], { query: true, document: false }, function () {
        throw new Error(DELETE_ERROR)
    })
    schema.pre("deleteOne", { document: true, query: false }, function () {
        throw new Error(DELETE_ERROR)
    })
    schema.pre("bulkWrite", function (operations) {
        if (operations.some((operation) => "deleteOne" in operation || "deleteMany" in operation)) {
            throw new Error(DELETE_ERROR)
        }
    })
}

/**
 * Marks matching active records as soft-deleted (`delFlag: true`) while preserving their audit trail.
 *
 * @template T - The Mongoose document schema interface.
 * @param model - The Mongoose model to execute the soft-delete on.
 * @param filter - The query filter identifying records to soft-delete.
 * @returns The Mongoose UpdateWriteOpResult.
 */
export async function softDelete<T extends object>(model: Model<T>, filter: Record<string, unknown>): Promise<UpdateWriteOpResult> {
    return model.updateOne({ ...filter, ...ACTIVE_FILTER }, { $set: { delFlag: true } })
}

