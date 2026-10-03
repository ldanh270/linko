# UI-09 — Phòng chat riêng Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Dùng chat shell chung cho DIRECT và hiển thị đúng quy tắc bạn bè.

**Architecture:** Next App Router entry chỉ nối DirectChatPage; page compose section, hook useDirectChatPage giữ logic và gọi adapter đã có. JSX component không gọi API.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript strict, Vitest/React Testing Library, Playwright.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), UI-09; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F08, F09, F10, F11, F12, F16, UI-08. **Route:** frontend/app/(app)/direct/[conversationId]/page.tsx.

## Global Constraints

- AGENTS.md: route chỉ nối page; Page compose; JSX ở component, state/effect/handler ở hook, HTTP trong adapter; một exported component/file, <= khoảng 150 dòng, không any.
- Dùng token/Be Vietnam Pro/shared primitives từ F00; 360–1440 px, zoom 200%, keyboard/screen reader, WCAG 2.2 AA; action đủ hover/active/focus/disabled/loading.
- Data view có loading/empty/error; destructive action có xác nhận; filter/search/tab nằm trong URL. Không hard-code route/field/label lặp lại.

## Review Focus

1. Hủy bạn khi đang mở.
2. trùng DIRECT.
3. người kia đổi tên.
4. lỗi network.
5. URL chat không thuộc mình.

## File ownership and interfaces

- Route: frontend/app/(app)/direct/[conversationId]/page.tsx.
- Page: frontend/features/chat/pages/DirectChatPage.tsx.
- UI sections: frontend/features/chat/components/DirectChatHeader.tsx; frontend/features/chat/components/FriendshipNotice.tsx.
- Logic: frontend/features/chat/hooks/useDirectChatPage.ts.
- Tests: frontend/features/chat/direct-chat.page.test.tsx and frontend/features/chat/hooks/useDirectChatPage.test.ts.
- Consumes: chat hook/shared timeline từ UI-08; people API từ F16.
- Hook contract: useDirectChatPage(): DirectChatPageViewModel with status, typed view data and on* handlers. Component props include only needed data/callbacks.
- States: Loading, chat trống, lỗi, đang gửi, offline, đã hủy bạn.

### Task 1: Structure and presentation

- [ ] Step 1: Write failing component test: renders other person's name/avatar and shared composer without group controls; assert semantic heading/labels, loading/empty/error view and keyboard focus.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/chat/direct-chat.page.test.tsx; expect FAIL for missing screen.
- [ ] Step 3: Add route entry, page composition and JSX-only sections listed above; use shared primitives/tokens.
- [ ] Step 4: Rerun component test and frontend typecheck; expect PASS. Commit UI structure.

### Task 2: Hook and navigation

- [ ] Step 1: Write failing hook test: unfriend state disables send and explains why; conversationId send cannot bypass backend friendship check; mock the named adapter only, assert URL/navigation, request count and failure feedback.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/chat/hooks/useDirectChatPage.test.ts; expect FAIL.
- [ ] Step 3: Implement typed useDirectChatPage, query invalidation and URL state; keep logic out of JSX. Do not copy contract types.
- [ ] Step 4: Rerun focused tests, lint/typecheck; expect PASS. Commit interaction.

### Task 3: Visual and accessibility gate

- [ ] Step 1: Add Playwright smoke for the route: viewport 360 and 1440 px, keyboard-only path, loading/error state, focus ring and zoom 200%; use isolated test account/API fixtures.
- [ ] Step 2: Run pnpm -C frontend exec playwright test e2e/direct-chat.spec.ts; expect PASS, no horizontal page overflow or covered action. Commit smoke.

## Done when

UI-09 matches states above, five Review Focus cases are covered by tests/smoke, and no business logic/API call lives in JSX.
