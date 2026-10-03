import type { ReactNode } from "react"
import { AppShell } from "@/shared/layout/AppShell"

/** Compose the app frame; F01 supplies its route guard. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>
}
