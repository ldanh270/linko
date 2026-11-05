/** Poll persistence fields are shared by schemas, repositories and safe mappers. */
export const POLL_FIELDS = {
    ID: "_id", CONVERSATION_ID: "conversationId", MESSAGE_ID: "messageId", CREATOR_ID: "creatorId", CLIENT_ID: "clientMessageId",
    QUESTION: "question", OPTIONS: "options", TEXT: "text", MODE: "mode", CLOSES_AT: "closesAt", STATUS: "status", REVISION: "revision",
    CREATED_AT: "createdAt", UPDATED_AT: "updatedAt", DELETED: "delFlag", POLL_ID: "pollId", USER_ID: "userId", OPTION_IDS: "optionIds", VOTED_AT: "votedAt",
} as const
/** Safe poll business errors do not expose persistence details. */
export const POLL_ERRORS = {
    NOT_FOUND: "Poll not found", CLOSED: "This poll has closed", INVALID_OPTIONS: "Choose valid poll options", SINGLE: "Choose exactly one option",
    MANAGER: "Only the poll creator or a group manager can close this poll", DEADLINE: "Poll closing time must be in the future", IDEMPOTENCY: "This command was already used for another message",
} as const
/** Named indexes support bounded conversation reads and one current vote per person. */
export const POLL_INDEXES = { CONVERSATION: "poll_conversation_created", MESSAGE: "poll_message_unique", IDEMPOTENCY: "poll_creator_command_unique", VOTE: "poll_user_vote_unique", VOTE_USER: "poll_vote_user" } as const
