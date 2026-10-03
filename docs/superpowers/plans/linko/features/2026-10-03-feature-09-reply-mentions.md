# F09 — Trả lời và nhắc tên Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Chỉ cho reply tới tin nhìn thấy trong cùng hội thoại và mention thành viên hiện tại.

**Architecture:** Module backend/src/modules/message sở hữu hành vi; controller HTTP-only, service qua interface, repository Mongoose. Adapter frontend dùng shared HTTP client và packages/contracts; màn hình lắp hook/JSX riêng.

**Tech Stack:** TypeScript strict, Express 5, Mongoose 9, Zod 4, Vitest/Supertest/MongoMemoryReplSet; Next.js 16/React 19 cho adapter.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), FR-09; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F08, F06. **Screen consumers:** xem implementation guide.

## Global Constraints

- AGENTS.md bắt buộc: ObjectId/Mongoose/Zod, strict TS, constants dùng chung, audit/delFlag, repository-only DB, DI, global error envelope, TSDoc tiếng Anh.
- Không trả document/secret; lỗi business dùng code, lỗi kỹ thuật vào global handler. FE adapter dùng contract chung, không có JSX/state.
- Mỗi task có test thất bại → triển khai tối thiểu → test xanh → typecheck/lint → commit.
- Giữ giới hạn spec: nhóm riêng, 100 thành viên/nhóm, lịch sử từ joinedAt; DTO không lộ dữ liệu kín. Không thêm tính năng sau MVP.

## Review Focus

1. Reply qua nhóm khác.
2. reply tới tin trước joinedAt.
3. mention người đã rời.
4. mention trùng.
5. tin gốc không còn xem được.

## File ownership and interface

**Existing to migrate/modify:** backend/src/models/Message.ts và module message của F08.

**Module files:** backend/src/modules/message/{replyMention.service.ts, replyMention.types.ts, message.schema.ts, message.dto.ts, message.service.ts}. Đăng ký một lần tại backend/src/app.ts; bỏ wiring cũ tương ứng.

**Service signatures:** ReplyMentionService.validate(input: ReplyMentionInput): Promise<ValidatedMessageContext>.

**HTTP contract:** POST /api/messages nhận replyTo và mentions. MessageService của F08 gọi ReplyMentionService đã inject trước khi lưu. Giới hạn mentions <=20 ID duy nhất; reply preview chỉ trả nếu người nhận được xem.

**Frontend adapter:** sendMessage ở frontend/features/chat/api/messages.api.ts nhận replyTo?: string và mentions?: string[]. File frontend/features/chat/api/messages.api.ts; typed result từ packages/contracts.

### Task 1: Business rules and repository

**Files:** service/repository/types/constants trong module trên; test backend/src/modules/message/reply-mentions.service.test.ts.

- [ ] Step 1: Viết test thất bại: should_reject_reply_from_other_conversation; should_reject_pre_join_reply; should_reject_mention_of_nonmember. Assertions cốt lõi: expect(error.code).toBe(ERROR_CODES.INVALID_REPLY); expect(mentions).toEqual(activeMemberIds).
- [ ] Step 2: Chạy pnpm -C backend exec vitest run src/modules/message/reply-mentions.service.test.ts; xác nhận FAIL đúng hành vi.
- [ ] Step 3: Viết repository interface + Mongoose repository và service signatures ở trên; transaction khi nhiều bản ghi thay đổi; constants/typed BusinessException; không gọi Mongoose trong service.
- [ ] Step 4: Chạy lại test và backend typecheck; phải PASS. Commit domain task.

### Task 2: API boundary and integration

**Files:** route/controller/dto/schema/mapper trong module; test backend/src/modules/message/reply-mentions.route.test.ts.

- [ ] Step 1: Viết test route thất bại: 400 cho ObjectId sai, 403 cho reply không có quyền; DTO reply preview không lộ nội dung cũ; mention IDs duy nhất. Assert status, envelope, error code và DTO; dùng MongoDB test cô lập.
- [ ] Step 2: Chạy pnpm -C backend exec vitest run src/modules/message/reply-mentions.route.test.ts; xác nhận FAIL đúng lý do.
- [ ] Step 3: Nối Zod, auth/RBAC middleware, controller HTTP-only và DTO mapper; đăng ký route tại composition root, bỏ wiring cũ.
- [ ] Step 4: Chạy test, backend typecheck và route smoke; phải PASS. Commit API task.

### Task 3: Client contract

**Files:** frontend/features/chat/api/messages.api.ts; test frontend/features/chat/api/reply-mentions.api.test.ts.

- [ ] Step 1: Viết test adapter thất bại: adapter serialize replyTo/mentions nhất quán giữa JSON và multipart; giả lập envelope và xác nhận ApiError.code.
- [ ] Step 2: Chạy pnpm -C frontend exec vitest run features/chat/api/reply-mentions.api.test.ts; xác nhận FAIL.
- [ ] Step 3: Viết adapter functions đã nêu, dùng shared HTTP client/constants/DTO package; không thêm JSX hoặc state.
- [ ] Step 4: Chạy test, frontend typecheck/lint; phải PASS. Commit adapter task.

## Done when

FR-09 và 5 Review Focus có bằng chứng test; route cũ không hoạt động song song; spec/AGENTS.md được đối chiếu.
