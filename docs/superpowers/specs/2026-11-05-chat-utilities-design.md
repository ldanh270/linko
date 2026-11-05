# Linko chat utilities: pins, appointments, polls, live location

Date: 2026-11-05 (Asia/Saigon). Status: proposed; awaiting design approval before implementation.

Builder check: an independent read-only planning review on 2026-11-05 reported "nothing important left". This review is not user approval and does not establish implementation or test completion.

## Intent and confirmed requirements

Extend Linko's existing chat into a useful place to organize activities together. The user requested pins, appointments/reminders, polls, location sharing, and complete UX/UI integration. They explicitly chose time-limited live location and confirmed that updates while the phone is locked are not required.

Keep all four capabilities in this project. Implementation may use sequential atomic commits; a partially implemented set is not completion. The open-ended request for a complete chat experience does not automatically add calls, payments, AI features, or unrelated social features.

Everything below beyond those confirmed requirements is an engineering/product proposal for approval, including duration choices, permissions, limits, and notification scope.

## Current evidence and constraints

- Next.js/React/TypeScript/Tailwind frontend, TanStack Query, React Hook Form and Zod; Express/Mongoose backend and Socket.IO. Shared contracts live in `packages/contracts`.
- Existing group pins have persistence, list/pin/unpin APIs, manager permissions, transaction checks, a three-pin bound, hooks and a details accordion. The accordion is currently a passive list; enhance the existing feature rather than replace it.
- Existing messages contain text/reply/mentions/attachments. Polls, appointments and live location are not modeled as first-class message content today.
- The authenticated workspace already owns session teardown, message delivery, notification/audio deduplication, URL state and group membership revocation. Extend these boundaries.
- Existing notification persistence is for preferences, not a durable reminder inbox or scheduled delivery. Browser notifications do not constitute closed-browser push delivery.
- Latest visual baseline is the Chatvia parity design (2026-10-24), not the older Warm Social concept: preserve current tokens, typography, icon system and layouts.
- All additions follow AGENTS.md: ObjectId references/string DTO IDs, constants in contracts, UTC database dates, Mongoose audit/soft-delete aspects, repository/service/controller separation, UI-only components with separate hooks, English exported-symbol doc comments and local atomic commits.

## Approaches and selected direction

1. Integrate into the current web conversation, with typed timeline cards and details sections. Reuses accounts, permissions, message ordering, realtime and visual primitives. Foreground live location has explicit freshness states. Recommended direction, consistent with the user's acceptance of no locked-screen updates.
2. Build a separate planning dashboard alongside chat. Offers more room for large calendars but introduces a second navigation model and weaker message context. Not proposed for this project.
3. Add a native mobile client for continuous background tracking. Requires a separate application lifecycle and platform permissions. The user's confirmation removes the need for this scope.

The web/foreground constraint is confirmed; the integrated UX and detailed rules remain proposals. Do not treat this document as approved implementation instructions yet.

## Shared experience

- Add an accessible composer action menu for files, appointments, polls and live location. Retain the existing attachment flow and keyboard sending behavior. Capability/permission checks determine which actions are enabled.
- Each new utility creates a real timeline message with a typed, interactive card, a meaningful inbox preview and a stable deep link. Ordinary text messages remain compatible.
- Details expose pins, upcoming appointments, polls and active location shares. Filters/tabs/selected message IDs use validated URL parameters with Back/Refresh restoration. Transient form drafts remain local.
- Desktop uses compact dialogs/details panels; mobile uses responsive dialogs/sheets that respect safe areas and the onscreen keyboard. Do not keep unrelated chat panes mounted on standalone routes.
- Loading, empty, access denied, recoverable error, submitting, success and ended/cancelled states are designed for every utility. Preserve drafts on recoverable failures; prevent double submissions; announce results accessibly.
- Escape closes dismissible overlays; focus is trapped/restored; icon actions have labels; destructive actions require confirmation. Use shared Button/IconButton/Link primitives and reduced-motion behavior.
- Scope is functional controls backed by real server state, not static/demo cards. No full-site redesign.

## Pins

