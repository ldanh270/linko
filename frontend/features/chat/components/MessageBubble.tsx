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
      <mark key={index} className="bg-amber-400/50 text-text-primary rounded-xs px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

/** Render an incoming or outgoing reference bubble with sender attribution. UI only. */
export function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <Fragment>
      {message.showDate && (
        <div className="flex items-center gap-3 my-8 text-xs text-center before:content-[''] before:h-px before:bg-border before:flex-1 before:opacity-50 after:content-[''] after:h-px after:bg-border after:flex-1 after:opacity-50">
          <span className="bg-bubble-outgoing px-2.5 py-1 rounded-sm text-text-secondary">
            {message.dateLabel}
          </span>
        </div>
      )}
      <article
        className={`flex items-end gap-3 ${message.isOwn ? "flex-row-reverse" : ""} ${
          message.isGroupEnd ? "mb-5" : "mb-2"
        } ${message.isSearchActive ? "is-search-active" : ""}`}
        data-owner={message.isOwn ? "self" : "peer"}
        data-message-id={message.id}
      >
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
          <span className="flex-none w-9" aria-hidden="true" />
        )}
        <div className="max-w-[min(78%,600px)] min-w-0">
          <div className={`flex items-start gap-1 ${message.isOwn ? "flex-row-reverse" : ""}`}>
            <div
              className={`relative px-4 py-2.5 rounded-lg min-w-17.5 ${
                message.isOwn
                  ? "rounded-br-none bg-bubble-outgoing text-text-primary after:content-[''] after:absolute after:border-[5px] after:border-transparent after:border-t-bubble-outgoing after:border-r-bubble-outgoing after:right-0 after:-bottom-2.25"
                  : "rounded-bl-none bg-brand text-brand-contrast after:content-[''] after:absolute after:border-[5px] after:border-transparent after:border-t-brand after:border-l-brand after:left-0 after:-bottom-2.25"
              }`}
            >
              {message.isPinned && (
                <span className="flex items-center gap-1 text-xs mb-1 opacity-80">
                  <Icon name={ICON_NAMES.PIN} /> Đã ghim
                </span>
              )}
              {message.reply && (
                <div
                  className={`flex flex-col gap-0.5 px-2.5 py-1.5 mb-2 rounded-sm text-xs border-l-[3px] ${
                    message.isOwn
                      ? "bg-black/5 border-brand text-inherit"
                      : "bg-white/15 border-white/85 text-inherit"
                  }`}
                >
                  <span className="font-semibold text-xs opacity-90">{message.reply.author}</span>
                  <p className="truncate opacity-85 m-0 text-xs">{message.reply.content}</p>
                </div>
              )}
              <p className="whitespace-pre-wrap wrap-anywhere text-sm leading-normal">
                {renderHighlightedContent(message.content, message.searchQuery)}
              </p>
              {message.attachments.map((file) => (
                <MessageAttachment key={file.id} file={file} />
              ))}
              <time
                className={`flex items-center gap-0.75 mt-1 text-xs ${
                  message.isOwn ? "justify-start text-text-secondary opacity-100" : "justify-end opacity-65"
                }`}
                dateTime={message.createdAt}
              >
                <Icon name={ICON_NAMES.CLOCK} />
                {message.time}
              </time>
            </div>
            <DropdownMenu label={CHAT_COPY.MESSAGE_ACTIONS} items={message.actions} />
          </div>
          {message.isGroupEnd && (
            message.senderId && !message.isOwn ? (
              <Link
                href={buildAppRoute(APP_ROUTES.USER_PROFILE, { userId: message.senderId })}
                className="block text-xs text-text-secondary mt-2 hover:underline"
              >
                {message.author}
              </Link>
            ) : (
              <p className={`text-xs text-text-secondary mt-2 ${message.isOwn ? "text-right" : ""}`}>
                {message.author}
              </p>
            )
          )}
        </div>
      </article>
    </Fragment>
  )
}
