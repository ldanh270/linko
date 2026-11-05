# Chat Utilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Parallel independent feature ownership follows superpowers:dispatching-parallel-agents.

**Goal:** Ship pins, appointments/reminders, polls and foreground live location as persistent chat features.

**Architecture:** Shared contracts and a transactional utility-message/access port connect independent feature services to existing chat. Typed cards and focused hooks extend the current UI; a durable worker owns due reminders and location cleanup.

**Tech Stack:** Existing TypeScript, Next.js, React, TanStack Query, Zod, Express, Mongoose, Socket.IO, Vitest and Playwright.

**Spec:** `docs/superpowers/specs/2026-11-05-chat-utilities-design.md` (approved by user: "implement đi").

## Global Constraints

- Preserve three shared pins; ObjectId DB references/string DTO IDs; UTC database dates; audit/soft-delete aspects.
- Foreground location only; choices 15 minutes, 1 hour, 8 hours; stale after 30 seconds; at most one update per 5 seconds.
- Polls: 2–10 options, named single/multiple voting, deadline enforced server-side.
- No paid provider, background tracking, recurring calendars, or closed-browser Web Push.
- UI-only components, separate hooks, existing tokens, responsive and keyboard-accessible states.
- Local atomic commits; no push. Reuse current checkout on `codex/chat-utilities`; no additional worktree needed.

## Review Focus

- History boundary and departing/rejoining members cannot leak utility data or coordinates: access integration tests.
- Retries/two tabs cannot create orphan resources or double votes: unique keys and transaction tests.
- Event changes/restart cannot deliver obsolete reminders: revision/lease/recovery tests.
- Hidden tabs, offline updates and out-of-order location fixes cannot look live: lifecycle tests.
- Older pinned messages remain navigable beyond the currently loaded page: context endpoint and browser tests.

## Ownership and tasks

### 1. Shared contracts and utility port (root)

Files: `packages/contracts/src/chat-utilities.ts`, `messages.ts`, `index.ts`; `backend/src/modules/utility/*`; message model/repository/mapper and composition root.

Interfaces: `UtilityAccess.require({conversationId, actorId, messageId?, write?}, transaction?)` returns member role/history; `UtilityTimeline.create({conversationId, actorId, clientMessageId, kind, resourceId, content}, transaction)` creates message/update preview; `publish(message)` emits after commit. Contracts define all DTO/request/route/event constants before feature work starts.

- [x] RED: reject departed member and pre-join/hidden source message; typed history preserves kind/resource IDs.
- [x] Implement access repository/service, timeline port, typed message mapping and registry contract.
- [x] GREEN: focused tests and typecheck; commit.

### 2. Polls and live-location backend (worker)

Files owned: `backend/src/modules/poll/*`, `backend/src/modules/location/*`, corresponding models.

Consumes shared contracts/utility ports. Produces feature routers/services with an explicit factory accepting ports; root mounts routers and worker cleanup.

- [x] RED: single/multiple/withdraw/deadline votes, idempotent creates, forbidden reads, ended/late/out-of-order fixes and stale timestamps.
- [x] Implement narrow repository/service/controller modules, indexes and safe DTOs.
- [x] GREEN: focused service/HTTP tests and typecheck; atomic commits.

### 3. Appointments and durable reminders backend (worker)

Files owned: `backend/src/modules/appointment/*`, `backend/src/modules/reminder/*`, corresponding models.

Consumes shared contracts/utility ports. Produces feature routers plus `tick()`/`start()`/`stop()` worker lifecycle, with injectable time and transport.

- [x] RED: RSVP/edit/cancel, timezone/offset validation, private message reminders, duplicate job claims, revision invalidation, retry/restart and inbox authorization.
- [x] Implement persistence, scheduling, lease/delivery deduplication and safe inbox APIs.
- [x] GREEN: focused service/HTTP tests and typecheck; atomic commits.

### 4. Existing pins and server integration (root)

Files owned: existing pin module, Conversation direct-pin storage, app/index, migrations/docs and shared utility ports.

- [x] RED: direct pins, leftAt membership, capacity races, older-message context and utility event authorization.
- [x] Extend existing pins and publish invalidations; add authorized context lookup.
- [x] Mount feature factories and graceful worker lifecycle; document dry-run index migration.
- [x] GREEN: focused and integration tests; commit.

### 5. Complete frontend (worker)

Files owned: frontend (existing chat and new utility feature modules). No backend/contracts edits without coordination.

Consumes shared DTOs and route constants. Produces composer menu, typed cards, pins strip/context navigation, resource forms/details, durable reminder inbox and session-scoped location publisher.

- [x] RED: forms/vote errors, duplicate submit, stop/expiry and visibility lifecycle, pins context navigation.
- [x] Implement focused hooks/components, accessible dialogs, URL details state, realtime query invalidation/reconnect, and existing visual tokens.
- [x] GREEN: focused tests, frontend typecheck/lint, responsive browser acceptance; atomic commits.

### 6. Whole-feature verification (root + fresh reviewer)

- [x] Check each spec acceptance condition, fix gaps; do not drop unfinished features.
- [x] Run `pnpm typecheck`, `pnpm lint`, full frontend/backend tests, and `pnpm -C frontend build`.
- [x] Run real HTTP/socket/database integration and targeted Playwright at 390px/1440px.
- [x] Independent whole-branch review, resolve findings, commit ledger/evidence, verify git status/log.

## Execution rulings and progress

- User explicitly requested implementation after design approval; continue execution without another approval round.
- Independent frontend and backend modules may run concurrently after contracts are fixed. Shared files remain root-owned; workers are not alone and must preserve other edits.
- Exact worker commands and verification outcomes are appended as work completes.
