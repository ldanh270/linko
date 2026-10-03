import type { Model, Query, Schema, UpdateWriteOpResult } from "mongoose"

const ACTIVE_FILTER = { delFlag: { $ne: true } } as const
const DELETE_ERROR = "Use softDelete instead of a hard delete"

/** Hide deleted documents by default and reject model-level hard deletes. */
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

/** Mark matching active records deleted while retaining their audit trail. */
export async function softDelete<T extends object>(model: Model<T>, filter: Record<string, unknown>): Promise<UpdateWriteOpResult> {
    return model.updateOne({ ...filter, ...ACTIVE_FILTER }, { $set: { delFlag: true } })
}
