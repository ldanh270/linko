# Execution ledger — 2026-11-03-realtime-completion.md

- Approval: user approved implementation, atomic local commits, SOLID and JSDoc.
- Workspace: reuse existing checkout on `codex/realtime-completion`; no new worktree or dependency installation needed.
- Pre-flight: Tasks 1–3 share the gateway; preserve event names. Tasks 2–3 share the session socket; logout must reset session-scoped state. Task 4 consumes the existing visible-conversation hook.
- Ruling: keep this small execution ledger beside the approved plan instead of a platform-specific shell workspace; it preserves decisions in committed history on Windows.
- Task 1: typing sender/receiver lifecycle, membership checks, throttle, privacy preference, blur/empty stop, IME coverage, translations and reduced motion implemented. RED: receiver tests exposed retained users on route change/disconnect; new sender/backend service modules were absent. GREEN: 10 backend tests and 16 frontend tests passed; frontend typecheck passed.

- Task 2: atomic Redis offset allocation, no allocations on reads, batched bitmap reads, per-socket leases, expiry cleanup, recovery replay, DI and lastActive repository implemented. Frontend tracks only subscribed IDs and tears down on logout.
- Verification: 4 real Redis tests passed (concurrent clients, last-socket/expiry/restart, renewal, actual disconnect/reconnect); 5 lifecycle, 1 boundary, 1 fallback, 8 gateway and 12 profile route tests passed; 3 frontend presence tests and both typechecks passed.
- Environment: MongoMemoryServer requires an unsandboxed test process on this host (sandboxed mongod failed with fassert); rerun outside sandbox passed all 12 profile tests. Docker engine could not start without elevated Windows service rights; used Redis 8.0.4 from the official Alpine repository in an isolated WSL /tmp root, localhost port 16379/database 15. Only randomly named test keys are deleted; no production connections or FLUSHDB.
- Ruling: local fallback uses socket lease maps instead of a second bitmap; only Redis offsets own bitmap identity, preventing accidental cross-store offset reuse. Scope remains one backend replica.

- Task 3: one app-wide listener now deduplicates before unread updates, checks fresh mute/preview settings, selects toast/browser delivery and centralizes audio. Permission controls require an explicit click; notification click resolves actual direct/group type. Gateway broadcasts one room union. Timeline subscription no longer clears background unread or duplicates sound.
- RED: gateway overlap test observed 2 deliveries instead of 1; global notification/policy modules were absent. GREEN: 31 focused frontend tests and 9 backend gateway tests passed; both typechecks passed. Permission, deny, preview privacy, route/unmount races, reconnect refetch and actual click navigation are covered.
- Ruling: active visible conversations retain one eligible sound but no toast; background conversations retain unread state. Existing tests expecting sound inside the timeline were updated to assert its sole ownership in the global delivery hook.

- Task 4 (server acceptance): native WebSocket tests exercise real Engine.IO/Socket.IO handshakes with two signed accounts, direct/group typing, one delivery for overlapping rooms, private-room delivery in another tab, final disconnect and reconnect using actual MongoDB and Redis.
- RED: the real repository incorrectly authorized a participant with leftAt set. Added the missing active-participant filter; full backend suite passed: 47 files / 253 tests, including Redis integration, with backend typecheck passing.

- Task 4 (session acceptance): a new failing auth test proved refresh failure retained the old realtime transport. Both expiry paths now reset the socket session, and an expired bootstrap cannot later restore authenticated UI. Auth tests passed.

- Task 4 (route acceptance): seven Playwright scenarios passed, covering five standalone routes with/without selection at 390px/1440px, no mounted timeline/composer, no hidden mark-read, viewport changes, Back and refresh. Existing profile E2E expectation was corrected to require no chat DOM.
- RED: browser history test returned about:blank because filter changes replaced the initial entry. Both existing chat-details/inbox-filter effects also failed lint by mirroring URL state into local state. These controls now use the shared URL hook directly; Back/Refresh passed and full frontend lint is clean.
- RED: visiting A, B then A revived stale typing after its timeout had been cleared. Receiver state now resets for conversation/account scope changes; the expanded regression test passes. Next.js acceptance also caught an import before the client directive; that placement is corrected.
- Ruling: fixed the two existing URL-state lint errors in the related inbox/chat hooks instead of disabling lint rules. This removes duplicate state, preserves discrete selections in history and satisfies the required URL-source-of-truth rule. No unrelated page redesign was introduced.
- Full frontend suite before the last acceptance refinements passed 65 files / 212 tests; changed auth/typing/layout tests were rerun successfully. Final build and whole-branch review follow.
