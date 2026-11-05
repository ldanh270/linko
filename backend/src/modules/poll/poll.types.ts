import type { CreatePollRequest } from "@linko/contracts"
import type { Types, HydratedDocument } from "mongoose"
import type { PollRecord } from "../../models/Poll"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import type { UtilityActor, UtilityRuntime } from "../utility/utility.types"

/** Persisted poll definition with its database identity. */
export type PollDocument = HydratedDocument<PollRecord>
/** Poll resource operation authenticated by the HTTP boundary. */
export interface PollActor extends UtilityActor { readonly resourceId: Types.ObjectId }
/** Idempotent poll creation command after request validation. */
export interface PollCreateInput extends UtilityActor { readonly request: CreatePollRequest }
/** Full replacement vote command; an empty selection represents explicit withdrawal. */
export interface PollVoteInput extends PollActor { readonly optionIds: readonly string[] }
/** Eligible named vote snapshot used by safe result mapping. */
export interface EligiblePollVote { readonly userId: string; readonly optionIds: readonly string[] }
/** Role-specific storage port for poll definitions and selections. */
export interface PollRepository {
    find(input: PollActor, transaction?: TransactionContext): Promise<PollDocument | null>
    findByCommand(input: PollCreateInput, transaction?: TransactionContext): Promise<PollDocument | null>
    list(input: UtilityActor, joinedAt: Date): Promise<readonly PollDocument[]>
    create(input: PollCreateInput, resourceId: Types.ObjectId, messageId: Types.ObjectId, transaction: TransactionContext): Promise<PollDocument>
    eligibleVotes(poll: PollDocument, transaction?: TransactionContext): Promise<readonly EligiblePollVote[]>
    eligibleVotesMany(polls: readonly PollDocument[], transaction?: TransactionContext): Promise<ReadonlyMap<string, readonly EligiblePollVote[]>>
    replaceVote(input: PollVoteInput, now: Date, transaction: TransactionContext): Promise<void>
    bumpRevision(poll: PollDocument, now: Date, close: boolean, transaction: TransactionContext): Promise<boolean>
}
/** Dependencies retain business rules above the persistence adapter. */
export interface PollDependencies { readonly runtime: UtilityRuntime; readonly repository: PollRepository }
