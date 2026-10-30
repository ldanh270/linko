"use client"

import { z } from "zod"
import { useQueryParamState } from "../url/useQueryParamState"

const SECTION_PARAM = "section"
const SECTION_SCHEMA = z.string().max(40)

/** Restore a single expanded section from browser history without duplicating URL state. */
export function useAccordionSection(defaultSection: string) {
  const { value: section, setValue } = useQueryParamState(SECTION_PARAM, SECTION_SCHEMA, defaultSection)
  return { section, toggleSection: (id: string) => setValue(section === id ? "" : id) }
}
