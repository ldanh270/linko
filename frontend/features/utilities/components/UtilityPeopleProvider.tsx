import type { ReactNode } from "react"
import { UtilityPeopleContext, type UtilityPerson } from "../utility-identity"

/** Authorized labels supplied by the containing conversation. */
export interface UtilityPeopleProviderProps { readonly people: readonly UtilityPerson[]; readonly children: ReactNode }
/** Supply visible participant labels to utility cards through composition. UI only. */
export function UtilityPeopleProvider({ people, children }: UtilityPeopleProviderProps) {
  return <UtilityPeopleContext.Provider value={people}>{children}</UtilityPeopleContext.Provider>
}
