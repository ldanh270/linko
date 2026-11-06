# Messaging expansion: proposed design

Status: proposal for user review; implementation has not started.

## Intent and scope

Deliver all six requested capabilities through the existing Linko chat UI:
message reactions, editing and recall, recorded voice messages, server-side
history search, private saved messages, and browser push notifications.
Preserve existing direct/group access rules, membership history boundaries,
private attachment storage, message idempotency, and utility messages.

The user requires clean code, SOLID, normalized data, and logical local commits.
The choices below are recommendations, not decisions already approved by the user.

## Approaches

1. Recommended: retain MongoDB/Mongoose and normalize the message-related source
   relations into separate collections. Reuse transactions, audit and soft-delete
   plugins, repository/service boundaries, contracts, and existing private storage.
   This preserves project decisions while increasing joins and migration work.
2. Move to a relational database for formal SQL schema normalization. This requires
   a separate application-wide persistence migration, including authentication,
   groups and utilities, substantially exceeding the six-feature expansion.
3. Continue embedding independent arrays in messages. This is cheaper initially
   but does not satisfy the requested separation of independent multivalued facts.

## Meaning of 4NF here

4NF formally describes relations and their multivalued dependencies; a MongoDB
document schema alone cannot be certified as a relational database in 4NF.
Apply its decomposition principles to the authoritative message-related facts.
Do not claim the entire existing database is in 4NF. Existing conversation member,
pin and preference structures remain outside this proposal's normalization scope;
normalizing the entire database would be a separate, broader migration.

Logical relations, excluding common ObjectId primary keys and audit columns:

| Source relation | Facts and candidate keys |
| --- | --- |
| messages | conversationId, senderId, clientMessageId, content, kind, resourceId, replyToId, revision, editedAt, recalledAt; sender/conversation/clientMessageId is the idempotency key |
| message_mentions | messageId, userId; unique active pair |
| message_attachments | messageId, position, private storage reference, name, MIME type, size; unique active message/position |
| message_voice | messageId, attachmentId, verified duration; unique active messageId and attachmentId |
| message_reactions | messageId, userId, reaction; unique active message/user pair |
| message_bookmarks | userId, messageId; unique active pair |
| push_subscriptions | userId, endpoint, encryption keys, expiration; unique active endpoint |
| push_preferences | userId, isEnabled; unique active userId |
| push_deliveries | messageId, subscriptionId, state, attempts, nextAttemptAt, leaseUntil, leaseToken; unique message/subscription pair |

Mentions, attachments, reactions and bookmarks must not form Cartesian products
or coexist as independent arrays in an authoritative message document. Voice
metadata describes one specific attachment, not an independent list. Separate
subscription identity from delivery attempts. The per-user reaction rule means
message/user determines reaction. Index names and fields live in constants.

Every new persistent relation receives createdAt, updatedAt, createdBy, updatedBy,
createdIp, updatedIp and delFlag through existing aspects. Reference fields have
indexes. Partial unique indexes constrain active rows; restore operations must
remain race-safe. Delivery keys remain unique across soft deletion to prevent
duplicate re-enqueueing. Relationships must be validated because MongoDB provides
no foreign-key enforcement. Transactional writes preserve referential invariants.

Conversation last-message content and search documents are explicitly derived
read models, with source IDs, update rules and rebuild procedures. They are not
authoritative copies of message content.

## Feature contracts and behavior

### Reactions

Support LIKE, LOVE, HAHA, WOW, SAD and ANGRY through shared contract constants.
Each person may select one reaction per message; selecting another replaces it.
Selecting the current reaction removes it. Expose idempotent PUT and DELETE
operations rather than retry-sensitive toggle writes. UI renders counts and the
current user's choice. Authorized batch loading avoids one query per message.
Recall removes reactions from visible responses and prevents new reactions.

### Edit and recall

Only the author may edit or recall an ordinary text/attachment/voice message.
Proposed policy: no time limit. System and utility messages cannot be edited or
recalled through these endpoints. Require current membership and message
visibility, including joinedAt and cleared-history boundaries where applicable.
Closed-group write restrictions match existing message policy.

