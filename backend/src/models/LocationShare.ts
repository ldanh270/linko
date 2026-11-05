import mongoose from "mongoose"
import { UTILITY_STATUS } from "@linko/contracts"
import { auditPlugin } from "../shared/persistence/auditPlugin"
import { softDeletePlugin } from "../shared/persistence/softDeletePlugin"
import { LOCATION_FIELDS as F, LOCATION_INDEXES } from "../modules/location/location.constants"

const schema = new mongoose.Schema({
    [F.CONVERSATION_ID]: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Conversation" },
    [F.MESSAGE_ID]: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Message" },
    [F.CREATOR_ID]: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" }, [F.CLIENT_ID]: { type: String, required: true },
    [F.PUBLISHER_ID]: { type: String, required: true, select: false },
    [F.LATITUDE]: Number, [F.LONGITUDE]: Number, [F.ACCURACY]: Number, [F.LAST_FIX_AT]: Date,
    [F.SEQUENCE]: { type: Number, default: 0 }, [F.EXPIRES_AT]: { type: Date, required: true }, [F.ENDED_AT]: { type: Date, default: null },
    [F.STATUS]: { type: String, enum: [UTILITY_STATUS.ACTIVE, UTILITY_STATUS.ENDED], default: UTILITY_STATUS.ACTIVE }, [F.REVISION]: { type: Number, default: 1 },
}, { timestamps: true })
schema.plugin(auditPlugin)
schema.plugin(softDeletePlugin)
schema.index({ [F.CONVERSATION_ID]: 1, [F.CREATED_AT]: -1 }, { name: LOCATION_INDEXES.CONVERSATION })
schema.index({ [F.CONVERSATION_ID]: 1, [F.CREATOR_ID]: 1 }, { name: LOCATION_INDEXES.ACTIVE, unique: true, partialFilterExpression: { [F.STATUS]: UTILITY_STATUS.ACTIVE, [F.DELETED]: false } })
schema.index({ [F.MESSAGE_ID]: 1 }, { name: LOCATION_INDEXES.MESSAGE, unique: true, partialFilterExpression: { [F.DELETED]: false } })
schema.index({ [F.CONVERSATION_ID]: 1, [F.CREATOR_ID]: 1, [F.CLIENT_ID]: 1 }, { name: LOCATION_INDEXES.COMMAND, unique: true, partialFilterExpression: { [F.DELETED]: false } })
schema.index({ [F.STATUS]: 1, [F.EXPIRES_AT]: 1 }, { name: LOCATION_INDEXES.EXPIRY })
schema.index({ [F.CREATOR_ID]: 1 }, { name: LOCATION_INDEXES.CREATOR })

/** Persist only the latest coordinate; ended sessions retain no precise position. */
const LocationShare = mongoose.model("LocationShare", schema)
export default LocationShare
/** Inferred persisted live-location fields. */
export type LocationRecord = mongoose.InferSchemaType<typeof schema>
