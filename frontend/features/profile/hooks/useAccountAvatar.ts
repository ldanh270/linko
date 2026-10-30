"use client"

import { APP_ROUTES } from "@/shared/layout/route.constants"
import { useWorkspaceNavigation } from "@/shared/layout/useWorkspaceNavigation"
import { withConversation } from "@/shared/layout/workspace.navigation"
import { useCurrentProfile } from "./useCurrentProfile"

/** Prepare the account shortcut while preserving the conversation selected in the workspace. */
export function useAccountAvatar() {
  const query = useCurrentProfile()
  const { conversationId } = useWorkspaceNavigation()
  return { href: withConversation(APP_ROUTES.PROFILE, conversationId), name: query.data?.displayName ?? "Tài khoản", avatarUrl: query.data?.avatarUrl }
}
