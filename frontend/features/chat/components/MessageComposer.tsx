"use client"

import { MESSAGE_LIMITS } from "@linko/contracts"
import { Button } from "@/shared/components/Button"
import { IconButton } from "@/shared/components/IconButton"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { ATTACHMENT_ACCEPT_ATTRIBUTE } from "../chat.constants"
import type { useConversationPane } from "../hooks/useConversationPane"
import { useMessageComposerView } from "../hooks/useMessageComposerView"
import { ReplyPreview } from "./ReplyPreview"
import { MentionList } from "./MentionList"
import { ComposerFilePreviews } from "./ComposerFilePreviews"
import { EmojiPicker } from "./EmojiPicker"

export interface MessageComposerProps {
  readonly state: ReturnType<typeof useConversationPane>
}

/**
 * Render the reference composer with auto-expanding textarea, emoji picker popover,
 * file attachment tray, reply banner, and mention autocompletion. UI presentation only.
 */
export function MessageComposer({ state }: MessageComposerProps) {
  const {
    textareaRef,
    placeholder,
    isEmojiPickerOpen,
    toggleEmojiPicker,
    closeEmojiPicker,
    handleSelectEmoji,
    handleSubmit,
    copy,
  } = useMessageComposerView({ state })

  return (
    <div className="relative border-t border-[var(--border)] bg-[var(--surface)]">
      {/* Active Reply Banner */}
      {state.composer.replyId && (
        <ReplyPreview
          author={state.composer.replyTarget?.author}
          content={state.composer.replyTarget?.content}
          onCancel={state.composer.onCancelReply}
        />
      )}

      {/* Mention Auto-Complete Popover */}
      {state.composer.showMentions && state.members.data && (
        <MentionList
          members={state.members.data}
          onSelect={state.composer.onMention}
        />
      )}
      {state.composer.showMentions && state.members.isError && (
        <p role="alert" className="text-xs text-[var(--danger)] mt-2 px-4">
          Không thể tải thành viên để nhắc tên.
        </p>
      )}

      {/* File Attachment Previews Tray */}
      {state.composer.files.length > 0 && (
        <ComposerFilePreviews
          previews={state.composer.filePreviews}
          onRemove={state.composer.onRemoveFile}
        />
      )}

      {/* Validation & Send Error Alerts */}
      {state.composer.fileError && (
        <p role="alert" className="px-4 pt-2 text-xs text-[var(--danger)]">
          {state.composer.fileError}
        </p>
      )}
      {state.composer.sendError && (
        <p role="alert" className="px-4 pt-2 text-xs text-[var(--danger)]">
          {state.composer.sendError}
        </p>
      )}

      {/* Main Composer Form */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2.5 px-4 py-3.5"
        aria-label="Soạn tin nhắn"
      >
        {/* Attachment Upload Button */}
        <label
          htmlFor="composer-file-input"
          aria-label={copy.chat.attachBtn}
          title={copy.chat.attachBtn}
          className="grid place-items-center w-10 h-10 rounded-full text-xl text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex-none mb-0.5"
        >
          <Icon name={ICON_NAMES.ATTACH} />
          <input
            id="composer-file-input"
            type="file"
            multiple
            accept={ATTACHMENT_ACCEPT_ATTRIBUTE}
            onChange={(e) => {
              if (e.target.files) {
                state.composer.onAddFiles(Array.from(e.target.files))
                e.target.value = ""
              }
            }}
            className="sr-only"
          />
        </label>

        {/* Text Input Container with Inset Emoji Button */}
        <div className="relative flex-1 min-w-0 flex items-end rounded-[var(--radius-md)] bg-[var(--input-surface)] transition-colors hover:bg-[var(--input-surface-hover)] focus-within:outline-2 focus-within:outline-[var(--border-focus)] focus-within:outline-offset-1">
          <textarea
            ref={textareaRef}
            rows={1}
            maxLength={MESSAGE_LIMITS.MAX_CONTENT_LENGTH}
            placeholder={placeholder}
            value={state.composer.content}
            onChange={(e) => state.composer.onContentChange(e.target.value)}
            onKeyDown={state.composer.onKeyDown}
            aria-label="Soạn tin nhắn"
            className="w-full min-w-0 bg-transparent py-2.5 pl-3.5 pr-10 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] placeholder:opacity-90 outline-none resize-none leading-relaxed"
          />

          {/* Emoji Picker Popover & Trigger Button */}
          <div className="absolute right-1 bottom-1">
            <IconButton
              type="button"
              label={copy.chat.emojiBtn}
              icon={<Icon name={ICON_NAMES.EMOJI} />}
              onClick={toggleEmojiPicker}
              aria-expanded={isEmojiPickerOpen}
              className="text-[var(--text-secondary)] hover:text-[var(--brand)] text-lg"
            />
            {isEmojiPickerOpen && (
              <EmojiPicker
                onSelect={handleSelectEmoji}
                onClose={closeEmojiPicker}
              />
            )}
          </div>
        </div>

        {/* Submit / Send Action Button */}
        <Button
          type="submit"
          onMouseDown={(e) => e.preventDefault()}
          disabled={!state.composer.canSend || state.composer.isSending}
          isLoading={state.composer.isSending}
          size="medium"
          className="flex-none mb-0.5 px-3.5 h-10"
          aria-label={copy.chat.sendBtn}
          title={copy.chat.sendBtn}
        >
          <Icon name={ICON_NAMES.SEND} className="text-lg" />
        </Button>
      </form>
    </div>
  )
}
