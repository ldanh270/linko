# F07 — Danh sách hội thoại Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Trả inbox chỉ gồm cuộc trò chuyện hiện tại, đúng thứ tự, preview và chưa đọc.

**Architecture:** Migrate phần inbox đang chạm từ cấu trúc cũ sang backend/src/modules/inbox; route/controller mỏng, service dùng repository interface và DTO. Client API adapter dùng contract chung; các màn hình sẽ lắp hook/JSX theo screen plan.

**Tech Stack:** TypeScript strict, Express 5, Mongoose 9, Zod 4, Vitest, Supertest, MongoMemoryReplSet; Next.js 16/React 19 cho adapter.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), yêu cầu FR-07; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F00, F03, F06, F12. **Screen consumers:** xem implementation guide.

## Global Constraints

- AGENTS.md là chuẩn bắt buộc: ObjectId/Mongoose/Zod, strict TS, constants dùng chung, audit/delFlag, repository-only DB, DI, global error envelope và TSDoc tiếng Anh.
- API trả DTO, không trả document Mongoose/secret; lỗi business dùng code ổn định; frontend chỉ gọi API qua adapter, UI logic ở hook.
- Mỗi task viết test thất bại trước, chạy test xanh, lint/typecheck và commit nhỏ; không chỉnh module ngoài phạm vi nếu không cần.
- Giữ giới hạn spec: nhóm riêng, 100 thành viên/nhóm, lịch sử từ joinedAt, DTO không lộ dữ liệu kín; phần không liên quan của MVP không được mở rộng.

## Review Focus

1. Nhóm chưa có tin.
2. lastMessage cũ trước joinedAt.
3. nhóm đóng.
4. cursor trùng thời gian.
5. danh sách rỗng.

## File ownership and interface

**Existing to migrate/modify:** backend/src/controllers/conversation.controller.ts, backend/src/services/conversation.service.ts, backend/src/models/Conversation.ts.

**Module files:** backend/src/modules/inbox/{inbox.route.ts, inbox.controller.ts, inbox.service.ts, inbox.repository.ts, inbox.dto.ts, inbox.constants.ts}. Đăng ký module một lần tại backend/src/app.ts; bỏ route wiring cũ tương ứng.

**Service signatures:** InboxService.list(input: ListInboxInput): Promise<CursorPage<InboxItemDto>>.

**HTTP contract:** GET /api/conversations?kind=all|group|direct&cursor=&limit=20. F07 thay phần GET kind=group tạm thời của F03 bằng một inbox route đầy đủ, không đăng ký hai handler GET. kind là URL/query key chung; default all, page 20/max 50. Preview tin cuối chỉ từ joinedAt; sort theo createdAt + ID tie-breaker; không dùng field lastMessageAt không tồn tại trong model.

**Frontend adapter:** listInbox in frontend/features/inbox/api/inbox.api.ts. File frontend/features/inbox/api/inbox.api.ts; typed result từ packages/contracts, không copy DTO.

### Task 1: Business rules and repository

**Files:** Service/repository/types/constants trong module trên; test backend/src/modules/inbox/inbox.service.test.ts.

- [x] Step 1: Added tests for departed membership, pre-join preview hiding, visible-activity ordering with empty conversations, requester-only unread counts, closed groups, and same-timestamp cursor ties.
- [x] Step 2: Ran `pnpm -C backend exec vitest run src/modules/inbox/inbox.service.test.ts`; the initial run failed because the inbox repository and service were not implemented.
- [x] Step 3: Added inbox repository interface, aggregate-backed Mongoose repository, service, mapper, cursor/limit constants, and shared inbox DTO contract. The service has no transaction because listing is read-only.
- [x] Step 4: Inbox domain tests (6) and backend typecheck pass. Domain task committed as `1804064`.

### Task 2: API boundary and integration

**Files:** Route/controller/dto/schema/mapper trong module; test backend/src/modules/inbox/inbox.route.test.ts.

- [x] Step 1: Added isolated route tests for invalid kind/cursor/limit, absent nonmember data, cursor/unread response, and `group`/`direct` filtering with closed-group visibility.
- [x] Step 2: Ran `pnpm -C backend exec vitest run src/modules/inbox/inbox.route.test.ts`; the old route accepted invalid cursor/limit and returned the old response shape.
- [x] Step 3: Added Zod validation, authenticated HTTP-only controller, and composition-root wiring. Removed the legacy GET/listing implementation from the conversation module so only one GET handler remains.
- [x] Step 4: Inbox route tests (5), affected group/lifecycle regressions (30), and backend lint/typecheck pass. API task committed as `6af611f`.

### Task 3: Client contract

**Files:** frontend/features/inbox/api/inbox.api.ts; test cùng thư mục tên inbox.api.test.ts.

- [x] Step 1: Added adapter tests for kind/cursor/limit serialization, default query values, typed cursor-page unwrapping, and server error-code preservation.
- [x] Step 2: Ran `pnpm -C frontend exec vitest run features/inbox/api/inbox.api.test.ts`; the tests initially failed because `inbox.api.ts` did not exist.
- [x] Step 3: Added `listInbox` using the shared HTTP client, query constants, and DTO package; removed the superseded `listMyGroups` adapter and group-summary contract. No state or JSX.
- [x] Step 4: Inbox adapter tests (3), read adapter tests (2), migrated group adapter tests (4), frontend typecheck/lint, and backend checks pass. Adapter task commit pending.

## Done when

FR-07 và 5 Review Focus có bằng chứng test; route cũ không còn hoạt động song song; spec và AGENTS.md được đối chiếu.
