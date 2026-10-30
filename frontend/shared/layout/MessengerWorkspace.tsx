import type { ReactNode } from "react"

/** Composition slots prevent shared layout from depending on feature modules. */
export interface MessengerWorkspaceProps { readonly sidebar: ReactNode; readonly conversation: ReactNode; readonly isConversationView?: boolean }

/** Arrange independently scrolling sidebar/chat regions with mobile view selection. UI only. */
export function MessengerWorkspace({ sidebar, conversation, isConversationView = false }: MessengerWorkspaceProps) {
  return <div className={`messenger-workspace ${isConversationView ? "messenger-workspace--conversation" : ""}`}>
    <aside className="workspace-sidebar">{sidebar}</aside><section className="workspace-conversation" aria-label="Cuộc trò chuyện">{conversation}</section>
  </div>
}
