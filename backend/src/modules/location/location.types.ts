import type { CreateLocationRequest, UpdateLocationRequest } from "@linko/contracts"
import type { HydratedDocument, Types } from "mongoose"
import type { LocationRecord } from "../../models/LocationShare"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import type { UtilityActor, UtilityRuntime } from "../utility/utility.types"

/** Live-location record with a stable database identity. */
export type LocationDocument = HydratedDocument<LocationRecord>
/** Viewer/owner operation resolved by the HTTP boundary. */
export interface LocationActor extends UtilityActor { readonly resourceId: Types.ObjectId }
/** Explicit sharing consent after obtaining an initial fix. */
export interface LocationCreateInput extends UtilityActor { readonly request: CreateLocationRequest }
/** Complete latest fix from a foreground publishing session. */
export interface LocationUpdateInput extends LocationActor { readonly request: UpdateLocationRequest }
/** Minimal storage port needed by the live-location service. */
export interface LocationRepository {
    find(input: LocationActor, transaction?: TransactionContext): Promise<LocationDocument | null>
    findByCommand(input: LocationCreateInput, transaction?: TransactionContext): Promise<LocationDocument | null>
    list(input: UtilityActor, joinedAt: Date): Promise<readonly LocationDocument[]>
    expireForCreator(input: UtilityActor, now: Date, transaction: TransactionContext): Promise<void>
    findActive(input: UtilityActor, transaction: TransactionContext): Promise<LocationDocument | null>
    create(input: LocationCreateInput, resourceId: Types.ObjectId, messageId: Types.ObjectId, now: Date, transaction: TransactionContext): Promise<LocationDocument>
    acceptFix(input: LocationUpdateInput, now: Date, transaction: TransactionContext): Promise<boolean>
    end(input: LocationActor, now: Date, transaction?: TransactionContext): Promise<boolean>
    ownerIsCurrent(share: LocationDocument, transaction?: TransactionContext): Promise<boolean>
    currentOwnerShareIds(shares: readonly LocationDocument[], transaction?: TransactionContext): Promise<ReadonlySet<string>>
    cleanupCandidates(): Promise<readonly LocationDocument[]>
}
/** Constructor-injected dependencies isolate location rules from MongoDB and transport. */
export interface LocationDependencies { readonly runtime: UtilityRuntime; readonly repository: LocationRepository }
