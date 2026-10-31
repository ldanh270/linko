"use client"

import { useRouter } from "next/navigation"
import { CreateGroupModal } from "../components/CreateGroupModal"
import { APP_ROUTES } from "@/shared/layout/route.constants"

/** Render group creation modal dialog with friend picker for direct route access. UI only. */
export function CreateGroupPage() {
  const router = useRouter()
  return <CreateGroupModal onClose={() => router.push(APP_ROUTES.INBOX)} />
}
