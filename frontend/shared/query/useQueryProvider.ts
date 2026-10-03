"use client"

import { QueryClient } from "@tanstack/react-query"
import { useState } from "react"

/** Keep one query client per mounted provider, including during server rendering. */
export function useQueryProvider(): QueryClient {
  const [client] = useState(() => new QueryClient({ defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: false },
  } }))
  return client
}
