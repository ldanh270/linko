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
  readonly senderId?: string
  readonly avatarUrl: string | null; readonly createdAt: string; readonly time: string; readonly dateLabel: string
  readonly showDate: boolean; readonly isGroupEnd: boolean; readonly isPinned: boolean; readonly attachments: readonly AttachmentViewModel[]
  readonly reply: MessageReplyViewModel | null
}
/** Safe attachment presentation removes route/size/type calculations from JSX. */
export interface AttachmentViewModel { readonly id: string; readonly messageId: string; readonly name: string; readonly sizeLabel: string; readonly imageUrl: string | null; readonly href: string }
/** Timeline actions are prepared by the feature hook rather than inside row markup. */
export interface MessageRowViewModel extends MessageViewModel { readonly actions: readonly DropdownAction[] }
/** Composer request preserves idempotency and existing attachment/reply/mention contracts. */
export interface ComposerRequest { readonly clientMessageId: string; readonly content: string; readonly files: readonly File[]; readonly mentions: readonly string[]; readonly replyTo?: string }
/** Local file preview item before message is sent. */
export interface ComposerFilePreview {
  readonly id: string
  readonly file: File
  readonly name: string
  readonly sizeLabel: string
  readonly isImage: boolean
  readonly previewUrl: string | null
}
/** Mutation callbacks are kept independent of the query library's presentation types. */
export interface SendCallbacks { readonly onSuccess: () => void; readonly onError: (error?: unknown) => void }

/** Display member in conversation details sheet. */
export interface ConversationMemberViewModel {
  readonly id: string
  readonly name: string
  readonly avatarUrl: string | null
  readonly roleLabel: string
  readonly isOwner: boolean
}

/** Pinned message presentation in details sheet. */
export interface ConversationPinViewModel {
  readonly id: string
  readonly content: string
  readonly createdAt: string
  readonly author: string
}

/** View model powering the conversation details sheet. */
export interface ConversationDetailsViewModel {
  readonly isOpen: boolean
  readonly peerId: string | null
  readonly title: string
  readonly subtitle: string
  readonly description: string
  readonly avatarUrl: string | null
  readonly kind: ChatKind
  readonly isMuted: boolean
  readonly isMuteLoading: boolean
  readonly isLeaving: boolean
  readonly section: string
  readonly members: readonly ConversationMemberViewModel[]
  readonly photos: readonly AttachmentViewModel[]
  readonly files: readonly AttachmentViewModel[]
  readonly pins: readonly ConversationPinViewModel[]
  readonly manageHref: string | null
  readonly invitationsHref: string | null
  readonly profileHref: string | null
  readonly onToggleSection: (section: string) => void
  readonly onToggleMute: () => void
  readonly onLeaveGroup: () => void
  readonly onOpenSearch: () => void
  readonly onClose: () => void
}
