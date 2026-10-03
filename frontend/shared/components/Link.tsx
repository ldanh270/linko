import NextLink from "next/link"
import type { ComponentProps } from "react"

/** Shared navigation link props. */
export type LinkProps = ComponentProps<typeof NextLink> & { isDisabled?: boolean }

/** Render a consistent focusable navigation link. UI only. */
export function Link({ className = "", isDisabled = false, tabIndex, ...props }: LinkProps) {
  return <NextLink {...props} aria-disabled={isDisabled} tabIndex={isDisabled ? -1 : tabIndex} className={`rounded-lg cursor-pointer transition-colors duration-150 hover:text-[var(--brand)] active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] motion-reduce:transition-none ${isDisabled ? "pointer-events-none opacity-50 cursor-not-allowed" : ""} ${className}`} />
}
