import type { ButtonHTMLAttributes, ReactNode } from "react"
import { Button } from "./Button"

/** Icon-only button props require a visible accessible name. */
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon: ReactNode
  isLoading?: boolean
}

/** Render a keyboard-operable icon action. UI only. */
export function IconButton({ label, icon, className = "", ...props }: IconButtonProps) {
  return <Button {...props} aria-label={label} className={`h-11 w-11 p-0 ${className}`} variant="ghost">{icon}</Button>
}