- Preserve the existing maximum of three shared pins. In groups, owner/admin can pin or unpin; members can read visible pins.
- Extend shared pins to direct conversations: either active participant can pin/unpin, visible to both. Store conversation-level pins for direct chats without changing existing group storage semantics invisibly; expose one service/DTO contract and document any backfill.
- Show a compact pinned-message strip below the chat header, with a count and an accessible open-list action. Details and strip read the same query data.
- Selecting a pin navigates to and highlights its original message. Add an authorized message-context lookup for older unloaded history; never claim success by searching only mounted DOM rows.
- Confirm unpinning; show capacity feedback before/after races. No silent automatic replacement of another pin. Mutations are idempotent and broadcast after commit.
- Enforce the same joined-at/cleared-history/hidden-message visibility as normal messages. Restricted or unavailable targets show a safe unavailable state rather than leaked previews.

## Appointments and reminders

- Available in direct and group chats. Any active member can create a one-off appointment, optionally starting from a visible message.
- Fields: title (1–120 chars), optional description (up to 2000 chars), start time, optional end time later than start, IANA timezone, optional text meeting place or validated HTTPS meeting link. Creation requires a future start.
- Store instants in UTC and retain the chosen timezone for editing/display. Default to the browser's timezone, label it explicitly, reject nonexistent local times and disambiguate repeated daylight-saving times in the form.
- RSVP choices: going, maybe, declined; no response remains distinct. Each member changes only their own RSVP. Creator and group managers can edit/cancel; in a direct chat the creator controls edit/cancel. Cancellation retains a clearly cancelled timeline card.
- Cards show title, local date/time, timezone, location, RSVP summary and open-details action. Details show participant responses and edit history metadata (updated time, not a new audit-log product).
- Each attendee opts into a personal reminder: at start, 5 minutes, 15 minutes or 1 hour before. Creator defaults to going with a 15-minute reminder, visibly editable. Other members have no automatic personal reminder until they choose one. Declining removes pending reminders.
- Personal "Remind me" is also available on a visible message: choose a future instant; only the requesting user sees the reminder, including an optional short note. It uses the same scheduling pipeline.
- Editing appointment time rebuilds pending reminders transactionally with an event revision. Already-past reminder offsets are not fired immediately; show the remaining valid choices, including at-start when still future. Cancellation or loss of access invalidates pending jobs.
- First delivery scope: durable in-app reminder inbox plus existing foreground toast/audio/browser notifications when permitted. Add a small reminder-inbox entry point in the existing navigation, with unread count and links to authorized context.
- Closed browser: retain reminders server-side and surface them when the user returns. Do not claim Web Push, email/SMS or locked-screen delivery. The UI states this limitation near reminder setup. Recurring appointments, external calendar sync and Web Push are separate follow-up scope.

### Durable scheduler

- Run a bounded polling worker from the backend lifecycle with graceful shutdown. Do not use per-reminder timers as the source of truth.
- Persist due jobs with status, dueAt, event revision, lease owner/expiry and attempts. Claim atomically, retry with bounded backoff, recover expired leases after restart, and record exhausted technical failures for investigation.
- In a transaction, recheck resource revision, active membership and history visibility, then create a uniquely keyed delivery and complete the job. Account/system audit identity is set through the existing context aspect.
- Persisted delivery is authoritative. Socket/toast/browser transport is best effort with delivery IDs for deduplication; a delivery must be queryable even if emission fails.
- Server outages cause overdue jobs to catch up. Reminder inbox labels them overdue; foreground alerts older than 24 hours are suppressed while the durable record remains visible. Never send a cancellation-invalidated reminder during catch-up.
- The reminder inbox supports listing, read/mark-all-read and dismiss (soft delete), always scoped to the authenticated user and current resource access. Group mute suppresses unsolicited audiovisual alerts, not durable records; an explicit personal reminder may alert despite group mute, subject to global notification settings.

## Polls

