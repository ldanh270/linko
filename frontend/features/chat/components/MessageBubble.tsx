import { Fragment } from "react"
import { Avatar } from "@/shared/components/Avatar"
import { Link } from "@/shared/components/Link"
import { DropdownMenu } from "@/shared/components/DropdownMenu/DropdownMenu"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"
import type { MessageRowViewModel } from "../chat.types"
import { CHAT_COPY } from "../chat.constants"
import { MessageAttachment } from "./MessageAttachment"

/** Prepared row with ownership, display labels and supported actions. */
export interface MessageBubbleProps { readonly message: MessageRowViewModel }

/** Helper to highlight matched search query text safely inside message bubble. */
function renderHighlightedContent(content: string, query?: string) {
  if (!query || !query.trim()) return content
  const q = query.trim()
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex = new RegExp(`(${escaped})`, "gi")
  const parts = content.split(regex)
  if (parts.length <= 1) return content

  return parts.map((part, index) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={index} className="search-match-text">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

/** Render an incoming or outgoing reference bubble with sender attribution. UI only. */
export function MessageBubble({ message }: MessageBubbleProps) {
  return <Fragment>
    {message.showDate && <div className="message-date"><span>{message.dateLabel}</span></div>}
    <article className={`message-row ${message.isOwn ? "message-row--own" : ""} ${message.isGroupEnd ? "" : "message-row--continuation"} ${message.isSearchActive ? "is-search-active" : ""}`} data-owner={message.isOwn ? "self" : "peer"} data-message-id={message.id}>
      {message.isGroupEnd ? (
        message.senderId ? (
          <Link
            href={buildAppRoute(APP_ROUTES.USER_PROFILE, { userId: message.senderId })}
            className="hover:opacity-85 transition-opacity flex-none"
            title={`Xem hồ sơ của ${message.author}`}
          >
            <Avatar label={message.author} src={message.avatarUrl} size="small" />
          </Link>
        ) : (
          <Avatar label={message.author} src={message.avatarUrl} size="small" />
        )
      ) : (
        <span className="message-avatar-spacer" aria-hidden="true" />
      )}
      <div className="message-stack"><div className="message-content-row">
        <div className="message-bubble">
          {message.isPinned && <span className="text-xs"><Icon name={ICON_NAMES.PIN} /> Đã ghim</span>}
          {message.reply && (
            <div className="message-reply-preview">
              <span className="message-reply-author">{message.reply.author}</span>
              <p className="message-reply-content">{message.reply.content}</p>
            </div>
          )}
          <p>{renderHighlightedContent(message.content, message.searchQuery)}</p>
          {message.attachments.map((file) => <MessageAttachment key={file.id} file={file} />)}
          <time className="message-time" dateTime={message.createdAt}><Icon name={ICON_NAMES.CLOCK} />{message.time}</time>
        </div><DropdownMenu label={CHAT_COPY.MESSAGE_ACTIONS} items={message.actions} />
      </div>{message.isGroupEnd && (
        message.senderId && !message.isOwn ? (
          <Link
            href={buildAppRoute(APP_ROUTES.USER_PROFILE, { userId: message.senderId })}
            className="message-sender hover:underline"
          >
            {message.author}
          </Link>
        ) : (
          <p className="message-sender">{message.author}</p>
        )
      )}</div>
    </article>
  </Fragment>
}
