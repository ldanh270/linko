"use client"
import { z } from "zod"
import { useQueryParamState } from "@/shared/url/useQueryParamState"
import { UTILITY_UI } from "../utility.constants"

/** Navigate to authorized message context through one shared URL parameter. */
export function useMessageNavigation() {
  const focus = useQueryParamState(UTILITY_UI.FOCUS, z.string().regex(/^[a-f\d]{24}$/i).or(z.literal("")), "")
  return { openMessage: (id: string) => focus.setValue(id) }
}
