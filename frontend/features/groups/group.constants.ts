/** Shared TanStack Query keys for group information cache entries. */
export const GROUP_QUERY_KEYS = {
    INFO: "group-info",
} as const

/** Build the stable query key used by group information readers and pin mutations. */
export function createGroupInfoQueryKey(conversationId: string): readonly [typeof GROUP_QUERY_KEYS.INFO, string] {
    return [GROUP_QUERY_KEYS.INFO, conversationId]
}
