"use client"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/shared/components/useToast"
import { UTILITY_UI } from "../utility.constants"

/** Execute one utility command with shared cache refresh, duplicate-submit protection and safe feedback. */
export function useUtilityAction<TInput, TResult>(operation: (input: TInput) => Promise<TResult>, onSuccess?: (result: TResult) => void) {
  const client = useQueryClient()
  const toast = useToast()
  return useMutation({ mutationFn: operation, onSuccess: (result) => {
    void client.invalidateQueries({ queryKey: [UTILITY_UI.QUERY] })
    void client.invalidateQueries({ queryKey: [UTILITY_UI.REMINDERS] })
    void client.invalidateQueries({ queryKey: ["messages"] })
    toast.show(UTILITY_UI.SUCCESS, "success")
    onSuccess?.(result)
  }, onError: () => toast.show(UTILITY_UI.ERROR, "error") })
}
