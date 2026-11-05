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

## Frontend and review follow-ups

- `d1a811a`: appointment lists hydrate visible resources and attendance in bounded batches; 13 scheduling/temporal tests passed, including hidden, rejoined and cleared-history eligibility.
- `8761505` / `ec27a1c`: authorized reminder inbox pagination and complete unread counts. Four real HTTP/MongoDB regressions cover 50 future reminders hiding a delivery, source visibility, stable cursor ties and mark-all across 52 delivered records.
- `370cf92`: shared modal keyboard/focus ownership is limited to the topmost dialog; composer menus can open above the trigger.
- `26133a4` / `1fd903e`: complete utility forms/cards, app-scope location lifecycle, direct/group pins and context links, composer/overview actions, personal reminder entry and edit flow, timezone selection and responsive integration.
- `724f999`: four actual Next.js/Chromium scenarios cover 390px/1440px, creation/voting/RSVP, location consent/stop, original-message navigation, nested edit Escape, failed-create draft/idempotency preservation and private reminder editing.
- Whole-feature independent reviewer confirmed prior findings addressed: direct authorized delivery reads, membership/context cache resets and in-flight preview cancellation; source-aware paging/counts; topmost dialogs; immediate offline/socket location freshness. No remaining material production findings in that review.
- `fb3cce5`: a final RED test proved a fix inside the throttle window was dropped when movement stopped. GREEN: nine publisher tests after retaining only the newest in-memory fix until the next eligible tick and discarding it on pause/stop.
- `fa6f22c` / `fb5a384`: wider readable mobile activity cards and an explicit map recenter action. The four browser scenarios passed again after these refinements, including map-control access with unavailable external tiles.

## Final gate evidence

- Full backend: **55 files / 301 tests passed**; **2 files / 7 optional Redis-dependent tests skipped** without isolated `REDIS_TEST_URL`. Actual new utility HTTP/Socket.IO/MongoDB acceptance did run.
- Full frontend baseline after fixture updates: **69 files / 229 tests passed**. The only subsequent behavior change was location-fix coalescing; all **9 publisher tests** passed afterward, including its two new regressions.
- Workspace `pnpm typecheck` and `pnpm lint` passed. After final location changes, frontend typecheck and targeted lint passed again.
- Production `pnpm -C frontend build` passed after the final location fix.
- New utility browser suite: **4 passed** after final layout/map refinements. Screenshots at 390px/1440px were inspected for menu, poll, appointment and location content.
- Additional legacy chat/standalone-route browser regressions: **12 passed**. Commit `7be9b71` updates four old messenger assertions referring to labels/classes already absent at base `f61771d`, preserving retry/idempotency, recipient draft reset, profile, contact, logout and theme behavior assertions. Total browser acceptance: **16 passed** across the new utility and existing-flow suites.
- Browser acceptance uses API fixtures and simulated geolocation. Backend integration independently exercises actual authenticated HTTP, Socket.IO and isolated MongoDB. No physical-device accuracy test, production migration apply or closed-browser Web Push test is claimed.

All six plan tasks are complete. Keep the verified commits on local branch `codex/chat-utilities`; no merge or push is part of this request.

## Rulings

- Continue after explicit implementation approval without another planning approval round. Reuse current checkout on a new local branch; no additional worktree or push.
- Use separate feature ownership for parallel backend/frontend work after fixing shared interfaces. Stage specific owned files and coordinate index access for commits.
- Preserve existing Chatvia visual baseline. Map loading is explicit and client-only; no native application or background tracking.
- Generic utility events invalidate authorized queries and never carry precise coordinates. Durable reminder inbox is authoritative; foreground transport is best effort.
- Closed-browser reminders appear on return; this release does not imply Web Push. Expiry filtering is independent of cleanup timing.
