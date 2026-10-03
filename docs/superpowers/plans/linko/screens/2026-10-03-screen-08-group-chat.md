# UI-08 — Phòng chat nhóm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Đọc/gửi tin, trả lời, mention, tệp, realtime, unread và ghim trong bố cục responsive.

**Architecture:** Next App Router entry chỉ nối GroupChatPage; page compose các section; hook useGroupChatPage giữ logic và gọi adapter đã có. JSX component không gọi API.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript strict, Vitest/React Testing Library, Playwright.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), UI-08; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F00, F08, F09, F10, F11, F12, F13. **Route:** frontend/app/(app)/groups/[conversationId]/page.tsx.

## Global Constraints

- AGENTS.md: route file chỉ import page; Page chỉ compose, component JSX-only, state/effect/handler ở hook, HTTP trong adapter; một exported component/file, <= khoảng 150 dòng, không any.
- Dùng token/Be Vietnam Pro/shared primitives từ F00; 360–1440 px, zoom 200%, keyboard/screen reader, WCAG 2.2 AA; tất cả action có hover/active/focus/disabled/loading.
- Data view có loading/empty/error; destructive action có xác nhận; filter/search/tab nằm trong URL. Không hard-code route/field/label lặp lại.

## Review Focus

1. Tin dài 4000.
2. file thứ sáu.
3. reconnect.
4. member bị loại.
5. mobile keyboard che composer.

## File ownership and interfaces

- Route: frontend/app/(app)/groups/[conversationId]/page.tsx.
- Page: frontend/features/chat/pages/GroupChatPage.tsx.
- UI sections: frontend/features/chat/components/ChatHeader.tsx; frontend/features/chat/components/MessageTimeline.tsx; frontend/features/chat/components/MessageItem.tsx; frontend/features/chat/components/MessageComposer.tsx; frontend/features/chat/components/PinnedStrip.tsx; frontend/features/chat/components/ChatConnectionBanner.tsx.
- Logic: frontend/features/chat/hooks/useGroupChatPage.ts.
- Tests: frontend/features/chat/group-chat.page.test.tsx and frontend/features/chat/hooks/useGroupChatPage.test.ts.
- Consumes: messages/attachments/chatSocket/read/pins adapters; shared chat components.
- Hook contract: useGroupChatPage(): GroupChatPageViewModel with status, typed view data and on* handlers. Component props include only view data/callbacks.
- States: Loading, nhóm trống, lỗi tải, đang gửi, gửi lỗi/retry, offline/reconnect, bị loại, nhóm đóng.

### Task 1: Structure and presentation

- [ ] Step 1: Write failing component test: timeline groups consecutive sender messages; composer handles text/reply/mention/5 files and keyboard; no old history appears; assert semantic heading/labels, loading/empty/error view and keyboard focus.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/chat/group-chat.page.test.tsx; expect FAIL for missing screen.
- [ ] Step 3: Add route entry, page composition and focused JSX-only sections listed above; use shared primitives/tokens and no inline API/state.
- [ ] Step 4: Rerun component test and frontend typecheck; expect PASS. Commit UI structure.

### Task 2: Hook and navigation

- [ ] Step 1: Write failing hook test: API ack/socket event deduplicate by ID; retry preserves clientMessageId; read marker updates only visible latest; removed member exits room; mock the named adapter only, assert URL/navigation, request count and failure feedback.
- [ ] Step 2: Run pnpm -C frontend exec vitest run features/chat/hooks/useGroupChatPage.test.ts; expect FAIL.
- [ ] Step 3: Implement typed useGroupChatPage, query invalidation and URL state; keep logic out of JSX. Do not copy contract types.
- [ ] Step 4: Rerun both focused tests, lint/typecheck; expect PASS. Commit interaction.

### Task 3: Visual and accessibility gate

- [ ] Step 1: Add Playwright smoke for frontend/app/(app)/groups/[conversationId]/page.tsx: viewport 360 and 1440 px, keyboard-only path, loading/error state, focus ring and zoom 200%; use isolated test account/API fixtures.
- [ ] Step 2: Run pnpm -C frontend exec playwright test e2e/group-chat.spec.ts; expect PASS, no horizontal page overflow or covered action. Commit smoke.

## Done when

UI-08 matches the named states, five Review Focus cases are covered by tests or smoke, and no business logic/API call lives in a JSX file.
