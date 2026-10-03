# UI-04 — Hộp thư Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Hiển thị hội thoại theo hoạt động mới nhất và bộ lọc URL.

**Architecture:** Next App Router entry chỉ nối InboxPage; page compose các section; hook useInboxPage giữ logic và gọi adapter đã có. JSX component không gọi API.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript strict, Vitest/React Testing Library, Playwright.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), UI-04; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F00, F07, F12. **Route:** frontend/app/(app)/inbox/page.tsx.

## Global Constraints

- AGENTS.md: route file chỉ import page; Page chỉ compose, component JSX-only, state/effect/handler ở hook, HTTP trong adapter; một exported component/file, <= khoảng 150 dòng, không any.
- Dùng token/Be Vietnam Pro/shared primitives từ F00; 360–1440 px, zoom 200%, keyboard/screen reader, WCAG 2.2 AA; tất cả action có hover/active/focus/disabled/loading.
- Data view có loading/empty/error; destructive action có xác nhận; filter/search/tab nằm trong URL. Không hard-code route/field/label lặp lại.

## Review Focus

1. LastMessage trước joinedAt.
2. nhiều tin cùng thời gian.
3. filter rỗng.
4. 360 px.
5. refresh khi URL invalid.

## File ownership and interfaces

- Route: frontend/app/(app)/inbox/page.tsx.
- Page: frontend/features/inbox/pages/InboxPage.tsx.
- UI sections: frontend/features/inbox/components/InboxFilterBar.tsx; frontend/features/inbox/components/ConversationList.tsx; frontend/features/inbox/components/ConversationRow.tsx.
- Logic: frontend/features/inbox/hooks/useInboxPage.ts.
- Tests: frontend/features/inbox/inbox.page.test.tsx and frontend/features/inbox/hooks/useInboxPage.test.ts.
- Consumes: listInbox() và markConversationRead() adapters; useQueryParamState().
- Hook contract: useInboxPage(): InboxPageViewModel with status, typed view data and on* handlers. Component props include only view data/callbacks.
- States: Loading, chưa có hội thoại, lỗi có retry, danh sách, không có kết quả bộ lọc.

### Task 1: Structure and presentation

- [ ] Step 1: Write failing component test: kind=group/direct/all persists in URL and back button; invalid kind falls back all; assert semantic heading/labels, loading/empty/error view and keyboard focus.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/inbox/inbox.page.test.tsx; expect FAIL for missing screen.
- [ ] Step 3: Add route entry, page composition and focused JSX-only sections listed above; use shared primitives/tokens and no inline API/state.
- [ ] Step 4: Rerun component test and frontend typecheck; expect PASS. Commit UI structure.

### Task 2: Hook and navigation

- [ ] Step 1: Write failing hook test: row shows title, safe preview, time, unread; selection navigates đúng group/direct route; cursor loads next page once; mock the named adapter only, assert URL/navigation, request count and failure feedback.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/inbox/hooks/useInboxPage.test.ts; expect FAIL.
- [ ] Step 3: Implement typed useInboxPage, query invalidation and URL state; keep logic out of JSX. Do not copy contract types.
- [ ] Step 4: Rerun both focused tests, lint/typecheck; expect PASS. Commit interaction.

### Task 3: Visual and accessibility gate

- [ ] Step 1: Add Playwright smoke for frontend/app/(app)/inbox/page.tsx: viewport 360 and 1440 px, keyboard-only path, loading/error state, focus ring and zoom 200%; use isolated test account/API fixtures.
- [ ] Step 2: Run pnpm -C frontend exec playwright test e2e/inbox.spec.ts; expect PASS, no horizontal page overflow or covered action. Commit smoke.

## Done when

UI-04 matches the named states, five Review Focus cases are covered by tests or smoke, and no business logic/API call lives in a JSX file.
