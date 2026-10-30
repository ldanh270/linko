"use client"

import { useCallback, useState } from "react"
import type { AttachmentViewModel } from "../chat.types"

export interface ActivePhotoSelection {
  readonly photo: AttachmentViewModel
  readonly objectUrl: string
}

export interface UseConversationDetailsMediaResult {
  readonly activePhoto: ActivePhotoSelection | null
  readonly onSelectPhoto: (photo: AttachmentViewModel, objectUrl: string) => void
  readonly onClosePhoto: () => void
}

/** Manage active photo selection for conversation details media lightbox preview. */
export function useConversationDetailsMedia(): UseConversationDetailsMediaResult {
  const [activePhoto, setActivePhoto] = useState<ActivePhotoSelection | null>(null)

  const onSelectPhoto = useCallback((photo: AttachmentViewModel, objectUrl: string) => {
    setActivePhoto({ photo, objectUrl })
  }, [])

  const onClosePhoto = useCallback(() => {
    setActivePhoto(null)
  }, [])

  return {
    activePhoto,
    onSelectPhoto,
    onClosePhoto,
  }
}