- Available in both direct and group chats. Any active member can create a poll with a question (1–200 chars), 2–10 distinct nonempty options (up to 120 chars each), single/multiple choice, and optional future close time.
- This version is named voting: clearly disclose that eligible members can view who voted. Anonymous voting and member-added options are not included.
- A user submits their full selection atomically, may change it or withdraw while open, and cannot vote twice through retries/tabs. Single choice accepts exactly one option; multiple choice accepts one or more; withdrawal is a separate explicit action.
- Cards show option totals, current selection, unique voter count and open/closed state. Single-choice percentages use total voters; multiple-choice percentages also use voters and may sum above 100%, with explanatory copy.
- The creator can close; group owner/admin can also close. Deadline checks use server time on every write; a stale client or delayed worker cannot accept a late vote. Once published, question/options/mode are immutable, including before the first vote; cancel/close and create another poll to change them.
- Persist votes separately with a unique poll/user index and stable option IDs. Count only currently eligible voters with access to the poll; departed/removed members are excluded from totals and identities. On rejoining, earlier votes are not resurrected; invalidate them on membership departure. New members cannot access polls predating their permitted history.
- Server computes viewer-safe counts/results and publishes revisioned invalidation events after commit; clients refetch rather than trust increments from network events. Reconnect restores authoritative state.

## Time-limited live location

- Available in direct/group chat after a deliberate share action and browser permission. No location request on page load, opening a conversation, or simply opening the action menu.
- Duration choices: 15 minutes, 1 hour or 8 hours. Show recipients/conversation, duration and permission rationale before starting. Require an initial successful fix before creating the share/card.
- A user can have one active share per conversation. Multiple conversations require separate explicit consent. One originating tab/device owns coordinate publishing for each share; other tabs may view or stop it but cannot silently take over publishing. Reload offers an explicit resume only while unexpired.
- Maintain publisher lifecycle above individual conversation panes so route navigation does not accidentally stop a foreground share. Auth reset/logout stops watchers immediately; a server stop request is best effort, while server expiry remains authoritative.
- Use browser watchPosition in a secure context. Publish at most one accepted update per 5 seconds with finite latitude/longitude/accuracy bounds, monotonic sequence, server timestamp and expiry checks. Coalesce client updates, never queue an offline trail. Only the authenticated share owner/publisher can update.
- A compact map card shows the latest point, accuracy, remaining duration, last-update time and stop action for the owner. A larger map view can show the selected conversation's active shares. Opening another map provider is explicit.
- After 30 seconds without a server-accepted fix show stale/paused status. Hidden tabs suspend publication; returning to a visible tab requests a fresh fix within the original expiry. Do not promise locked-screen/background tracking.
- Offline/disconnect clears the live indicator and preserves the honest last-update timestamp. Permission denial/revocation, timeout, unavailable location and unavailable map tiles have distinct actionable copy. Coordinate state must remain understandable even if tiles fail.
- Stop is irreversible for that share and idempotent. Duration expiry is enforced by every read/write, independently of worker uptime. Stop/expiry produces an ended card and removes precise coordinates from subsequent API/socket payloads and cached UI. Re-sharing creates a new session.
- Persist only the latest coordinate, not a trail. A cleanup worker removes precise stored coordinates after stop/expiry; authorization omits them immediately even before cleanup. Ended cards retain only sender, duration and start/end metadata. Do not log coordinates or put them in URLs/analytics.
- Revalidate active membership and message-history visibility on every read/update; departing sender ends their shares, departing viewers lose access. Broadcast coordinates only to a separately authorized viewer subscription, not a generic room that might include newly joined members without history access. Refresh authorization on membership changes/rejoin.
- Use a client-only map adapter and configurable tile provider with required visible attribution. Choose and document a provider whose tile policy fits usage; no secret browser keys or implicit paid-account dependency. Exact library/provider selection is left to implementation research; any required account setup must be reported explicitly.

Geolocation limitation source: https://www.w3.org/TR/2026/REC-geolocation-20260324/ (position updates are provided to fully active visible documents). The user accepted foreground-only operation.

## Contracts, persistence and integration

