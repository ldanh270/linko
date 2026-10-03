# UI-01 — Chào mừng Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Giới thiệu Linko và dẫn rõ tới đăng ký/đăng nhập.

**Architecture:** Next App Router entry chỉ nối WelcomePage; page compose các section; hook useWelcomePage giữ logic và gọi adapter đã có. JSX component không gọi API.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript strict, Vitest/React Testing Library, Playwright.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), UI-01; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F00. **Route:** frontend/app/page.tsx.

## Global Constraints

- AGENTS.md: route file chỉ import page; Page chỉ compose, component JSX-only, state/effect/handler ở hook, HTTP trong adapter; một exported component/file, <= khoảng 150 dòng, không any.
- Dùng token/Be Vietnam Pro/shared primitives từ F00; 360–1440 px, zoom 200%, keyboard/screen reader, WCAG 2.2 AA; tất cả action có hover/active/focus/disabled/loading.
- Data view có loading/empty/error; destructive action có xác nhận; filter/search/tab nằm trong URL. Không hard-code route/field/label lặp lại.

## Review Focus

1. Viewport 360.
2. zoom 200%.
3. không có ảnh.
4. người đã đăng nhập.
5. lỗi tải font.

## File ownership and interfaces

- Route: frontend/app/page.tsx.
- Page: frontend/features/welcome/pages/WelcomePage.tsx.
- UI sections: frontend/features/welcome/components/WelcomeHero.tsx; frontend/features/welcome/components/WelcomeActions.tsx.
- Logic: frontend/features/welcome/hooks/useWelcomePage.ts.
- Tests: frontend/features/welcome/welcome.page.test.tsx and frontend/features/welcome/hooks/useWelcomePage.test.ts.
- Consumes: shared Button/Link, auth status từ F01 khi đã có; ở bước này chỉ render link.
- Hook contract: useWelcomePage(): WelcomePageViewModel with status, typed view data and on* handlers. Component props include only view data/callbacks.
- States: Khách thấy tên Linko, một câu giá trị và hai CTA; người đã đăng nhập được chuyển inbox sau F01.

### Task 1: Structure and presentation

- [ ] Step 1: Write failing component test: renders heading Linko and exactly two named actions; keyboard focus reaches both; assert semantic heading/labels, loading/empty/error view and keyboard focus.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/welcome/welcome.page.test.tsx; expect FAIL for missing screen.
- [ ] Step 3: Add route entry, page composition and focused JSX-only sections listed above; use shared primitives/tokens and no inline API/state.
- [ ] Step 4: Rerun component test and frontend typecheck; expect PASS. Commit UI structure.

### Task 2: Hook and navigation

- [ ] Step 1: Write failing hook test: CTA routes /signup and /login; session redirect added by F01 without flash of protected data; mock the named adapter only, assert URL/navigation, request count and failure feedback.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/welcome/hooks/useWelcomePage.test.ts; expect FAIL.
- [ ] Step 3: Implement typed useWelcomePage, query invalidation and URL state; keep logic out of JSX. Do not copy contract types.
- [ ] Step 4: Rerun both focused tests, lint/typecheck; expect PASS. Commit interaction.

### Task 3: Visual and accessibility gate

- [ ] Step 1: Add Playwright smoke for frontend/app/page.tsx: viewport 360 and 1440 px, keyboard-only path, loading/error state, focus ring and zoom 200%; use isolated test account/API fixtures.
- [ ] Step 2: Run pnpm -C frontend exec playwright test e2e/welcome.spec.ts; expect PASS, no horizontal page overflow or covered action. Commit smoke.

## Done when

UI-01 matches the named states, five Review Focus cases are covered by tests or smoke, and no business logic/API call lives in a JSX file.
