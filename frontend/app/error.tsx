"use client"

import { ErrorState } from "@/shared/components/ErrorState"

/** Show a safe recovery action when an app route fails to render. */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto max-w-2xl p-6"><ErrorState onRetry={reset} /></main>
}
