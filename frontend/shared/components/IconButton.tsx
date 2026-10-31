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
  return <Button {...props} aria-label={label} className={`h-10 w-10 rounded-full p-0 text-text-secondary hover:text-brand hover:bg-brand-soft ${className}`} variant="ghost">{icon}</Button>
}
