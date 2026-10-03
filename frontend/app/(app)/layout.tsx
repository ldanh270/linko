import type { ReactNode } from "react"
import { ProtectedAppShell } from "@/features/auth/components/ProtectedAppShell"

/** Compose the app frame; F01 supplies its route guard. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <ProtectedAppShell>{children}</ProtectedAppShell>
}
