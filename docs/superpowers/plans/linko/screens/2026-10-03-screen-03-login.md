# UI-03 — Đăng nhập Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Đăng nhập và khôi phục phiên mà không lộ token ra UI/storage lâu dài.

**Architecture:** Next App Router entry chỉ nối LoginPage; page compose các section; hook useLoginPage giữ logic và gọi adapter đã có. JSX component không gọi API.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript strict, Vitest/React Testing Library, Playwright.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), UI-03; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F00, F01. **Route:** frontend/app/login/page.tsx.

## Global Constraints

- AGENTS.md: route file chỉ import page; Page chỉ compose, component JSX-only, state/effect/handler ở hook, HTTP trong adapter; một exported component/file, <= khoảng 150 dòng, không any.
- Dùng token/Be Vietnam Pro/shared primitives từ F00; 360–1440 px, zoom 200%, keyboard/screen reader, WCAG 2.2 AA; tất cả action có hover/active/focus/disabled/loading.
- Data view có loading/empty/error; destructive action có xác nhận; filter/search/tab nằm trong URL. Không hard-code route/field/label lặp lại.

## Review Focus

1. Refresh cookie mất.
2. redirect URL ngoài domain.
3. 401 lặp.
4. nhiều tabs.
5. phím Enter khi loading.

## File ownership and interfaces

- Route: frontend/app/login/page.tsx.
- Page: frontend/features/auth/pages/LoginPage.tsx.
- UI sections: frontend/features/auth/components/LoginForm.tsx; frontend/features/auth/components/SessionError.tsx.
- Logic: frontend/features/auth/hooks/useLoginPage.ts.
- Tests: frontend/features/auth/login.page.test.tsx and frontend/features/auth/hooks/useLoginPage.test.ts.
- Consumes: login(), refreshSession() từ auth adapter.
- Hook contract: useLoginPage(): LoginPageViewModel with status, typed view data and on* handlers. Component props include only view data/callbacks.
- States: Idle, đang gửi, sai thông tin, lỗi mạng, phiên hết hạn, thành công.

### Task 1: Structure and presentation

- [ ] Step 1: Write failing component test: wrong credentials show safe message; loading blocks double-submit; password has visible label; assert semantic heading/labels, loading/empty/error view and keyboard focus.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/auth/login.page.test.tsx; expect FAIL for missing screen.
- [ ] Step 3: Add route entry, page composition and focused JSX-only sections listed above; use shared primitives/tokens and no inline API/state.
- [ ] Step 4: Rerun component test and frontend typecheck; expect PASS. Commit UI structure.

### Task 2: Hook and navigation

- [ ] Step 1: Write failing hook test: success redirects intended protected route or /inbox; expired refresh clears session and stays /login; mock the named adapter only, assert URL/navigation, request count and failure feedback.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/auth/hooks/useLoginPage.test.ts; expect FAIL.
- [ ] Step 3: Implement typed useLoginPage, query invalidation and URL state; keep logic out of JSX. Do not copy contract types.
- [ ] Step 4: Rerun both focused tests, lint/typecheck; expect PASS. Commit interaction.

### Task 3: Visual and accessibility gate

- [ ] Step 1: Add Playwright smoke for frontend/app/login/page.tsx: viewport 360 and 1440 px, keyboard-only path, loading/error state, focus ring and zoom 200%; use isolated test account/API fixtures.
- [ ] Step 2: Run pnpm -C frontend exec playwright test e2e/login.spec.ts; expect PASS, no horizontal page overflow or covered action. Commit smoke.

## Done when

UI-03 matches the named states, five Review Focus cases are covered by tests or smoke, and no business logic/API call lives in a JSX file.
