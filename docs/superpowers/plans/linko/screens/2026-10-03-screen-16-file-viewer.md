# UI-16 — Xem ảnh và tải tệp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Xem tệp có quyền bằng authenticated fetch mà không tạo URL công khai.

**Architecture:** Next App Router entry chỉ nối AttachmentViewerPage; page compose section, hook useAttachmentViewerPage giữ logic và gọi adapter đã có. JSX component không gọi API.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript strict, Vitest/React Testing Library, Playwright.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), UI-16; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F10, F01. **Route:** frontend/app/(app)/attachments/[messageId]/[attachmentId]/page.tsx.

## Global Constraints

- AGENTS.md: route chỉ nối page; Page compose; JSX ở component, state/effect/handler ở hook, HTTP trong adapter; một exported component/file, <= khoảng 150 dòng, không any.
- Dùng token/Be Vietnam Pro/shared primitives từ F00; 360–1440 px, zoom 200%, keyboard/screen reader, WCAG 2.2 AA; action đủ hover/active/focus/disabled/loading.
- Data view có loading/empty/error; destructive action có xác nhận; filter/search/tab nằm trong URL. Không hard-code route/field/label lặp lại.

## Review Focus

1. Member bị loại.
2. tin trước joinedAt.
3. token refresh khi tải.
4. file rất lớn.
5. MIME sai.

## File ownership and interfaces

- Route: frontend/app/(app)/attachments/[messageId]/[attachmentId]/page.tsx.
- Page: frontend/features/attachments/pages/AttachmentViewerPage.tsx.
- UI sections: frontend/features/attachments/components/ImagePreview.tsx; frontend/features/attachments/components/FileDownloadCard.tsx; frontend/features/attachments/components/AttachmentError.tsx.
- Logic: frontend/features/attachments/hooks/useAttachmentViewerPage.ts.
- Tests: frontend/features/attachments/file-viewer.page.test.tsx and frontend/features/attachments/hooks/useAttachmentViewerPage.test.ts.
- Consumes: downloadAttachment adapter từ F10; session từ F01.
- Hook contract: useAttachmentViewerPage(): AttachmentViewerPageViewModel with status, typed view data and on* handlers. Component props include only needed data/callbacks.
- States: Loading, ảnh xem trước, file khác để tải, tệp không tồn tại, mất quyền, tải lỗi.

### Task 1: Structure and presentation

- [ ] Step 1: Write failing component test: image shows descriptive alt; non-image offers explicit download; 404/403 show safe state; assert semantic heading/labels, loading/empty/error view and keyboard focus.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/attachments/file-viewer.page.test.tsx; expect FAIL for missing screen.
- [ ] Step 3: Add route entry, page composition and JSX-only sections listed above; use shared primitives/tokens.
- [ ] Step 4: Rerun component test and frontend typecheck; expect PASS. Commit UI structure.

### Task 2: Hook and navigation

- [ ] Step 1: Write failing hook test: authenticated blob fetched once, object URL revoked on unmount; back navigation returns chat; mock the named adapter only, assert URL/navigation, request count and failure feedback.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/attachments/hooks/useAttachmentViewerPage.test.ts; expect FAIL.
- [ ] Step 3: Implement typed useAttachmentViewerPage, query invalidation and URL state; keep logic out of JSX. Do not copy contract types.
- [ ] Step 4: Rerun focused tests, lint/typecheck; expect PASS. Commit interaction.

### Task 3: Visual and accessibility gate

- [ ] Step 1: Add Playwright smoke for the route: viewport 360 and 1440 px, keyboard-only path, loading/error state, focus ring and zoom 200%; use isolated test account/API fixtures.
- [ ] Step 2: Run pnpm -C frontend exec playwright test e2e/file-viewer.spec.ts; expect PASS, no horizontal page overflow or covered action. Commit smoke.

## Done when

UI-16 matches states above, five Review Focus cases are covered by tests/smoke, and no business logic/API call lives in JSX.
