# Chat utility operations

## Runtime

Start the backend normally. After MongoDB connects, composition starts the durable reminder worker and a bounded 15-second live-location cleanup pass. SIGINT/SIGTERM drains current work before MongoDB disconnects. Multiple reminder workers use atomic claims and expiring leases; no browser timers are the delivery source of truth.

Reminders are stored in MongoDB. With Linko open, delivery IDs trigger an authorized inbox refresh and eligible foreground alerts. A closed browser receives stored reminders on return; this release does not provide Web Push, email/SMS or locked-screen location updates.

The personal inbox uses `GET /api/reminders/inbox?cursor=<last-id>` for authorized cursor pages and a complete unread count. Notification previews resolve the delivered ID through its authorized item endpoint, independently of the current page. Mark-all-read covers every eligible delivered reminder, including unloaded pages. The original array list endpoint remains available for compatibility.

Location updates require HTTPS (localhost is suitable for development), browser consent, a visible document and an unexpired share. Ended/expired sessions immediately omit coordinates in API responses, even before maintenance removes stored precise fields. No route history is stored. Generic Socket.IO invalidations carry IDs/revisions, never coordinates.

## Index migration

Run from the repository root, with backend database configuration supplied through the usual environment:

```sh
pnpm db:migrate:chat-utilities
```

This defaults to a read-only preview of declared indexes, with automatic index/collection creation disabled. Review the output and prepare a backup before explicitly applying:

```sh
pnpm db:migrate:chat-utilities -- --apply --backup-confirmed --dry-run-reviewed
```

The apply mode adds indexes with Mongoose `createIndexes`; it never calls `syncIndexes`, drops collections, deletes records or removes existing indexes. Failed unique builds require inspecting conflicting records, not silently deleting them. Only the seven new utility collections are targeted.

Old messages need no data rewrite: missing kind means ordinary text. Existing group pins stay in `group.pinnedMessageIds`; direct pins use the new conversation-level array. A missing `utilityRevision` starts at zero on its first transactional increment. Audit/soft-delete plugins remain authoritative.

Rollback: stop the utility workers and deploy the previous application. Preserve new collections and message resource references for recovery; old clients show the plain-text previews of typed messages. Shared pin data and ordinary chat records are not rewritten. Do not purge utility data or undo indexes automatically; removal requires a separately reviewed retention/migration procedure.

## Verification boundary

Use isolated MongoDB replica sets for tests; never use the configured application database as a fixture store. This Windows sandbox cannot start mongod, so integration tests need an approved unsandboxed process. Optional Redis integration tests additionally require an isolated `REDIS_TEST_URL`; do not point them at production.

Map provider configuration and attribution follow the frontend map adapter and environment example. Public map tile requests expose the requested map area to the chosen provider; maps load only after an explicit user action. Choose a provider whose usage policy fits deployment traffic.

Map implementation references: [Leaflet stable 1.9.4 documentation](https://leafletjs.com/reference-1.9.4.html) and [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/). Browser requests retain normal HTTP caching and referrers, visible attribution remains on the map, and there is no bulk/offline tile prefetch. Public OSM tiles provide best-effort availability; configure another compliant provider when deployment traffic requires it.
