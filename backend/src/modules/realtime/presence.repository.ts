import User from "../../models/User"
import { PRESENCE_FIELDS } from "./presence.constants"
import type { PresenceRepository } from "./presence.types"

/** Persist activity timestamps through the audit and soft-delete aspects.
 * @pattern Repository
 * @layer Repository
 */
export class MongoosePresenceRepository implements PresenceRepository {
    /** Record activity when the final socket ends; audit supplies the system actor. */
    async updateLastActive(userId: string, at: Date): Promise<void> {
        await User.findByIdAndUpdate(userId, { [PRESENCE_FIELDS.LAST_ACTIVE]: at }).exec()
    }
}
