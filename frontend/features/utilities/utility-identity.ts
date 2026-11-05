"use client"
import { createContext, useCallback, useContext } from "react"

/** Safe conversation identities already loaded by the containing chat pane. */
export interface UtilityPerson { readonly id: string; readonly name: string }
/** Share visible identity labels without one extra profile request for every vote. */
export const UtilityPeopleContext = createContext<readonly UtilityPerson[]>([])
/** Resolve resource participant labels from the authorized conversation roster. */
export function useUtilityIdentity() {
  const people = useContext(UtilityPeopleContext)
  return useCallback((id: string) => people.find((person) => person.id === id)?.name ?? "Thành viên", [people])
}
