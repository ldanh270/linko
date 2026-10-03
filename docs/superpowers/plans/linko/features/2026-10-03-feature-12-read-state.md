# F12 — Đã đọc và chưa đọc Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Ghi mốc đọc riêng mỗi thành viên và đếm chưa đọc đúng lịch sử nhìn thấy.

**Architecture:** Module backend/src/modules/read sở hữu hành vi; controller HTTP-only, service qua interface, repository Mongoose. Adapter frontend dùng shared HTTP client và packages/contracts; màn hình lắp hook/JSX riêng.

**Tech Stack:** TypeScript strict, Express 5, Mongoose 9, Zod 4, Vitest/Supertest/MongoMemoryReplSet; Next.js 16/React 19 cho adapter.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), FR-12; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F08, F06. **Screen consumers:** xem implementation guide.

## Global Constraints

- AGENTS.md bắt buộc: ObjectId/Mongoose/Zod, strict TS, constants dùng chung, audit/delFlag, repository-only DB, DI, global error envelope, TSDoc tiếng Anh.
- Không trả document/secret; lỗi business dùng code, lỗi kỹ thuật vào global handler. FE adapter dùng contract chung, không có JSX/state.
- Mỗi task có test thất bại → triển khai tối thiểu → test xanh → typecheck/lint → commit.
- Giữ giới hạn spec: nhóm riêng, 100 thành viên/nhóm, lịch sử từ joinedAt; DTO không lộ dữ liệu kín. Không thêm tính năng sau MVP.

## Review Focus

1. Mốc đọc trước joinedAt.
2. messageId thuộc hội thoại khác.
3. hai tabs cập nhật ngược thứ tự.
4. rời/rejoin.
5. tin cùng thời gian.

## File ownership and interface

**Existing to migrate/modify:** backend/src/models/Conversation.ts, backend/src/utils/messageHelper.ts.

**Module files:** backend/src/modules/read/{read.route.ts, read.controller.ts, read.service.ts, read.repository.ts, read.dto.ts, read.constants.ts}. Đăng ký một lần tại backend/src/app.ts; bỏ wiring cũ tương ứng.

**Service signatures:** ReadStateService.markRead(input: MarkReadInput): Promise<ReadStateDto>; getUnread(userId: ObjectId, conversationId: ObjectId): Promise<number>.

**HTTP contract:** PUT /api/conversations/:id/read. Participant giữ lastReadAt/lastReadMessageId theo cursor ổn định; markRead monotonic, không lùi. Unread chỉ đếm tin nhìn thấy của người khác.

**Frontend adapter:** markConversationRead in frontend/features/inbox/api/read.api.ts. File frontend/features/inbox/api/read.api.ts; typed result từ packages/contracts.

### Task 1: Business rules and repository

**Files:** service/repository/types/constants trong module trên; test backend/src/modules/read/read-state.service.test.ts.

- [ ] Step 1: Viết test thất bại: should_not_mark_future_or_pre_join_message_read; should_set_unread_zero_at_latest_visible_message; should_keep_other_members_count. Assertions cốt lõi: expect(self.unreadCount).toBe(0); expect(other.unreadCount).toBe(previousOtherCount).
- [ ] Step 2: Chạy pnpm -C backend exec vitest run src/modules/read/read-state.service.test.ts; xác nhận FAIL đúng hành vi.
- [ ] Step 3: Viết repository interface + Mongoose repository và service signatures ở trên; transaction khi nhiều bản ghi thay đổi; constants/typed BusinessException; không gọi Mongoose trong service.
- [ ] Step 4: Chạy lại test và backend typecheck; phải PASS. Commit domain task.

### Task 2: API boundary and integration

**Files:** route/controller/dto/schema/mapper trong module; test backend/src/modules/read/read-state.route.test.ts.

- [ ] Step 1: Viết test route thất bại: nonmember 403/404; invalid messageId 400; rejoin starts new read state; 200 envelope. Assert status, envelope, error code và DTO; dùng MongoDB test cô lập.
- [ ] Step 2: Chạy pnpm -C backend exec vitest run src/modules/read/read-state.route.test.ts; xác nhận FAIL đúng lý do.
- [ ] Step 3: Nối Zod, auth/RBAC middleware, controller HTTP-only và DTO mapper; đăng ký route tại composition root, bỏ wiring cũ.
- [ ] Step 4: Chạy test, backend typecheck và route smoke; phải PASS. Commit API task.

### Task 3: Client contract

**Files:** frontend/features/inbox/api/read.api.ts; test frontend/features/inbox/api/read-state.api.test.ts.

- [ ] Step 1: Viết test adapter thất bại: adapter sends lastVisibleMessageId and invalidates only relevant inbox query; giả lập envelope và xác nhận ApiError.code.
- [ ] Step 2: Chạy pnpm -C frontend exec vitest run features/inbox/api/read-state.api.test.ts; xác nhận FAIL.
- [ ] Step 3: Viết adapter functions đã nêu, dùng shared HTTP client/constants/DTO package; không thêm JSX hoặc state.
- [ ] Step 4: Chạy test, frontend typecheck/lint; phải PASS. Commit adapter task.

## Done when

FR-12 và 5 Review Focus có bằng chứng test; route cũ không hoạt động song song; spec/AGENTS.md được đối chiếu.