Editing changes text and validated mentions only; attachment replacement and
audio editing are excluded. Keep replies and creation time stable. Require an
expected revision for editing and increment it atomically; a stale editor gets
a conflict instead of overwriting another edit. Return editedAt explicitly.
Recall is idempotent and produces a visible tombstone, not a hidden history gap.
Remove text and attachment access from DTOs, search results, quotes, saved-message
previews, pins and inbox previews. Revoke protected downloads immediately even
if a browser retained an old URL. Files already downloaded cannot be revoked.

Update last-message projections in the source transaction. A metadata-only
change event invalidates relevant authorized queries after commit. Reconnect
must revalidate cached messages rather than trusting only new-message events.
Use revision ordering to prevent stale requests resurrecting recalled content.
Recall does not physically purge storage or destroy audit records in this scope.

### Voice messages

Record with the browser microphone, offer stop/cancel, preview, duration, send,
retry and playback speeds 1x/1.5x/2x. Recording starts only after a user gesture.
Provide hold-to-record for pointer input and explicit keyboard/touch-accessible
start/stop controls. Proposed limits: one recording per message, 120 seconds,
10 MiB, no additional ordinary attachments in the same voice message.

Negotiate supported audio MIME types using MediaRecorder capability checks;
support the resulting WebM/Opus, Ogg/Opus and MP4/AAC formats that the server can
validate. Inspect actual container/audio metadata server-side, including duration;
do not trust the filename, client duration or submitted MIME type. Isolate media
inspection behind an injected port; choose a maintained parser during planning.
Reject corrupt, unsupported and over-limit recordings before private storage.
Reuse upload compensation and protected downloads. Support playback after reload
without exposing a public object URL. Release microphone tracks, timers and blob
URLs on cancellation, navigation and unmount. Handle denied permissions and
unsupported browsers explicitly. No transcription or voice calling is included.

### History search

Replace the loaded-row filter with cursor-paginated server search across all
history the requester may currently read, optionally across their conversations
or limited to one. Filters: text, sender, date range and attachment category.
Store the scope, query and filters in URL params and reset cursors on changes.
Result selection uses existing message-context navigation to load the target.
Show loading, empty, error and pagination states.

Use an indexed derived search relation with normalized Unicode text and bounded
prefix tokens, using the same normalization on query/write/backfill. Search is
case-insensitive and Vietnamese-diacritic-insensitive. Specify token semantics
in UI: all query words must match token prefixes; arbitrary infix matching and
fuzzy semantic search are excluded. Enforce bounded query length, token count,
page size and date ranges. Query indexes before fetching source messages, then
recheck source revision, recall, active membership and visibility before response.
Filters and cursor ordering use immutable createdAt plus ObjectId for stability.
Edits and recall update the search projection transactionally. No unbounded regex
collection scans or external hosted search service are required.

### Private saved messages

Save/unsave idempotently from message actions. A private saved-message view has
cursor pagination, loading, empty and error states and links back to the source.
Only the owner can read or mutate their bookmark records. Hydrate from the
current authorized source; never retain a snapshot of message text or files.
Leaving a group or losing message visibility removes its content from responses;
rejoining does not expose messages before the new membership boundary. Recall
can appear as an unavailable placeholder with an unsave action.

### Browser push

Explicit settings opt-in registers a service worker and subscribes the current
browser. Support multiple devices, per-user disable, and device unsubscribe.
Never request permission automatically on page load. Use encrypted Web Push via
a provider adapter with environment-validated VAPID configuration. Secrets and
subscription keys must not appear in DTOs or logs. An unconfigured deployment
shows an unavailable state while chat continues working.

