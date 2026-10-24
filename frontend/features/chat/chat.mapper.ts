import { MESSAGE_FIELDS, MESSAGE_ATTACHMENT_FIELDS, type MessageDto, type MessageAttachmentDto } from "@linko/contracts"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"
import { CHAT_COPY } from "./chat.constants"
import type { AttachmentViewModel, ChatAuthor, MessageViewModel } from "./chat.types"

/** Inputs for ownership, attribution and calendar grouping. */
export interface TimelineMapping { readonly messages: readonly MessageDto[]; readonly currentUserId: string; readonly authors: readonly ChatAuthor[]; readonly pinnedIds: ReadonlySet<string> }

/** Map chronological DTOs into display rows using actual sender identity. */
export function mapTimeline({ messages, currentUserId, authors, pinnedIds }: TimelineMapping): MessageViewModel[] {
  return messages.map((message, index) => {
    const date = new Date(message[MESSAGE_FIELDS.CREATED_AT])
    const previous = messages[index - 1]
    const next = messages[index + 1]
    const author = authors.find((entry) => entry.id === message[MESSAGE_FIELDS.SENDER_ID])
    return {
      id: message[MESSAGE_FIELDS.ID], content: message[MESSAGE_FIELDS.CONTENT] ?? "", isOwn: message[MESSAGE_FIELDS.SENDER_ID] === currentUserId,
      author: author?.name ?? CHAT_COPY.MEMBER, avatarUrl: author?.avatarUrl ?? null,
      createdAt: message[MESSAGE_FIELDS.CREATED_AT], time: date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      dateLabel: date.toDateString() === new Date().toDateString() ? "Hôm nay" : date.toLocaleDateString("vi-VN"), showDate: Boolean(previous && new Date(previous[MESSAGE_FIELDS.CREATED_AT]).toDateString() !== date.toDateString()),
      isGroupEnd: !next || next[MESSAGE_FIELDS.SENDER_ID] !== message[MESSAGE_FIELDS.SENDER_ID] || new Date(next[MESSAGE_FIELDS.CREATED_AT]).toDateString() !== date.toDateString(),
      isPinned: pinnedIds.has(message[MESSAGE_FIELDS.ID]), attachments: message[MESSAGE_FIELDS.ATTACHMENTS].map((file) => mapAttachment(file, message[MESSAGE_FIELDS.ID])),
    }
  })
}

/** Prepare attachment links and human-readable sizes using safe public metadata only. */
export function mapAttachment(file: MessageAttachmentDto, messageId: string): AttachmentViewModel {
  return { id: file[MESSAGE_ATTACHMENT_FIELDS.ID], name: file[MESSAGE_ATTACHMENT_FIELDS.NAME] ?? CHAT_COPY.UNTITLED_FILE,
    imageUrl: file[MESSAGE_ATTACHMENT_FIELDS.CONTENT_TYPE]?.startsWith("image/") ? file[MESSAGE_ATTACHMENT_FIELDS.URL] : null,
    sizeLabel: file[MESSAGE_ATTACHMENT_FIELDS.SIZE] === null ? "" : `${((file[MESSAGE_ATTACHMENT_FIELDS.SIZE] ?? 0) / 1024).toFixed(1)} KB`,
    href: buildAppRoute(APP_ROUTES.ATTACHMENT, { messageId, attachmentId: file[MESSAGE_ATTACHMENT_FIELDS.ID] }) }
}
