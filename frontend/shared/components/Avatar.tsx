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

const AVATAR_SIZE_CLASSES: Record<AvatarSize, string> = {
  small: "w-9 h-9 text-xs",
  medium: "w-11 h-11 text-sm",
  large: "w-20 h-20 text-2xl",
}

const STATUS_SIZE_CLASSES: Record<AvatarSize, string> = {
  small: "w-2.75 h-2.75 border-2",
  medium: "w-3.25 h-3.25 border-2",
  large: "w-4.25 h-4.25 border-[3px]",
}

const STATUS_COLOR_CLASSES = {
  online: "bg-status-online shadow-[0_0_0_1.5px_var(--surface),0_0_8px_var(--status-online-glow)]",
  offline: "bg-status-offline opacity-100 shadow-[0_0_0_1.5px_var(--surface)]",
}

/** Render initials consistently when a profile image is not available with presence status. UI only. */
export function Avatar({ label, src, size = "medium", className = "", isOnline }: AvatarProps) {
  const { initials, imageSource, onImageError } = useAvatar(label, src)
  return (
    <span className={`relative inline-grid place-items-center ${className}`.trim()}>
      <span
        className={`avatar inline-grid flex-none place-items-center rounded-full bg-brand-soft text-brand font-bold leading-none overflow-hidden select-none ${AVATAR_SIZE_CLASSES[size]}`}
      >
        {imageSource ? (
          <Image
            src={imageSource}
            alt={label}
            width={96}
            height={96}
            unoptimized
            onError={onImageError}
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
      </span>
      {isOnline !== undefined && (
        <span
          className={`avatar-status-badge absolute bottom-0 right-0 rounded-full border-surface z-2 transition-all duration-150 ${STATUS_SIZE_CLASSES[size]} ${
            isOnline ? STATUS_COLOR_CLASSES.online : STATUS_COLOR_CLASSES.offline
          }`}
          title={isOnline ? "Đang trực tuyến" : "Ngoại tuyến"}
          aria-label={isOnline ? "Đang trực tuyến" : "Ngoại tuyến"}
        />
      )}
    </span>
  )
}
