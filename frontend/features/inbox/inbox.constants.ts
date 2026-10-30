import { CONVERSATION_KIND } from "@linko/contracts"

/** Query key prefix shared by inbox and conversation list data. */
export const INBOX_QUERY_KEY = ["inbox"] as const

/** Filter controls preserve the existing inbox conversation-kind contract. */
export const INBOX_FILTERS = [
  { value: CONVERSATION_KIND.ALL, label: "Tất cả" }, { value: CONVERSATION_KIND.GROUP, label: "Nhóm" }, { value: CONVERSATION_KIND.DIRECT, label: "Bạn bè" },
] as const
