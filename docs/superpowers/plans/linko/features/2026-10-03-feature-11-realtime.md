# F11 — Đồng bộ thời gian thực Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Xác thực Socket.IO, phát tin sau lưu và đồng bộ lại sau reconnect không nhân đôi.

**Architecture:** Module backend/src/modules/realtime sở hữu hành vi; controller HTTP-only, service qua interface, repository Mongoose. Adapter frontend dùng shared HTTP client và packages/contracts; màn hình lắp hook/JSX riêng.

**Tech Stack:** TypeScript strict, Express 5, Mongoose 9, Zod 4, Vitest/Supertest/MongoMemoryReplSet; Next.js 16/React 19 cho adapter.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), FR-11; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F08, F06. **Screen consumers:** xem implementation guide.

## Global Constraints

- AGENTS.md bắt buộc: ObjectId/Mongoose/Zod, strict TS, constants dùng chung, audit/delFlag, repository-only DB, DI, global error envelope, TSDoc tiếng Anh.
- Không trả document/secret; lỗi business dùng code, lỗi kỹ thuật vào global handler. FE adapter dùng contract chung, không có JSX/state.
- Mỗi task có test thất bại → triển khai tối thiểu → test xanh → typecheck/lint → commit.
- Giữ giới hạn spec: nhóm riêng, 100 thành viên/nhóm, lịch sử từ joinedAt; DTO không lộ dữ liệu kín. Không thêm tính năng sau MVP.

## Review Focus

1. Socket không auth.
2. join room đoán ID.
3. DB write fail.
4. thành viên bị loại khi đang online.
5. reconnect giữa hai tin.

## File ownership and interface

**Existing to migrate/modify:** backend/src/socket/socket.ts, backend/src/utils/messageHelper.ts.

**Module files:** backend/src/modules/realtime/{realtime.gateway.ts, realtime.auth.ts, realtime.constants.ts, realtime.types.ts}. Đăng ký một lần tại backend/src/app.ts; bỏ wiring cũ tương ứng.

**Service signatures:** RealtimeGateway.authenticate(socket): Promise<SocketIdentity>; joinConversation(socket, conversationId): Promise<void>; publishMessage(message: MessageDto): Promise<void>; revokeMember(conversationId, userId): Promise<void>.

**HTTP contract:** Socket events conversation:join, message:created, conversation:updated, membership:changed; REST cursor là nguồn hồi phục. Handshake xác thực token; server kiểm tra active membership khi join. Chỉ publish sau commit; client de-duplicate bằng MessageDto.id và dùng REST cursor khi reconnect.

**Frontend adapter:** createChatSocket, subscribeToConversation in frontend/features/chat/api/chatSocket.ts. File frontend/features/chat/api/chatSocket.ts; typed result từ packages/contracts.

### Task 1: Business rules and repository

**Files:** service/repository/types/constants trong module trên; test backend/src/modules/realtime/realtime.service.test.ts.

- [ ] Step 1: Viết test thất bại: should_reject_socket_without_valid_token; should_reject_join_for_nonmember; should_emit_only_after_persist. Assertions cốt lõi: expect(socket.connected).toBe(false); expect(events).toHaveLength(1); expect(events[0].id).toBe(savedMessage.id).
- [ ] Step 2: Chạy pnpm -C backend exec vitest run src/modules/realtime/realtime.service.test.ts; xác nhận FAIL đúng hành vi.
- [ ] Step 3: Viết repository interface + Mongoose repository và service signatures ở trên; transaction khi nhiều bản ghi thay đổi; constants/typed BusinessException; không gọi Mongoose trong service.
- [ ] Step 4: Chạy lại test và backend typecheck; phải PASS. Commit domain task.

### Task 2: API boundary and integration

**Files:** route/controller/dto/schema/mapper trong module; test backend/src/modules/realtime/realtime.route.test.ts.

- [ ] Step 1: Viết test route thất bại: không event cho người ngoài room; bị loại rời room; event không chứa pre-join content; reconnect GET cursor lấy tin thiếu. Assert status, envelope, error code và DTO; dùng MongoDB test cô lập.
- [ ] Step 2: Chạy pnpm -C backend exec vitest run src/modules/realtime/realtime.route.test.ts; xác nhận FAIL đúng lý do.
- [ ] Step 3: Nối Zod, auth/RBAC middleware, controller HTTP-only và DTO mapper; đăng ký route tại composition root, bỏ wiring cũ.
- [ ] Step 4: Chạy test, backend typecheck và route smoke; phải PASS. Commit API task.

### Task 3: Client contract

**Files:** frontend/features/chat/api/chatSocket.ts; test frontend/features/chat/api/realtime.api.test.ts.

- [ ] Step 1: Viết test adapter thất bại: client gộp API response/socket event theo messageId, resubscribe sau reconnect, không giữ duplicate listener; giả lập envelope và xác nhận ApiError.code.
- [ ] Step 2: Chạy pnpm -C frontend exec vitest run features/chat/api/realtime.api.test.ts; xác nhận FAIL.
- [ ] Step 3: Viết adapter functions đã nêu, dùng shared HTTP client/constants/DTO package; không thêm JSX hoặc state.
- [ ] Step 4: Chạy test, frontend typecheck/lint; phải PASS. Commit adapter task.

## Done when

FR-11 và 5 Review Focus có bằng chứng test; route cũ không hoạt động song song; spec/AGENTS.md được đối chiếu.
