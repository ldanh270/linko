# F13 — Tin ghim của nhóm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Owner/Admin ghim tối đa ba tin còn xem được và bỏ ghim an toàn.

**Architecture:** Module backend/src/modules/pin sở hữu hành vi; controller HTTP-only, service qua interface, repository Mongoose. Adapter frontend dùng shared HTTP client và packages/contracts; màn hình lắp hook/JSX riêng.

**Tech Stack:** TypeScript strict, Express 5, Mongoose 9, Zod 4, Vitest/Supertest/MongoMemoryReplSet; Next.js 16/React 19 cho adapter.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), FR-13; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F08, F06. **Screen consumers:** xem implementation guide.

## Global Constraints

- AGENTS.md bắt buộc: ObjectId/Mongoose/Zod, strict TS, constants dùng chung, audit/delFlag, repository-only DB, DI, global error envelope, TSDoc tiếng Anh.
- Không trả document/secret; lỗi business dùng code, lỗi kỹ thuật vào global handler. FE adapter dùng contract chung, không có JSX/state.
- Mỗi task có test thất bại → triển khai tối thiểu → test xanh → typecheck/lint → commit.
- Giữ giới hạn spec: nhóm riêng, 100 thành viên/nhóm, lịch sử từ joinedAt; DTO không lộ dữ liệu kín. Không thêm tính năng sau MVP.

## Review Focus

1. Ghim tin thứ tư.
2. ghim tin ở DM.
3. ghim tin đã ẩn/không thấy.
4. đồng thời hai admin ghim.
5. thành viên mới.

## File ownership and interface

**Existing to migrate/modify:** backend/src/models/Conversation.ts, backend/src/models/Message.ts.

**Module files:** backend/src/modules/pin/{pin.route.ts, pin.controller.ts, pin.service.ts, pin.repository.ts, pin.dto.ts, pin.constants.ts}. Đăng ký một lần tại backend/src/app.ts; bỏ wiring cũ tương ứng.

**Service signatures:** PinService.pin(input: PinMessageInput): Promise<PinnedMessageDto[]>; unpin(input: PinMessageInput): Promise<PinnedMessageDto[]>; list(conversationId, viewerId): Promise<PinnedMessageDto[]>.

**HTTP contract:** PUT/DELETE /api/conversations/:id/pins/:messageId; GET /api/conversations/:id/pins. group.pinnedMessageIds tối đa 3, thứ tự ghim mới nhất trước; list lọc theo joinedAt. Giữ atomic update/transaction để không vượt 3 khi đồng thời.

**Frontend adapter:** listPins, pinMessage, unpinMessage in frontend/features/groups/api/pins.api.ts. File frontend/features/groups/api/pins.api.ts; typed result từ packages/contracts.

### Task 1: Business rules and repository

**Files:** service/repository/types/constants trong module trên; test backend/src/modules/pin/pins.service.test.ts.

- [ ] Step 1: Viết test thất bại: should_reject_fourth_pin; should_reject_member_pin; should_hide_pre_join_pin_from_new_member. Assertions cốt lõi: expect(error.code).toBe(ERROR_CODES.PIN_LIMIT); expect(newMemberPins).toHaveLength(0).
- [ ] Step 2: Chạy pnpm -C backend exec vitest run src/modules/pin/pins.service.test.ts; xác nhận FAIL đúng hành vi.
- [ ] Step 3: Viết repository interface + Mongoose repository và service signatures ở trên; transaction khi nhiều bản ghi thay đổi; constants/typed BusinessException; không gọi Mongoose trong service.
- [ ] Step 4: Chạy lại test và backend typecheck; phải PASS. Commit domain task.

### Task 2: API boundary and integration

**Files:** route/controller/dto/schema/mapper trong module; test backend/src/modules/pin/pins.route.test.ts.

- [ ] Step 1: Viết test route thất bại: 404 tin khác hội thoại; 403 member; 200 pin idempotent; chỉ GROUP chấp nhận. Assert status, envelope, error code và DTO; dùng MongoDB test cô lập.
- [ ] Step 2: Chạy pnpm -C backend exec vitest run src/modules/pin/pins.route.test.ts; xác nhận FAIL đúng lý do.
- [ ] Step 3: Nối Zod, auth/RBAC middleware, controller HTTP-only và DTO mapper; đăng ký route tại composition root, bỏ wiring cũ.
- [ ] Step 4: Chạy test, backend typecheck và route smoke; phải PASS. Commit API task.

### Task 3: Client contract

**Files:** frontend/features/groups/api/pins.api.ts; test frontend/features/groups/api/pins.api.test.ts.

- [ ] Step 1: Viết test adapter thất bại: adapter invalidates group info query and returns ordered pin DTOs; giả lập envelope và xác nhận ApiError.code.
- [ ] Step 2: Chạy pnpm -C frontend exec vitest run features/groups/api/pins.api.test.ts; xác nhận FAIL.
- [ ] Step 3: Viết adapter functions đã nêu, dùng shared HTTP client/constants/DTO package; không thêm JSX hoặc state.
- [ ] Step 4: Chạy test, frontend typecheck/lint; phải PASS. Commit adapter task.

## Done when

FR-13 và 5 Review Focus có bằng chứng test; route cũ không hoạt động song song; spec/AGENTS.md được đối chiếu.
