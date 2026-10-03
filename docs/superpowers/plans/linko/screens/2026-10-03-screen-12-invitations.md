# UI-12 — Quản lý lời mời Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Tạo, sao chép link một lần và thu hồi lời mời hiện có.

**Architecture:** Next App Router entry chỉ nối InvitationsPage; page compose section, hook useInvitationsPage giữ logic và gọi adapter đã có. JSX component không gọi API.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript strict, Vitest/React Testing Library, Playwright.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), UI-12; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F04, F06. **Route:** frontend/app/(app)/groups/[conversationId]/invitations/page.tsx.

## Global Constraints

- AGENTS.md: route chỉ nối page; Page compose; JSX ở component, state/effect/handler ở hook, HTTP trong adapter; một exported component/file, <= khoảng 150 dòng, không any.
- Dùng token/Be Vietnam Pro/shared primitives từ F00; 360–1440 px, zoom 200%, keyboard/screen reader, WCAG 2.2 AA; action đủ hover/active/focus/disabled/loading.
- Data view có loading/empty/error; destructive action có xác nhận; filter/search/tab nằm trong URL. Không hard-code route/field/label lặp lại.

## Review Focus

1. Mất link sau khi đóng màn.
2. Clipboard API bị từ chối.
3. link hết hạn.
4. revoke khi người khác đang join.
5. admin mất quyền.

## File ownership and interfaces

- Route: frontend/app/(app)/groups/[conversationId]/invitations/page.tsx.
- Page: frontend/features/invitations/pages/InvitationsPage.tsx.
- UI sections: frontend/features/invitations/components/IssueInvitationPanel.tsx; frontend/features/invitations/components/InvitationList.tsx; frontend/features/invitations/components/RevokeInvitationDialog.tsx.
- Logic: frontend/features/invitations/hooks/useInvitationsPage.ts.
- Tests: frontend/features/invitations/invitations.page.test.tsx and frontend/features/invitations/hooks/useInvitationsPage.test.ts.
- Consumes: issueInvitation/listInvitations/revokeInvitation adapters.
- Hook contract: useInvitationsPage(): InvitationsPageViewModel with status, typed view data and on* handlers. Component props include only needed data/callbacks.
- States: Loading, chưa có lời mời, đang tạo, link vừa tạo, copy thất bại, đã thu hồi, không có quyền.

### Task 1: Structure and presentation

- [ ] Step 1: Write failing component test: new URL visible/copyable only after creation; list shows metadata but never raw token; assert semantic heading/labels, loading/empty/error view and keyboard focus.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/invitations/invitations.page.test.tsx; expect FAIL for missing screen.
- [ ] Step 3: Add route entry, page composition and JSX-only sections listed above; use shared primitives/tokens.
- [ ] Step 4: Rerun component test and frontend typecheck; expect PASS. Commit UI structure.

### Task 2: Hook and navigation

- [ ] Step 1: Write failing hook test: copy uses clipboard and feedback; revoke confirmation; member without role cannot issue; mock the named adapter only, assert URL/navigation, request count and failure feedback.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/invitations/hooks/useInvitationsPage.test.ts; expect FAIL.
- [ ] Step 3: Implement typed useInvitationsPage, query invalidation and URL state; keep logic out of JSX. Do not copy contract types.
- [ ] Step 4: Rerun focused tests, lint/typecheck; expect PASS. Commit interaction.

### Task 3: Visual and accessibility gate

- [ ] Step 1: Add Playwright smoke for the route: viewport 360 and 1440 px, keyboard-only path, loading/error state, focus ring and zoom 200%; use isolated test account/API fixtures.
- [ ] Step 2: Run pnpm -C frontend exec playwright test e2e/invitations.spec.ts; expect PASS, no horizontal page overflow or covered action. Commit smoke.

## Done when

UI-12 matches states above, five Review Focus cases are covered by tests/smoke, and no business logic/API call lives in JSX.
