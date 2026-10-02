# F08 — Gửi và đọc tin nhắn Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Gửi, đọc theo cursor và thử lại an toàn trong chat nhóm hoặc chat riêng.

**Architecture:** Migrate phần message đang chạm từ cấu trúc cũ sang backend/src/modules/message; route/controller mỏng, service dùng repository interface và DTO. Client API adapter dùng contract chung; các màn hình sẽ lắp hook/JSX theo screen plan.

**Tech Stack:** TypeScript strict, Express 5, Mongoose 9, Zod 4, Vitest, Supertest, MongoMemoryReplSet; Next.js 16/React 19 cho adapter.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), yêu cầu FR-08; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F00, F03, F06. **Screen consumers:** xem implementation guide.

## Global Constraints

- AGENTS.md là chuẩn bắt buộc: ObjectId/Mongoose/Zod, strict TS, constants dùng chung, audit/delFlag, repository-only DB, DI, global error envelope và TSDoc tiếng Anh.
- API trả DTO, không trả document Mongoose/secret; lỗi business dùng code ổn định; frontend chỉ gọi API qua adapter, UI logic ở hook.
- Mỗi task viết test thất bại trước, chạy test xanh, lint/typecheck và commit nhỏ; không chỉnh module ngoài phạm vi nếu không cần.
- Giữ giới hạn spec: nhóm riêng, 100 thành viên/nhóm, lịch sử từ joinedAt, DTO không lộ dữ liệu kín; phần không liên quan của MVP không được mở rộng.

## Review Focus

1. Gửi trùng vì đứt mạng.
2. content chỉ whitespace.
3. cùng timestamp nhiều tin.
4. người vừa bị loại.
5. DIRECT sau hủy kết bạn.

## File ownership and interface

**Existing to migrate/modify:** backend/src/routes/message.route.ts, backend/src/controllers/message.controller.ts, backend/src/services/message.service.ts, backend/src/models/Message.ts.

**Module files:** backend/src/modules/message/{message.route.ts, message.controller.ts, message.service.ts, message.repository.ts, message.dto.ts, message.schema.ts, message.constants.ts}. Đăng ký module một lần tại backend/src/app.ts; bỏ route wiring cũ tương ứng.

**Service signatures:** MessageService.send(input: SendMessageInput): Promise<MessageDto>; list(input: ListMessagesInput): Promise<CursorPage<MessageDto>>.

**HTTP contract:** POST /api/messages; GET /api/messages/:conversationId?cursor=&limit=30. Unique index (conversationId,senderId,clientMessageId). Tin dài tối đa 4000 ký tự; cursor theo createdAt+_id; list và download phải lọc joinedAt. POST ghi rồi mới trả/phát event.

**Frontend adapter:** sendMessage, listMessages in frontend/features/chat/api/messages.api.ts. File frontend/features/chat/api/messages.api.ts; typed result từ packages/contracts, không copy DTO.

### Task 1: Business rules and repository

**Files:** Service/repository/types/constants trong module trên; test backend/src/modules/message/messaging.service.test.ts.

- [x] Step 1: Viết test thất bại: should_return_same_message_for_same_clientMessageId; should_hide_messages_before_joinedAt; should_reject_nonmember. Assertions cốt lõi: expect(retried.id).toBe(first.id); expect(page.items.every(m => m.createdAt >= joinedAt)).toBe(true).
- [x] Step 2: Chạy pnpm -C backend exec vitest run src/modules/message/messaging.service.test.ts; xác nhận FAIL do module/repository chưa tồn tại.
- [x] Step 3: Viết repository interface + Mongoose repository và service signatures ở trên, áp dụng transaction khi nhiều bản ghi cùng thay đổi, constants/typed BusinessException; không gọi Mongoose trong service.
- [x] Step 4: Chạy lại test, backend typecheck; PASS. Commit domain task.

### Task 2: API boundary and integration

**Files:** Route/controller/dto/schema/mapper trong module; test backend/src/modules/message/messaging.route.test.ts.

- [x] Step 1: Viết test route/integration thất bại: 400 for >4000 chars; 401/403 for no auth/membership; cursor page stable on same timestamp; DIRECT checks friendship even by conversationId. Assert status, envelope, code lỗi và DTO; dùng MongoDB test cô lập.
- [x] Step 2: Chạy pnpm -C backend exec vitest run src/modules/message/messaging.route.test.ts; xác nhận FAIL với 404 ở route chưa đăng ký.
- [x] Step 3: Nối Zod middleware, global auth, controller HTTP-only và DTO mapper; đăng ký route ở composition root, bỏ legacy message route khỏi production wiring.
- [x] Step 4: Chạy lại route integration suite (5 tests), backend typecheck và route smoke; PASS. Commit API task.

### Task 3: Client contract

**Files:** frontend/features/chat/api/messages.api.ts; test cùng thư mục tên messaging.api.test.ts.

- [ ] Step 1: Viết test adapter thất bại: adapter sends clientMessageId and normalizes message DTO; aborted request leaves retryable state. Giả lập HTTP envelope, xác nhận mapping dữ liệu và ApiError.code.
- [ ] Step 2: Chạy pnpm -C frontend exec vitest run features/chat/api/messaging.api.test.ts; xác nhận FAIL.
- [ ] Step 3: Viết adapter functions đã nêu, dùng shared HTTP client, constants và DTO package chung; không thêm state/JSX.
- [ ] Step 4: Chạy test, frontend typecheck/lint; phải PASS. Commit adapter task.

## Done when

FR-08 và 5 Review Focus có bằng chứng test; route cũ không còn hoạt động song song; spec và AGENTS.md được đối chiếu.
