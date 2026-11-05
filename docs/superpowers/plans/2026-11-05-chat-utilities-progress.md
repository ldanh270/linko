# Chat utility execution ledger

Plan: `docs/superpowers/plans/2026-11-05-chat-utilities.md`
Spec: `docs/superpowers/specs/2026-11-05-chat-utilities-design.md`
Branch: `codex/chat-utilities`; base `f61771d`. User approved implementation on 2026-11-05.

## Implemented backend

- `e2d9ede`: shared DTOs, typed transactional messages, current membership/history authorization and bounded message context.
- `9ff6258`: shared direct pins, active membership/cleared-history filtering, retained three-pin bound and real regression tests.
- `479ef8d`: Leaflet runtime/types and lockfile.
- `f1a8bf7`: appointments/RSVP/edit/cancel, private reminders/inbox, lease-based durable worker and temporal validation.
- `d21b544`: named polls, atomic single/multiple voting, withdrawal, closing/deadline enforcement and bounded batched hydration.
- `d342ded`: foreground location consent/durations, publisher/sequence/cadence checks, immediate privacy filtering, ended-coordinate cleanup and batched listing.
- `f3d10cc`: authenticated router/realtime composition, worker lifecycle and real HTTP/Socket.IO acceptance; cross-kind client-ID collisions produce a business conflict.
- `1bb3026`: additive Mongoose index preview/apply tooling with backup/review flags, operation/rollback documentation.
- `c9b7589`: independent backend review P2 fixed; RSVP preserves other attendees' overdue pending/claimed reminder intent and leases.

## Evidence so far

- Initial RED access test failed because the access service did not exist; GREEN 5 access-boundary tests.
- Pin RED: direct pins rejected, leftAt ignored and cleared-history pin exposed. GREEN: 10 service + 5 HTTP tests against isolated MongoDB.
- Shared persistence/context: 5 real MongoDB tests, including rollback, old target navigation, hidden/history restrictions and cross-kind idempotency conflict. Cross-kind test failed with MessageDuplicateKeyError before fix.
- Real authenticated HTTP + Engine.IO/Socket.IO + MongoDB: 2 tests passed, covering poll creation/voting, typed-message delivery, location stop/privacy, outsider denial, appointment creation/RSVP, typed pin/context and private reminder signals.
- Explicit worker lifecycle: 2 tests passed for no overlap, drain and error recovery.
- Full backend run before review follow-ups: 53 files / 291 tests passed; 2 files / 7 Redis-dependent tests skipped without `REDIS_TEST_URL`. New utility socket tests ran independently of Redis.
- Scheduling reviewer fix: RED both overdue pending/claimed cases; GREEN 11 focused scheduling tests and backend typecheck.
- MongoMemoryServer cannot start inside the Windows sandbox (mongod fassert); integration runs use an approved unsandboxed process and isolated test databases, never the configured application DB.

## In progress

- Frontend integration, focused tests and responsive browser acceptance.
- Appointment response/list hydration performance pass.
- Whole-branch review and final workspace gates. No overall completion claim yet.

## Rulings

- Continue after explicit implementation approval without another planning approval round. Reuse current checkout on a new local branch; no additional worktree or push.
- Use separate feature ownership for parallel backend/frontend work after fixing shared interfaces. Stage specific owned files and coordinate index access for commits.
- Preserve existing Chatvia visual baseline. Map loading is explicit and client-only; no native application or background tracking.
- Generic utility events invalidate authorized queries and never carry precise coordinates. Durable reminder inbox is authoritative; foreground transport is best effort.
- Closed-browser reminders appear on return; this release does not imply Web Push. Expiry filtering is independent of cleanup timing.
