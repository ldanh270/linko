# UI-07 — Xem trước lời mời Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Hiển thị thông tin nhóm an toàn, đăng nhập và xác nhận tham gia.

**Architecture:** Next App Router entry chỉ nối InvitePreviewPage; page compose các section; hook useInvitePreviewPage giữ logic và gọi adapter đã có. JSX component không gọi API.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript strict, Vitest/React Testing Library, Playwright.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), UI-07; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F00, F05. **Route:** frontend/app/invite/[token]/page.tsx.

## Global Constraints

- AGENTS.md: route file chỉ import page; Page chỉ compose, component JSX-only, state/effect/handler ở hook, HTTP trong adapter; một exported component/file, <= khoảng 150 dòng, không any.
- Dùng token/Be Vietnam Pro/shared primitives từ F00; 360–1440 px, zoom 200%, keyboard/screen reader, WCAG 2.2 AA; tất cả action có hover/active/focus/disabled/loading.
- Data view có loading/empty/error; destructive action có xác nhận; filter/search/tab nằm trong URL. Không hard-code route/field/label lặp lại.

## Review Focus

1. Token sai.
2. revoke giữa preview/accept.
3. tab mới sau login.
4. user đã vào nhóm.
5. URL bị chia sẻ.

## File ownership and interfaces

- Route: frontend/app/invite/[token]/page.tsx.
- Page: frontend/features/invitations/pages/InvitePreviewPage.tsx.
- UI sections: frontend/features/invitations/components/InvitePreviewCard.tsx; frontend/features/invitations/components/InviteStatus.tsx.
- Logic: frontend/features/invitations/hooks/useInvitePreviewPage.ts.
- Tests: frontend/features/invitations/invite-preview.page.test.tsx and frontend/features/invitations/hooks/useInvitePreviewPage.test.ts.
- Consumes: previewInvitation(), acceptInvitation() adapters; token chỉ ở route, không storage.
- Hook contract: useInvitePreviewPage(): InvitePreviewPageViewModel with status, typed view data and on* handlers. Component props include only view data/callbacks.
- States: Loading, hợp lệ, cần login, đã là thành viên, hết hạn/hết lượt/thu hồi, đang tham gia, thành công.

### Task 1: Structure and presentation

- [ ] Step 1: Write failing component test: preview contains name/avatar/description/member count and history rule, no member list; assert semantic heading/labels, loading/empty/error view and keyboard focus.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/invitations/invite-preview.page.test.tsx; expect FAIL for missing screen.
- [ ] Step 3: Add route entry, page composition and focused JSX-only sections listed above; use shared primitives/tokens and no inline API/state.
- [ ] Step 4: Rerun component test and frontend typecheck; expect PASS. Commit UI structure.

### Task 2: Hook and navigation

- [ ] Step 1: Write failing hook test: guest login returns to same invite; click once accepts once; 410 shows expired state; 409 full shows full state; mock the named adapter only, assert URL/navigation, request count and failure feedback.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/invitations/hooks/useInvitePreviewPage.test.ts; expect FAIL.
- [ ] Step 3: Implement typed useInvitePreviewPage, query invalidation and URL state; keep logic out of JSX. Do not copy contract types.
- [ ] Step 4: Rerun both focused tests, lint/typecheck; expect PASS. Commit interaction.

### Task 3: Visual and accessibility gate

- [ ] Step 1: Add Playwright smoke for frontend/app/invite/[token]/page.tsx: viewport 360 and 1440 px, keyboard-only path, loading/error state, focus ring and zoom 200%; use isolated test account/API fixtures.
- [ ] Step 2: Run pnpm -C frontend exec playwright test e2e/invite-preview.spec.ts; expect PASS, no horizontal page overflow or covered action. Commit smoke.

## Done when

UI-07 matches the named states, five Review Focus cases are covered by tests or smoke, and no business logic/API call lives in a JSX file.
