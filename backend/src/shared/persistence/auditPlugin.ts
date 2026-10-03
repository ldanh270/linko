import mongoose, { type Schema } from "mongoose"

import { requestContext } from "../middlewares/requestContext"

/** Reserved ObjectId for writes without an authenticated request actor. */
export const SYSTEM_ACTOR_ID = new mongoose.Types.ObjectId("000000000000000000000001")

const auditValues = () => {
    const context = requestContext.getStore()
    const actor = context?.userId ? new mongoose.Types.ObjectId(context.userId) : SYSTEM_ACTOR_ID
    return { actor, ip: context?.ip ?? null }
}

const UNSUPPORTED_WRITE_ERROR = "Replacement and pipeline writes bypass audit fields"

/** Add actor and IP audit fields to every persisted document and update. */
export function auditPlugin(schema: Schema): void {
    schema.add({
        createdBy: { type: mongoose.Schema.Types.ObjectId, default: SYSTEM_ACTOR_ID },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, default: SYSTEM_ACTOR_ID },
        createdIp: { type: String, default: null, maxlength: 45 },
        updatedIp: { type: String, default: null, maxlength: 45 },
    })

    schema.pre("save", function () {
        const { actor, ip } = auditValues()
        if (this.isNew) {
            this.set("createdBy", actor)
            this.set("createdIp", ip)
        }
        this.set("updatedBy", actor)
        this.set("updatedIp", ip)
    })

    schema.pre(["updateOne", "updateMany", "findOneAndUpdate"], function () {
        const { actor, ip } = auditValues()
        this.set({ updatedBy: actor, updatedIp: ip })
        if (this.getOptions().upsert) {
            const update = this.getUpdate()
            if (update && !Array.isArray(update)) {
                const insertion = update.$setOnInsert ?? {}
                this.setUpdate({
                    ...update,
                    $setOnInsert: { ...insertion, createdBy: actor, createdIp: ip },
                })
            }
        }
    })

    schema.pre("insertMany", function (documents) {
        const { actor, ip } = auditValues()
        for (const document of documents) {
            Object.assign(document, {
                createdBy: actor,
                updatedBy: actor,
                createdIp: ip,
                updatedIp: ip,
            })
        }
    })

    schema.pre(["replaceOne", "findOneAndReplace"], function () {
        throw new Error(UNSUPPORTED_WRITE_ERROR)
    })

    schema.pre("bulkWrite", function (operations) {
        const { actor, ip } = auditValues()
        for (const operation of operations) {
            if ("replaceOne" in operation) throw new Error(UNSUPPORTED_WRITE_ERROR)
            if ("insertOne" in operation) {
                Object.assign(operation.insertOne.document, {
                    createdBy: actor,
                    updatedBy: actor,
                    createdIp: ip,
                    updatedIp: ip,
                })
            }
            if ("updateOne" in operation) {
                const update = operation.updateOne.update
                if (Array.isArray(update)) throw new Error(UNSUPPORTED_WRITE_ERROR)
                Object.assign(update, {
                    $set: { ...update.$set, updatedBy: actor, updatedIp: ip },
                    ...(operation.updateOne.upsert ? {
                        $setOnInsert: { ...update.$setOnInsert, createdBy: actor, createdIp: ip },
                    } : {}),
                })
            }
            if ("updateMany" in operation) {
                const update = operation.updateMany.update
                if (Array.isArray(update)) throw new Error(UNSUPPORTED_WRITE_ERROR)
                Object.assign(update, {
                    $set: { ...update.$set, updatedBy: actor, updatedIp: ip },
                    ...(operation.updateMany.upsert ? {
                        $setOnInsert: { ...update.$setOnInsert, createdBy: actor, createdIp: ip },
                    } : {}),
                })
            }
        }
    })
}
