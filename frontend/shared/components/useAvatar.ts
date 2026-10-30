"use client"

import { useState } from "react"

/** Resolve initials and remember a failing image without affecting other avatar sources. */
export function useAvatar(label: string, src?: string | null) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const initials = label.trim().split(/\s+/).slice(0, 2).map((word) => word.charAt(0)).join("").toLocaleUpperCase("vi-VN")
  return { initials: initials || "•", imageSource: src && failedSource !== src ? src : null, onImageError: () => setFailedSource(src ?? null) }
}
