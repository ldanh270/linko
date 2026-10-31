import type { ReactNode } from "react"

/** Composition slots prevent shared layout from depending on feature modules. */
export interface MessengerWorkspaceProps { readonly sidebar: ReactNode; readonly conversation: ReactNode; readonly isConversationView?: boolean }

/** Arrange independently scrolling sidebar/chat regions with mobile view selection. UI only. */
export function MessengerWorkspace({ sidebar, conversation, isConversationView = false }: MessengerWorkspaceProps) {
  return (
    <div
      className="h-full min-w-0 min-h-0 pb-[calc(65px+env(safe-area-inset-bottom))] lg:pb-0 lg:grid lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]"
    >
      <aside
        className={`h-full min-h-0 bg-background ${
          isConversationView ? "hidden lg:block" : "block"
        }`}
      >
        {sidebar}
      </aside>
      <section
        className={`h-full min-w-0 min-h-0 overflow-hidden bg-surface ${
          isConversationView ? "block" : "hidden lg:block"
        }`}
        aria-label="Cuộc trò chuyện"
      >
        {conversation}
      </section>
    </div>
  )
}
