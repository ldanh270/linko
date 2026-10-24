/** URL state shared by primary panels and canonical conversations. */
export const WORKSPACE_PARAMS = {
  CONVERSATION: "conversation",
  SEARCH: "q",
  MESSAGE_SEARCH: "messageSearch",
  DETAILS: "details",
} as const
/** Validate the single ID representation without accepting paths or query injection. */
export const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i
