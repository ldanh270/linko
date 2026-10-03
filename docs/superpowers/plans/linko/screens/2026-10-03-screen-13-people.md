# UI-13 — Bạn bè và hồ sơ người khác Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Tìm người dùng, gửi/chấp nhận lời mời kết bạn và mở đúng DM.

**Architecture:** Next App Router entry chỉ nối PeoplePage; page compose section, hook usePeoplePage giữ logic và gọi adapter đã có. JSX component không gọi API.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript strict, Vitest/React Testing Library, Playwright.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), UI-13; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F02, F16. **Route:** frontend/app/(app)/people/page.tsx; selected user lives in URL search param user.

## Global Constraints

- AGENTS.md: route chỉ nối page; Page compose; JSX ở component, state/effect/handler ở hook, HTTP trong adapter; một exported component/file, <= khoảng 150 dòng, không any.
- Dùng token/Be Vietnam Pro/shared primitives từ F00; 360–1440 px, zoom 200%, keyboard/screen reader, WCAG 2.2 AA; action đủ hover/active/focus/disabled/loading.
- Data view có loading/empty/error; destructive action có xác nhận; filter/search/tab nằm trong URL. Không hard-code route/field/label lặp lại.

## Review Focus

1. Search trùng username.
2. tự kết bạn.
3. request ngược chiều.
4. người dùng không tồn tại.
5. query URL hỏng.

## File ownership and interfaces

- Route: frontend/app/(app)/people/page.tsx; user profile opens in a detail panel selected by ?user=<ObjectId>.
- Page: frontend/features/people/pages/PeoplePage.tsx.
- UI sections: frontend/features/people/components/PeopleSearchBar.tsx; frontend/features/people/components/PeopleResults.tsx; frontend/features/people/components/FriendRequests.tsx; frontend/features/people/components/PublicProfileCard.tsx.
- Logic: frontend/features/people/hooks/usePeoplePage.ts.
- Tests: frontend/features/people/people.page.test.tsx and frontend/features/people/hooks/usePeoplePage.test.ts.
- Consumes: people API từ F16 và getPublicUser từ F02; useQueryParamState.
- Hook contract: usePeoplePage(): PeoplePageViewModel with status, typed view data and on* handlers. Component props include only needed data/callbacks.
- States: Loading, search rỗng, không có kết quả, lời mời chờ, đã là bạn, lỗi.

### Task 1: Structure and presentation

- [ ] Step 1: Write failing component test: search term lives in URL and survives refresh; public card excludes private email/phone; assert semantic heading/labels, loading/empty/error view and keyboard focus.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/people/people.page.test.tsx; expect FAIL for missing screen.
- [ ] Step 3: Add route entry, page composition and JSX-only sections listed above; use shared primitives/tokens.
- [ ] Step 4: Rerun component test and frontend typecheck; expect PASS. Commit UI structure.

### Task 2: Hook and navigation

- [ ] Step 1: Write failing hook test: request/accept/decline show pending state; openDirectChat navigates unique conversation; mock the named adapter only, assert URL/navigation, request count and failure feedback.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/people/hooks/usePeoplePage.test.ts; expect FAIL.
- [ ] Step 3: Implement typed usePeoplePage, query invalidation and URL state; keep logic out of JSX. Do not copy contract types.
- [ ] Step 4: Rerun focused tests, lint/typecheck; expect PASS. Commit interaction.

### Task 3: Visual and accessibility gate

- [ ] Step 1: Add Playwright smoke for the route: viewport 360 and 1440 px, keyboard-only path, loading/error state, focus ring and zoom 200%; use isolated test account/API fixtures.
- [ ] Step 2: Run pnpm -C frontend exec playwright test e2e/people.spec.ts; expect PASS, no horizontal page overflow or covered action. Commit smoke.

## Done when

UI-13 matches states above, five Review Focus cases are covered by tests/smoke, and no business logic/API call lives in JSX.