On committed ordinary messages, enqueue durable per-device deliveries through a
transactional outbox. Reuse existing mute/preferences policy; exclude the sender.
Do not enqueue push for every reaction or edit. A leased worker retries transient
errors with bounded backoff, expires permanent 404/410 subscriptions, and rechecks
membership, mute state, preferences, recall and subscription ownership before send.
External delivery is at-least-once: use message/device notification tags to reduce
duplicates; do not promise exactly-once delivery after a worker crash.

Subscriptions must use HTTPS endpoints, bounded key formats and safe transport
that blocks loopback/private/link-local destinations, including DNS rebinding and
redirects. Treat submitted endpoints as untrusted outbound destinations.
Unsubscribe on logout for this device and prevent account switching from leaving
an endpoint associated with another account. All endpoint mutations require the
authenticated owner. Notification copy is generic and does not include message
text, attachment names or sender details. Click-through uses an allowlisted
same-origin application route, then authenticates and rechecks access. A recalled
message may have generated a notification already; the destination shows its
current state. Service-worker caches must not retain private API responses.
Document browser/platform restrictions and HTTPS requirements.

## Architecture and UI constraints

- Shared DTOs, routes, enum values, limits, errors and events in @linko/contracts.
- Route -> validation/auth -> controller -> service -> repository -> Mongoose.
- Constructor-injected role-specific ports; composition in app.ts and existing
  runtime bootstrap. Reuse existing patterns rather than duplicate frameworks.
- Global exception handler and logging aspects; no controller try/catch.
- Separate React hooks from presentational components. Extract action menus,
  reaction bar, edit dialog, voice recorder/player, search and saved-message UI.
- Existing Button/IconButton/Link primitives supply complete interaction states.
- Destructive recall requires confirmation. Pending actions prevent duplicates;
  failed optimistic changes roll back and provide feedback. Respect reduced motion.
- Preserve existing visual language and responsive layout; this is not a redesign.

## Migration and rollout

Add a dry-run-first, idempotent migration for mentions, attachments, legacy
reactions, voice/search relations and indexes. Preserve attachment public IDs and
download URLs. Validate legacy reaction values and resolve duplicate participant
entries deterministically; report unsupported records rather than silently lose
them. Record checkpoints and reconcile counts before switching reads.

Deploy additive schemas and temporary dual-write/read compatibility, backfill in
batches, reconcile counts/keys and searchable content, then switch authoritative
reads under an explicit migration state. Existing embedded fields remain intact
until rollback has been tested; remove them only in a later approved cleanup.
Edits and recall must update both representations while compatibility is active.
Before enabling recall, deploy a compatibility baseline that enforces recall in
history, downloads, reply quotes, pins, bookmarks, search and inbox previews.
Rollback is permitted only to that baseline or a newer recall-aware release;
retaining legacy fields never permits rollback to a reader that ignores recall.
On recall, scrub legacy text, mentions and attachment references in the same
transaction as the tombstone; retain independent audit metadata, not a client-
accessible content snapshot. Test rollback with a recalled message and an old
protected download URL before enabling the feature.
Document rollback, projection rebuilds, index review and worker operations.
Do not execute a live database migration as part of coding this feature set.

## Verification and delivery

Write failing behavior tests before production implementation. Cover cross-user
and cross-conversation access, leave/rejoin history, concurrency, idempotency,
normalization migration replay, recall/download/search leakage, media spoofing,
recording cleanup, stale socket events, bookmark privacy, endpoint ownership,
push retry/lease expiry and permission-denied UX. Real MongoDB integration tests
must exercise indexes and transactions using the existing test infrastructure.

Run root pnpm typecheck, lint, test and build, plus focused browser flows for all
six capabilities. Report any environmental limitation separately; do not equate
mocked push/media tests with successful delivery on a real configured device.

Logical commit sequence: shared contracts and normalized persistence/migration;
reactions; edit/recall; server search; saved messages; voice messages; push;
cross-feature verification and operations documentation. Each feature commit
includes its UI and tests. Commit only verified work and never push remotely.

## Review decision

Approve or adjust the proposed MongoDB normalization scope and feature policies.
After approval, produce the implementation plan and implement all six features.
