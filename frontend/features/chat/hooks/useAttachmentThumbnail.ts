"use client"

import { useEffect, useState } from "react"
import { downloadAttachment } from "../api/attachments.api"

export interface UseAttachmentThumbnailOptions {
  readonly messageId: string
  readonly attachmentId: string
  readonly isImage: boolean
}

export interface AttachmentThumbnailState {
  readonly objectUrl: string | null
  readonly isLoading: boolean
  readonly hasError: boolean
}

/** Fetch a protected attachment blob with Bearer token authentication and expose a revocable object URL. */
export function useAttachmentThumbnail({ messageId, attachmentId, isImage }: UseAttachmentThumbnailOptions): AttachmentThumbnailState {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(isImage)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!isImage || !messageId || !attachmentId) {
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    let isActive = true
    let revokeFn: (() => void) | null = null

    setIsLoading(true)
    setHasError(false)

    void downloadAttachment({ messageId, attachmentId, signal: controller.signal })
      .then((download) => {
        if (!isActive) {
          download.revoke()
          return
        }
        revokeFn = download.revoke
        setObjectUrl(download.objectUrl)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        if (isActive) setHasError(true)
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
      controller.abort()
      if (revokeFn) revokeFn()
    }
  }, [messageId, attachmentId, isImage])

  return { objectUrl, isLoading, hasError }
}
