"use client"

import type { MouseEvent, RefObject } from "react"
import { useModal } from "@/shared/components/Modal/useModal"

export interface UseImageLightboxOptions {
  readonly onClose: () => void
}

export interface UseImageLightboxResult {
  readonly ref: RefObject<HTMLDivElement | null>
  readonly handleBackdropClick: (event: MouseEvent) => void
}

/** Manage lightbox keyboard dismissal, focus trap, and outside click behavior. */
export function useImageLightbox({ onClose }: UseImageLightboxOptions): UseImageLightboxResult {
  const { ref } = useModal(onClose)

  const handleBackdropClick = (event: MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  return {
    ref,
    handleBackdropClick,
  }
}
