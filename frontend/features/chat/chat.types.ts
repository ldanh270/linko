import type { DropdownAction } from "@/shared/components/DropdownMenu/dropdown.types"
import type { CHAT_KIND } from "./chat.constants"

/** Existing conversation categories used by the shared renderer. */
export type ChatKind = (typeof CHAT_KIND)[keyof typeof CHAT_KIND]
/** Safe identity lookup available to timeline mapping. */
export interface ChatAuthor { readonly id: string; readonly name: string; readonly avatarUrl: string | null }
/** Quoted context for a message replying to another. */
export interface MessageReplyViewModel { readonly id: string; readonly author: string; readonly content: string }
/** Presentation-only message fields avoid deriving business state inside JSX. */
export interface MessageViewModel {
  readonly id: string; readonly content: string; readonly isOwn: boolean; readonly author: string
  readonly avatarUrl: string | null; readonly createdAt: string; readonly time: string; readonly dateLabel: string
  readonly showDate: boolean; readonly isGroupEnd: boolean; readonly isPinned: boolean; readonly attachments: readonly AttachmentViewModel[]
  readonly reply: MessageReplyViewModel | null
}
/** Safe attachment presentation removes route/size/type calculations from JSX. */
export interface AttachmentViewModel { readonly id: string; readonly name: string; readonly sizeLabel: string; readonly imageUrl: string | null; readonly href: string }
/** Timeline actions are prepared by the feature hook rather than inside row markup. */
export interface MessageRowViewModel extends MessageViewModel { readonly actions: readonly DropdownAction[] }
/** Composer request preserves idempotency and existing attachment/reply/mention contracts. */
export interface ComposerRequest { readonly clientMessageId: string; readonly content: string; readonly files: readonly File[]; readonly mentions: readonly string[]; readonly replyTo?: string }
/** Mutation callbacks are kept independent of the query library's presentation types. */
export interface SendCallbacks { readonly onSuccess: () => void; readonly onError: () => void }
