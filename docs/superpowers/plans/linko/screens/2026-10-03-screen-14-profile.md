# UI-14 — Hồ sơ của tôi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Xem và cập nhật tên, bio, avatar và ảnh nền với preview an toàn.

**Architecture:** Next App Router entry chỉ nối ProfilePage; page compose section, hook useProfilePage giữ logic và gọi adapter đã có. JSX component không gọi API.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript strict, Vitest/React Testing Library, Playwright.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), UI-14; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F02. **Route:** frontend/app/(app)/profile/page.tsx.

## Global Constraints

- AGENTS.md: route chỉ nối page; Page compose; JSX ở component, state/effect/handler ở hook, HTTP trong adapter; một exported component/file, <= khoảng 150 dòng, không any.
- Dùng token/Be Vietnam Pro/shared primitives từ F00; 360–1440 px, zoom 200%, keyboard/screen reader, WCAG 2.2 AA; action đủ hover/active/focus/disabled/loading.
- Data view có loading/empty/error; destructive action có xác nhận; filter/search/tab nằm trong URL. Không hard-code route/field/label lặp lại.

## Review Focus

1. Ảnh quá 10 MiB.
2. email/username trùng.
3. rớt mạng.
4. đổi avatar hai lần.
5. ảnh public lỗi.

## File ownership and interfaces

- Route: frontend/app/(app)/profile/page.tsx.
- Page: frontend/features/profile/pages/ProfilePage.tsx.
- UI sections: frontend/features/profile/components/ProfileHeader.tsx; frontend/features/profile/components/ProfileEditForm.tsx; frontend/features/profile/components/ProfileImagePicker.tsx.
- Logic: frontend/features/profile/hooks/useProfilePage.ts.
- Tests: frontend/features/profile/profile.page.test.tsx and frontend/features/profile/hooks/useProfilePage.test.ts.
- Consumes: getMine/updateMine adapter từ F02.
- Hook contract: useProfilePage(): ProfilePageViewModel with status, typed view data and on* handlers. Component props include only needed data/callbacks.
- States: Loading, lỗi, đang sửa, ảnh preview, đang lưu, conflict, thành công.

### Task 1: Structure and presentation

- [ ] Step 1: Write failing component test: displayName/bio/avatar/background show correctly; file input has label and error; assert semantic heading/labels, loading/empty/error view and keyboard focus.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/profile/profile.page.test.tsx; expect FAIL for missing screen.
- [ ] Step 3: Add route entry, page composition and JSX-only sections listed above; use shared primitives/tokens.
- [ ] Step 4: Rerun component test and frontend typecheck; expect PASS. Commit UI structure.

### Task 2: Hook and navigation

- [ ] Step 1: Write failing hook test: save updates query cache; conflict maps to field; failed upload preserves text and revokes blob preview URL; mock the named adapter only, assert URL/navigation, request count and failure feedback.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/profile/hooks/useProfilePage.test.ts; expect FAIL.
- [ ] Step 3: Implement typed useProfilePage, query invalidation and URL state; keep logic out of JSX. Do not copy contract types.
- [ ] Step 4: Rerun focused tests, lint/typecheck; expect PASS. Commit interaction.

### Task 3: Visual and accessibility gate

- [ ] Step 1: Add Playwright smoke for the route: viewport 360 and 1440 px, keyboard-only path, loading/error state, focus ring and zoom 200%; use isolated test account/API fixtures.
- [ ] Step 2: Run pnpm -C frontend exec playwright test e2e/profile.spec.ts; expect PASS, no horizontal page overflow or covered action. Commit smoke.

## Done when

UI-14 matches states above, five Review Focus cases are covered by tests/smoke, and no business logic/API call lives in JSX.
