import { MESSAGE_LIMITS } from "@linko/contracts"
import { Button } from "@/shared/components/Button"
import { IconButton } from "@/shared/components/IconButton"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { ATTACHMENT_ACCEPT_ATTRIBUTE } from "../chat.constants"
import type { useConversationPane } from "../hooks/useConversationPane"
import { useI18n } from "@/shared/i18n/useI18n"
import { useChatPreferences } from "../preferences/useChatPreferences"
import { ReplyPreview } from "./ReplyPreview"
import { MentionList } from "./MentionList"
import { ComposerFilePreviews } from "./ComposerFilePreviews"

/** Composer state exposes only behavior prepared outside JSX. */
export interface MessageComposerProps { readonly state: ReturnType<typeof useConversationPane> }

/** Render the reference composer while preserving file, reply and mention behavior. UI only. */
export function MessageComposer({ state }: MessageComposerProps) {
  const { copy } = useI18n()
  const { preferences } = useChatPreferences()
  const placeholder = preferences.sendOnEnter
    ? copy.chat.placeholderSendOnEnter
    : copy.chat.placeholderSendOnClick

  return <form onSubmit={state.composer.onSubmit} className="composer" aria-label="Soạn tin nhắn">
    {state.composer.replyId && (
      <ReplyPreview
        author={state.composer.replyTarget?.author}
        content={state.composer.replyTarget?.content}
        onCancel={state.composer.onCancelReply}
      />
    )}
    {state.composer.showMentions && state.members.data && <MentionList members={state.members.data} onSelect={state.composer.onMention} />}
    {state.composer.showMentions && state.members.isError && <p role="alert" className="composer-error">Không thể tải thành viên để nhắc tên.</p>}
    <ComposerFilePreviews previews={state.composer.filePreviews} onRemove={state.composer.onRemoveFile} />
    <div className="composer-controls"><label className="sr-only" htmlFor="message-input">Soạn tin nhắn</label>
      <textarea id="message-input" rows={1} maxLength={MESSAGE_LIMITS.MAX_CONTENT_LENGTH} value={state.composer.content} onChange={state.composer.onInputChange} onKeyDown={state.composer.onKeyDown} placeholder={placeholder} disabled={state.composer.isSending || state.isComposerDisabled} />
      <IconButton className="emoji-action" label={copy.chat.emojiBtn} disabled={state.composer.isSending || state.isComposerDisabled} icon={<Icon name={ICON_NAMES.EMOJI} />} onClick={state.composer.onEmoji} />
      <label className="composer-attachment" title={copy.chat.attachBtn}><Icon name={ICON_NAMES.ATTACH} /><span className="sr-only">{copy.chat.attachBtn}</span><input type="file" multiple accept={ATTACHMENT_ACCEPT_ATTRIBUTE} className="sr-only" onChange={state.composer.onFileInputChange} disabled={state.composer.isSending || state.isComposerDisabled} /></label>
      <Button type="submit" aria-label={copy.chat.sendBtn} isLoading={state.composer.isSending} disabled={!state.composer.canSend || state.isComposerDisabled} title={copy.chat.sendBtn}><Icon name={ICON_NAMES.SEND} /></Button>
    </div>
    {state.composer.fileError && <p role="alert" className="composer-error">{state.composer.fileError}</p>}
    {state.composer.sendError && <p role="alert" className="composer-error">{state.composer.sendError}</p>}
    {state.pins.update.isError && <p role="alert" className="composer-error">Không thể cập nhật tin ghim. Vui lòng thử lại.</p>}
  </form>
}
