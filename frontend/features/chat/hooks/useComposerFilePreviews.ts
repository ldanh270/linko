"use client"

import { useEffect, useState } from "react"
import type { ComposerFilePreview } from "../chat.types"

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const isImageFile = (file: File): boolean => {
  if (file.type.startsWith("image/")) return true
  const ext = file.name.split(".").pop()?.toLowerCase()
  return ["jpg", "jpeg", "jfif", "png", "webp", "gif"].includes(ext ?? "")
}

/** Generate safe object URLs for local draft attachments and revoke on removal. */
export function useComposerFilePreviews(files: readonly File[]): readonly ComposerFilePreview[] {
  const [previews, setPreviews] = useState<readonly ComposerFilePreview[]>([])

  useEffect(() => {
    const created: string[] = []

    const items: ComposerFilePreview[] = files.map((file, index) => {
      const isImg = isImageFile(file)
      let previewUrl: string | null = null
      if (isImg && typeof URL !== "undefined") {
        try {
          previewUrl = URL.createObjectURL(file)
          created.push(previewUrl)
        } catch {
          previewUrl = null
        }
      }
      return {
        id: `${file.name}-${file.size}-${index}`,
        file,
        name: file.name,
        sizeLabel: formatFileSize(file.size),
        isImage: isImg,
        previewUrl,
      }
    })

    setPreviews(items)

    return () => {
      for (const url of created) {
        if (typeof URL !== "undefined") {
          URL.revokeObjectURL(url)
        }
      }
    }
  }, [files])

  return previews
}
