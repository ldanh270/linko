"use client"

import { useCallback, useState } from "react"
import type { AttachmentViewModel } from "../chat.types"
import { useAttachmentThumbnail, type AttachmentThumbnailState } from "./useAttachmentThumbnail"

export interface UseMessageAttachmentOptions {
  readonly file: AttachmentViewModel
}

export interface UseMessageAttachmentResult {
  readonly isImage: boolean
  readonly thumbnail: AttachmentThumbnailState
  readonly isLightboxOpen: boolean
  readonly onOpenLightbox: () => void
  readonly onCloseLightbox: () => void
}

/** Manage attachment thumbnail loading and lightbox presentation state. */
export function useMessageAttachment({ file }: UseMessageAttachmentOptions): UseMessageAttachmentResult {
  const isImage = Boolean(file.imageUrl)
  const thumbnail = useAttachmentThumbnail({
    messageId: file.messageId,
    attachmentId: file.id,
    isImage,
  })
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  const onOpenLightbox = useCallback(() => {
    if (thumbnail.objectUrl) {
      setIsLightboxOpen(true)
    }
  }, [thumbnail.objectUrl])

  const onCloseLightbox = useCallback(() => {
    setIsLightboxOpen(false)
  }, [])

  return {
    isImage,
    thumbnail,
    isLightboxOpen,
    onOpenLightbox,
    onCloseLightbox,
  }
}
