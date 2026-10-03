# UI-11 — Quản lý nhóm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Chỉnh thông tin và thành viên theo vai trò, chuyển owner và đóng nhóm an toàn.

**Architecture:** Next App Router entry chỉ nối GroupManagePage; page compose section, hook useGroupManagePage giữ logic và gọi adapter đã có. JSX component không gọi API.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript strict, Vitest/React Testing Library, Playwright.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), UI-11; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F03, F06, F15. **Route:** frontend/app/(app)/groups/[conversationId]/manage/page.tsx.

## Global Constraints

- AGENTS.md: route chỉ nối page; Page compose; JSX ở component, state/effect/handler ở hook, HTTP trong adapter; một exported component/file, <= khoảng 150 dòng, không any.
- Dùng token/Be Vietnam Pro/shared primitives từ F00; 360–1440 px, zoom 200%, keyboard/screen reader, WCAG 2.2 AA; action đủ hover/active/focus/disabled/loading.
- Data view có loading/empty/error; destructive action có xác nhận; filter/search/tab nằm trong URL. Không hard-code route/field/label lặp lại.

## Review Focus

1. Admin cố sửa owner.
2. owner tự rời.
3. nhóm bị đóng ở tab khác.
4. avatar upload lỗi.
5. 100 thành viên.

## File ownership and interfaces

- Route: frontend/app/(app)/groups/[conversationId]/manage/page.tsx.
- Page: frontend/features/groups/pages/GroupManagePage.tsx.
- UI sections: frontend/features/groups/components/GroupDetailsForm.tsx; frontend/features/groups/components/MemberRoleList.tsx; frontend/features/groups/components/TransferOwnerDialog.tsx; frontend/features/groups/components/CloseGroupDialog.tsx.
- Logic: frontend/features/groups/hooks/useGroupManagePage.ts.
- Tests: frontend/features/groups/group-manage.page.test.tsx and frontend/features/groups/hooks/useGroupManagePage.test.ts.
- Consumes: groups/membership/groupLifecycle adapters.
- Hook contract: useGroupManagePage(): GroupManagePageViewModel with status, typed view data and on* handlers. Component props include only needed data/callbacks.
- States: Loading, lỗi, owner, admin, member bị cấm, đang lưu, xác nhận hành động.

### Task 1: Structure and presentation

- [ ] Step 1: Write failing component test: owner/admin see only allowed controls; destructive dialogs are separate components and require confirmation; assert semantic heading/labels, loading/empty/error view and keyboard focus.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/groups/group-manage.page.test.tsx; expect FAIL for missing screen.
- [ ] Step 3: Add route entry, page composition and JSX-only sections listed above; use shared primitives/tokens.
- [ ] Step 4: Rerun component test and frontend typecheck; expect PASS. Commit UI structure.

### Task 2: Hook and navigation

- [ ] Step 1: Write failing hook test: role change/revoke updates list; owner transfer redirects/reloads role; close group disabled while pending; mock the named adapter only, assert URL/navigation, request count and failure feedback.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/groups/hooks/useGroupManagePage.test.ts; expect FAIL.
- [ ] Step 3: Implement typed useGroupManagePage, query invalidation and URL state; keep logic out of JSX. Do not copy contract types.
- [ ] Step 4: Rerun focused tests, lint/typecheck; expect PASS. Commit interaction.

### Task 3: Visual and accessibility gate

- [ ] Step 1: Add Playwright smoke for the route: viewport 360 and 1440 px, keyboard-only path, loading/error state, focus ring and zoom 200%; use isolated test account/API fixtures.
- [ ] Step 2: Run pnpm -C frontend exec playwright test e2e/group-manage.spec.ts; expect PASS, no horizontal page overflow or covered action. Commit smoke.

## Done when

UI-11 matches states above, five Review Focus cases are covered by tests/smoke, and no business logic/API call lives in JSX.
