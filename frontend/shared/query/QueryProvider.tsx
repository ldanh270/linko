"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { useQueryProvider } from "./useQueryProvider"

/** Provide server-state caching to application features. UI only. */
export function QueryProvider({ children }: { children: ReactNode }) {
  const client = useQueryProvider()
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
