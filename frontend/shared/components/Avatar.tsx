/** Sizes supported by the shared initials avatar. */
export type AvatarSize = "small" | "medium" | "large"

/** Properties for a decorative initials avatar. */
export interface AvatarProps {
  label: string
  size?: AvatarSize
  className?: string
}

/** Render initials consistently when a profile image is not available. UI only. */
export function Avatar({ label, size = "medium", className = "" }: AvatarProps) {
  const initials = label.trim().split(/\s+/).slice(0, 2).map((word) => word.charAt(0)).join("").toLocaleUpperCase("vi-VN")
  return <span aria-hidden="true" className={`avatar avatar--${size} ${className}`}>{initials || "•"}</span>
}
