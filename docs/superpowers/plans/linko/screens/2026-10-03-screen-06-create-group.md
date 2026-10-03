# UI-06 — Tạo nhóm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Tạo nhóm một mình, ảnh tùy chọn và dẫn tới mời thành viên.

**Architecture:** Next App Router entry chỉ nối CreateGroupPage; page compose các section; hook useCreateGroupPage giữ logic và gọi adapter đã có. JSX component không gọi API.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript strict, Vitest/React Testing Library, Playwright.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), UI-06; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F00, F03. **Route:** frontend/app/(app)/groups/new/page.tsx.

## Global Constraints

- AGENTS.md: route file chỉ import page; Page chỉ compose, component JSX-only, state/effect/handler ở hook, HTTP trong adapter; một exported component/file, <= khoảng 150 dòng, không any.
- Dùng token/Be Vietnam Pro/shared primitives từ F00; 360–1440 px, zoom 200%, keyboard/screen reader, WCAG 2.2 AA; tất cả action có hover/active/focus/disabled/loading.
- Data view có loading/empty/error; destructive action có xác nhận; filter/search/tab nằm trong URL. Không hard-code route/field/label lặp lại.

## Review Focus

1. Tên trắng.
2. ảnh quá 10 MiB.
3. mạng rớt.
4. 101st group.
5. quay lại với form đã nhập.

## File ownership and interfaces

- Route: frontend/app/(app)/groups/new/page.tsx.
- Page: frontend/features/groups/pages/CreateGroupPage.tsx.
- UI sections: frontend/features/groups/components/CreateGroupForm.tsx; frontend/features/groups/components/GroupAvatarPicker.tsx.
- Logic: frontend/features/groups/hooks/useCreateGroupPage.ts.
- Tests: frontend/features/groups/create-group.page.test.tsx and frontend/features/groups/hooks/useCreateGroupPage.test.ts.
- Consumes: createGroup() từ groups adapter.
- Hook contract: useCreateGroupPage(): CreateGroupPageViewModel with status, typed view data and on* handlers. Component props include only view data/callbacks.
- States: Form ban đầu, chọn ảnh, validation, đang gửi, upload lỗi, thành công.

### Task 1: Structure and presentation

- [ ] Step 1: Write failing component test: name whitespace/81 chars and description 501 chars show errors; valid name works without members; assert semantic heading/labels, loading/empty/error view and keyboard focus.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/groups/create-group.page.test.tsx; expect FAIL for missing screen.
- [ ] Step 3: Add route entry, page composition and focused JSX-only sections listed above; use shared primitives/tokens and no inline API/state.
- [ ] Step 4: Rerun component test and frontend typecheck; expect PASS. Commit UI structure.

### Task 2: Hook and navigation

- [ ] Step 1: Write failing hook test: 201 redirects /groups/:id/invitations with creation success; failed upload keeps form values; double click creates once; mock the named adapter only, assert URL/navigation, request count and failure feedback.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/groups/hooks/useCreateGroupPage.test.ts; expect FAIL.
- [ ] Step 3: Implement typed useCreateGroupPage, query invalidation and URL state; keep logic out of JSX. Do not copy contract types.
- [ ] Step 4: Rerun both focused tests, lint/typecheck; expect PASS. Commit interaction.

### Task 3: Visual and accessibility gate

- [ ] Step 1: Add Playwright smoke for frontend/app/(app)/groups/new/page.tsx: viewport 360 and 1440 px, keyboard-only path, loading/error state, focus ring and zoom 200%; use isolated test account/API fixtures.
- [ ] Step 2: Run pnpm -C frontend exec playwright test e2e/create-group.spec.ts; expect PASS, no horizontal page overflow or covered action. Commit smoke.

## Done when

UI-06 matches the named states, five Review Focus cases are covered by tests or smoke, and no business logic/API call lives in a JSX file.
