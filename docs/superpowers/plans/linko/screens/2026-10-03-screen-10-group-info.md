# UI-10 — Thông tin nhóm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Hiện mô tả, thành viên, tin ghim, tùy chọn mute và đường tới quản trị.

**Architecture:** Next App Router entry chỉ nối GroupInfoPage; page compose section, hook useGroupInfoPage giữ logic và gọi adapter đã có. JSX component không gọi API.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript strict, Vitest/React Testing Library, Playwright.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), UI-10; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F06, F13, F14, F15. **Route:** frontend/app/(app)/groups/[conversationId]/info/page.tsx.

## Global Constraints

- AGENTS.md: route chỉ nối page; Page compose; JSX ở component, state/effect/handler ở hook, HTTP trong adapter; một exported component/file, <= khoảng 150 dòng, không any.
- Dùng token/Be Vietnam Pro/shared primitives từ F00; 360–1440 px, zoom 200%, keyboard/screen reader, WCAG 2.2 AA; action đủ hover/active/focus/disabled/loading.
- Data view có loading/empty/error; destructive action có xác nhận; filter/search/tab nằm trong URL. Không hard-code route/field/label lặp lại.

## Review Focus

1. Nhóm đóng.
2. member bị loại.
3. pin cũ.
4. 100 thành viên.
5. mute API lỗi.

## File ownership and interfaces

- Route: frontend/app/(app)/groups/[conversationId]/info/page.tsx.
- Page: frontend/features/groups/pages/GroupInfoPage.tsx.
- UI sections: frontend/features/groups/components/GroupSummary.tsx; frontend/features/groups/components/MemberPreview.tsx; frontend/features/groups/components/PinnedMessages.tsx; frontend/features/groups/components/NotificationToggle.tsx.
- Logic: frontend/features/groups/hooks/useGroupInfoPage.ts.
- Tests: frontend/features/groups/group-info.page.test.tsx and frontend/features/groups/hooks/useGroupInfoPage.test.ts.
- Consumes: membership/pins/notification/groupLifecycle adapters.
- Hook contract: useGroupInfoPage(): GroupInfoPageViewModel with status, typed view data and on* handlers. Component props include only needed data/callbacks.
- States: Loading, không có tin ghim, lỗi, đủ quyền quản trị, member thường, mất quyền.

### Task 1: Structure and presentation

- [ ] Step 1: Write failing component test: member sees summary/list/pins; manage action only owner/admin; pre-join pin hidden; assert semantic heading/labels, loading/empty/error view and keyboard focus.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/groups/group-info.page.test.tsx; expect FAIL for missing screen.
- [ ] Step 3: Add route entry, page composition and JSX-only sections listed above; use shared primitives/tokens.
- [ ] Step 4: Rerun component test and frontend typecheck; expect PASS. Commit UI structure.

### Task 2: Hook and navigation

- [ ] Step 1: Write failing hook test: mute toggle updates only self; leave requires confirmation; admin link uses correct route; mock the named adapter only, assert URL/navigation, request count and failure feedback.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/groups/hooks/useGroupInfoPage.test.ts; expect FAIL.
- [ ] Step 3: Implement typed useGroupInfoPage, query invalidation and URL state; keep logic out of JSX. Do not copy contract types.
- [ ] Step 4: Rerun focused tests, lint/typecheck; expect PASS. Commit interaction.

### Task 3: Visual and accessibility gate

- [ ] Step 1: Add Playwright smoke for the route: viewport 360 and 1440 px, keyboard-only path, loading/error state, focus ring and zoom 200%; use isolated test account/API fixtures.
- [ ] Step 2: Run pnpm -C frontend exec playwright test e2e/group-info.spec.ts; expect PASS, no horizontal page overflow or covered action. Commit smoke.

## Done when

UI-10 matches states above, five Review Focus cases are covered by tests/smoke, and no business logic/API call lives in JSX.
