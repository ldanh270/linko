"use client"

import Image from "next/image"
import { useAvatar } from "./useAvatar"

/** Sizes supported by shared profile and conversation avatars. */
export type AvatarSize = "small" | "medium" | "large"

/** Properties for a decorative initials avatar. */
export interface AvatarProps {
  label: string
  size?: AvatarSize
  className?: string
  src?: string | null
  isOnline?: boolean
}

/** Render initials consistently when a profile image is not available with presence status. UI only. */
export function Avatar({ label, src, size = "medium", className = "", isOnline }: AvatarProps) {
  const { initials, imageSource, onImageError } = useAvatar(label, src)
  return (
    <span className={`relative inline-grid place-items-center ${className}`}>
      <span className={`avatar avatar--${size}`}>
        {imageSource ? (
          <Image src={imageSource} alt={label} width={96} height={96} unoptimized onError={onImageError} />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
      </span>
      {isOnline !== undefined && (
        <span
          className={`avatar-status-badge avatar-status--${isOnline ? "online" : "offline"} avatar-status--${size}`}
          title={isOnline ? "Đang trực tuyến" : "Ngoại tuyến"}
          aria-label={isOnline ? "Đang trực tuyến" : "Ngoại tuyến"}
        />
      )}
    </span>
  )
}