- Add backwards-compatible message kind/resource references in shared contracts and models; historical messages default to ordinary messages. Use a renderer registry for typed cards rather than growing conditional chains. Hydrate authorized resources in bounded batches, avoiding one query per timeline row.
- Persist resource creation and its timeline message in one transaction with the existing client-message idempotency scheme. Retrying a create returns the same resource/message. Failures cannot create orphan cards/resources or duplicate inbox previews.
- Pins remain in their existing module. Add appointment, reminder, poll and live-location feature modules with narrow injected ports. Wire collaborators once in the composition root; start/stop workers from backend lifecycle, never from tests or module import side effects.
- Proposed collections: appointments, appointmentresponses, reminderjobs, reminderdeliveries, polls, pollvotes and locationshares. Every collection has audit fields and soft-delete behavior. Use options/metadata embedded in a parent record where they do not have an independent lifecycle.
- Add named indexes for conversation/time/message references, due-job claims, active share lookup, unique votes/responses/deliveries and creation idempotency. Partial unique constraints account for soft deletion; expiry must not depend on MongoDB TTL deletion timing.
- Schema/index migration uses the repository's reviewed dry-run/apply convention, with old-message default behavior and rollback guidance. Never mutate existing production data or run an apply migration as part of local verification.
- HTTP boundaries use auth, Zod validation, safe DTOs and the existing envelope/global error handler. Resource IDs are never sufficient authorization; resolve the containing conversation and visible source message.
- Endpoints cover resource create/read/list, appointment edit/cancel/RSVP, personal reminder CRUD/inbox, poll vote/withdraw/close, location start/update/stop, and authorized message-context navigation. Exact path constants and DTO fields are established once in contracts during the plan.
- Realtime events carry stable resource ID, conversation ID and revision. Emit after database commit and deduplicate by revision/delivery ID. Refetch on reconnect, membership change and stale cache. Poll/location changes do not create fake unread chat messages on each update.
- Enforce closed-group behavior: no new utility creation/votes/RSVP/shares; active location shares end and pending reminders are cancelled. Existing authorized utility history remains readable. Resource owners may stop/cancel personal activity even when a conversation is closed.
- Friendship/direct-chat rules continue to follow the existing conversation access policy. No change to who may start a direct conversation.
- Apply bounded payload/rate limits, server-time decisions and transaction race handling. Technical logs contain request IDs/resource IDs, never raw request bodies, notes, coordinates or tokens.

## Verification and acceptance

1. Pins: existing group permissions/capacity remain correct; direct shared pins work; old-message navigation fetches real context; a second client updates without refresh; inaccessible history never leaks.
2. Appointments: create/edit/cancel and RSVP persist across refresh; timezone/DST validation is correct; moving/cancelling an event cannot produce stale reminders.
3. Reminders: deterministic clock tests, concurrent claims, lease expiry/restart, retries, duplicate delivery prevention, closed/removed membership, catch-up, mark-read and notification preferences. A server restart must not lose due work.
4. Polls: single/multiple/withdraw flows; simultaneous tabs/votes; deadline and close races; eligibility changes; counts and identities never expose inaccessible members/history.
5. Location: two authenticated clients see updates; late/out-of-order/unauthorized fixes are rejected; hidden/visible/offline lifecycle is honest; route changes preserve publishing; logout clears it; stop/expiry removes coordinates; new members without history cannot subscribe.
6. Browser acceptance at 390px and 1440px, plus narrow 360px and breakpoint checks: composer menu, forms, cards/details, deep links, Back/Refresh, focus/keyboard, long content, failure/retry, duplicate-submit prevention and no horizontal overflow. Verify existing chat/attachments/standalone routes still work.
7. Focused regression tests first, then full workspace typecheck/lint/tests and frontend production build. Actual HTTP/Socket.IO/database integration is required for race/security claims; fixture-only E2E cannot replace it. Physical geolocation accuracy is explicitly outside automated proof.
8. Independent review before completion. Fix accepted findings, record verification evidence, split logical Conventional Commits, verify clean task-owned git status/log, and do not push.

## Delivery boundaries and remaining builder choices

Deliver all four utilities and the shared integration described here after design approval. Suggested order: shared typed-message/context support; pins; polls; appointments/reminder delivery; live location; whole-feature browser acceptance. This is sequencing, not permission to drop later features.

Builder choices: precise module/file decomposition, map package/provider after official-doc research, exact API/event constant names, worker batch sizes/backoff within bounded defaults, and UI spacing using existing tokens. Document meaningful choices in the implementation plan. Do not silently add a paid provider, native app, background tracking, recurring calendars or offline Web Push.
