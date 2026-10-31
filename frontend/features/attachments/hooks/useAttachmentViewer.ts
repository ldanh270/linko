"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { downloadAttachment, type AttachmentDownload } from "@/features/chat/api/attachments.api"

/**
 * Coordinate secure attachment downloading, temporary object URL lifecycle,
 * and automatic memory revocation.
 *
 * @returns State and retry handler for AttachmentViewerPage.
 */
export function useAttachmentViewer() {
  const { messageId, attachmentId } = useParams<{ messageId: string; attachmentId: string }>()
  const [download, setDownload] = useState<AttachmentDownload | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [hasError, setError] = useState(false)

  const requestFile = useCallback(
    (signal?: AbortSignal) => downloadAttachment({ messageId, attachmentId, signal }),
    [attachmentId, messageId],
  )

  useEffect(() => {
    const controller = new AbortController()
    let isActive = true

    void requestFile(controller.signal)
      .then((result) => {
        if (isActive) {
          setDownload((current) => {
            current?.revoke()
            return result
          })
        } else {
          result.revoke()
        }
      })
      .catch(() => {
        if (isActive) setError(true)
      })
      .finally(() => {
        if (isActive) setLoading(false)
      })

    return () => {
      isActive = false
      controller.abort()
    }
  }, [requestFile])

  // Cleanup object URL when component unmounts
  useEffect(() => () => download?.revoke(), [download])

  const handleRetry = () => {
    setLoading(true)
    setError(false)
    void requestFile()
      .then((result) =>
        setDownload((current) => {
          current?.revoke()
          return result
        }),
      )
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  const isImage = download?.blob.type.startsWith("image/") ?? false

  return {
    download,
    isLoading,
    hasError,
    isImage,
    handleRetry,
  }
}
