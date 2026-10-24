import { Fragment } from "react"
import { Avatar } from "@/shared/components/Avatar"
import { DropdownMenu } from "@/shared/components/DropdownMenu/DropdownMenu"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import type { MessageRowViewModel } from "../chat.types"
import { CHAT_COPY } from "../chat.constants"
import { MessageAttachment } from "./MessageAttachment"

/** Prepared row with ownership, display labels and supported actions. */
export interface MessageBubbleProps { readonly message: MessageRowViewModel }

/** Render an incoming or outgoing reference bubble with sender attribution. UI only. */
export function MessageBubble({ message }: MessageBubbleProps) {
  return <Fragment>
    {message.showDate && <div className="message-date"><span>{message.dateLabel}</span></div>}
    <article className={`message-row ${message.isOwn ? "message-row--own" : ""} ${message.isGroupEnd ? "" : "message-row--continuation"}`} data-owner={message.isOwn ? "self" : "peer"} data-message-id={message.id}>
      {message.isGroupEnd ? <Avatar label={message.author} src={message.avatarUrl} size="small" /> : <span className="message-avatar-spacer" aria-hidden="true" />}
      <div className="message-stack"><div className="message-content-row">
        <div className="message-bubble">{message.isPinned && <span className="text-xs"><Icon name={ICON_NAMES.PIN} /> Đã ghim</span>}<p>{message.content}</p>
          {message.attachments.map((file) => <MessageAttachment key={file.id} file={file} />)}
          <time className="message-time" dateTime={message.createdAt}><Icon name={ICON_NAMES.CLOCK} />{message.time}</time>
        </div><DropdownMenu label={CHAT_COPY.MESSAGE_ACTIONS} items={message.actions} />
      </div>{message.isGroupEnd && <p className="message-sender">{message.author}</p>}</div>
    </article>
  </Fragment>
}
