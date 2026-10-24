/** People URL state and shared query groups. */
export const PEOPLE_PARAMS = { USER: "user" } as const
/** Stable cache prefixes coordinate friend/search/profile mutations. */
export const PEOPLE_QUERY_KEYS = { FRIENDS: "friends", REQUESTS: "friend-requests", SEARCH: "people-search", PROFILE: "public-profile" } as const
/** Search behavior and messages shared by people hooks. */
export const PEOPLE_LIMITS = { MIN_SEARCH_LENGTH: 2, DEBOUNCE_MS: 250 } as const
