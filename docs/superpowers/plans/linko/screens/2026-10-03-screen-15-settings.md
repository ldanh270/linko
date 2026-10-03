# UI-15 — Cài đặt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Đổi theme và đăng xuất trong một màn dễ hiểu; các tùy chọn nhóm nằm ở thông tin nhóm.

**Architecture:** Next App Router entry chỉ nối SettingsPage; page compose section, hook useSettingsPage giữ logic và gọi adapter đã có. JSX component không gọi API.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript strict, Vitest/React Testing Library, Playwright.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), UI-15; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F00, F01. **Route:** frontend/app/(app)/settings/page.tsx.

## Global Constraints

- AGENTS.md: route chỉ nối page; Page compose; JSX ở component, state/effect/handler ở hook, HTTP trong adapter; một exported component/file, <= khoảng 150 dòng, không any.
- Dùng token/Be Vietnam Pro/shared primitives từ F00; 360–1440 px, zoom 200%, keyboard/screen reader, WCAG 2.2 AA; action đủ hover/active/focus/disabled/loading.
- Data view có loading/empty/error; destructive action có xác nhận; filter/search/tab nằm trong URL. Không hard-code route/field/label lặp lại.

## Review Focus

1. System theme đổi lúc mở app.
2. local preference hỏng.
3. logout network fail.
4. 200% zoom.
5. không để lộ token.

## File ownership and interfaces

- Route: frontend/app/(app)/settings/page.tsx.
- Page: frontend/features/settings/pages/SettingsPage.tsx.
- UI sections: frontend/features/settings/components/ThemeSelector.tsx; frontend/features/settings/components/AccountActions.tsx; frontend/features/settings/components/LogoutDialog.tsx.
- Logic: frontend/features/settings/hooks/useSettingsPage.ts.
- Tests: frontend/features/settings/settings.page.test.tsx and frontend/features/settings/hooks/useSettingsPage.test.ts.
- Consumes: theme provider từ F00 và logout từ F01.
- Hook contract: useSettingsPage(): SettingsPageViewModel with status, typed view data and on* handlers. Component props include only needed data/callbacks.
- States: Light/dark/system, đang đăng xuất, lỗi, thành công.

### Task 1: Structure and presentation

- [ ] Step 1: Write failing component test: theme selection applies tokens, persists preference and respects system option; assert semantic heading/labels, loading/empty/error view and keyboard focus.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/settings/settings.page.test.tsx; expect FAIL for missing screen.
- [ ] Step 3: Add route entry, page composition and JSX-only sections listed above; use shared primitives/tokens.
- [ ] Step 4: Rerun component test and frontend typecheck; expect PASS. Commit UI structure.

### Task 2: Hook and navigation

- [ ] Step 1: Write failing hook test: logout requires confirmation, invalidates session and navigates /login even if server says already expired; mock the named adapter only, assert URL/navigation, request count and failure feedback.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/settings/hooks/useSettingsPage.test.ts; expect FAIL.
- [ ] Step 3: Implement typed useSettingsPage, query invalidation and URL state; keep logic out of JSX. Do not copy contract types.
- [ ] Step 4: Rerun focused tests, lint/typecheck; expect PASS. Commit interaction.

### Task 3: Visual and accessibility gate

- [ ] Step 1: Add Playwright smoke for the route: viewport 360 and 1440 px, keyboard-only path, loading/error state, focus ring and zoom 200%; use isolated test account/API fixtures.
- [ ] Step 2: Run pnpm -C frontend exec playwright test e2e/settings.spec.ts; expect PASS, no horizontal page overflow or covered action. Commit smoke.

## Done when

UI-15 matches states above, five Review Focus cases are covered by tests/smoke, and no business logic/API call lives in JSX.
