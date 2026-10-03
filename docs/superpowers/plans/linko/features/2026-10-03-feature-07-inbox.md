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

- [ ] Step 1: Viết test thất bại: should_hide_group_after_leave; should_hide_pre_join_last_message; should_sort_by_last_visible_activity. Assertions cốt lõi: expect(items).not.toContainEqual(expect.objectContaining({id: leftGroupId})); expect(newMemberPreview.content).toBeNull().
- [ ] Step 2: Chạy pnpm -C backend exec vitest run src/modules/inbox/inbox.service.test.ts; xác nhận FAIL do hành vi chưa có, không do lỗi harness.
- [ ] Step 3: Viết repository interface + Mongoose repository và service signatures ở trên, áp dụng transaction khi nhiều bản ghi cùng thay đổi, constants/typed BusinessException; không gọi Mongoose trong service.
- [ ] Step 4: Chạy lại test, backend typecheck; phải PASS. Commit domain task.

### Task 2: API boundary and integration

**Files:** Route/controller/dto/schema/mapper trong module; test backend/src/modules/inbox/inbox.route.test.ts.

- [ ] Step 1: Viết test route/integration thất bại: invalid kind/cursor 400; nonmember data absent; response includes nextCursor and unreadCount; limit max 50. Assert status, envelope, code lỗi và DTO; dùng MongoDB test cô lập.
- [ ] Step 2: Chạy pnpm -C backend exec vitest run src/modules/inbox/inbox.route.test.ts; xác nhận FAIL đúng lý do.
- [ ] Step 3: Nối Zod middleware, auth/RBAC middleware, controller HTTP-only và DTO mapper; đăng ký route ở composition root, gỡ wiring cũ.
- [ ] Step 4: Chạy lại test, pnpm -C backend typecheck và route smoke; phải PASS. Commit API task.

### Task 3: Client contract

**Files:** frontend/features/inbox/api/inbox.api.ts; test cùng thư mục tên inbox.api.test.ts.

- [ ] Step 1: Viết test adapter thất bại: API adapter serializes kind/cursor/limit and parses envelope into typed page. Giả lập HTTP envelope, xác nhận mapping dữ liệu và ApiError.code.
- [ ] Step 2: Chạy pnpm -C frontend exec vitest run features/inbox/api/inbox.api.test.ts; xác nhận FAIL.
- [ ] Step 3: Viết adapter functions đã nêu, dùng shared HTTP client, constants và DTO package chung; không thêm state/JSX.
- [ ] Step 4: Chạy test, frontend typecheck/lint; phải PASS. Commit adapter task.

## Done when

FR-07 và 5 Review Focus có bằng chứng test; route cũ không còn hoạt động song song; spec và AGENTS.md được đối chiếu.
