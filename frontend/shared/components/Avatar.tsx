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
}

/** Render initials consistently when a profile image is not available. UI only. */
export function Avatar({ label, src, size = "medium", className = "" }: AvatarProps) {
  const { initials, imageSource, onImageError } = useAvatar(label, src)
  return <span className={`avatar avatar--${size} ${className}`}>
    {imageSource ? <Image src={imageSource} alt={label} width={96} height={96} unoptimized onError={onImageError} /> : <span aria-hidden="true">{initials}</span>}
  </span>
}
