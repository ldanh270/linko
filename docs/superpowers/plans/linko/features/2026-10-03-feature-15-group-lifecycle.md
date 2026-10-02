# F15 — Rời và đóng nhóm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Rời/loại thành viên thu hồi quyền ngay; owner đóng nhóm và thu hồi lời mời.

**Architecture:** Module backend/src/modules/conversation sở hữu hành vi; controller HTTP-only, service qua interface, repository Mongoose. Adapter frontend dùng shared HTTP client và packages/contracts; màn hình lắp hook/JSX riêng.

**Tech Stack:** TypeScript strict, Express 5, Mongoose 9, Zod 4, Vitest/Supertest/MongoMemoryReplSet; Next.js 16/React 19 cho adapter.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), FR-15; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F03, F06, F04. **Screen consumers:** xem implementation guide.

## Global Constraints

- AGENTS.md bắt buộc: ObjectId/Mongoose/Zod, strict TS, constants dùng chung, audit/delFlag, repository-only DB, DI, global error envelope, TSDoc tiếng Anh.
- Không trả document/secret; lỗi business dùng code, lỗi kỹ thuật vào global handler. FE adapter dùng contract chung, không có JSX/state.
- Mỗi task có test thất bại → triển khai tối thiểu → test xanh → typecheck/lint → commit.
- Giữ giới hạn spec: nhóm riêng, 100 thành viên/nhóm, lịch sử từ joinedAt; DTO không lộ dữ liệu kín. Không thêm tính năng sau MVP.

## Review Focus

1. Owner rời khi còn người.
2. đóng nhóm lúc có lời mời đang mở.
3. member đang tải tệp.
4. socket còn kết nối.
5. tham gia lại sau khi rời.

## File ownership and interface

**Existing to migrate/modify:** backend/src/routes/conversation.route.ts, backend/src/controllers/conversation.controller.ts, backend/src/models/Conversation.ts.

**Module files:** backend/src/modules/conversation/{conversationLifecycle.service.ts, conversationLifecycle.repository.ts, conversation.route.ts, conversation.dto.ts, Conversation.ts}. Đăng ký một lần tại backend/src/app.ts; bỏ wiring cũ tương ứng.

**Service signatures:** ConversationLifecycleService.leave(input: LeaveGroupInput): Promise<void>; close(input: CloseGroupInput): Promise<GroupDto>.

**HTTP contract:** POST /api/conversations/:id/leave; POST /api/conversations/:id/close. Không hard-delete GROUP; status CLOSED. Membership rời có leftAt/delFlag, active query loại ra; rejoin tạo entry mới với joinedAt mới. Revoke invites cùng transaction.

**Frontend adapter:** leaveGroup, closeGroup in frontend/features/groups/api/groupLifecycle.api.ts. File frontend/features/groups/api/groupLifecycle.api.ts; typed result từ packages/contracts.

### Task 1: Business rules and repository

**Files:** service/repository/types/constants trong module trên; test backend/src/modules/conversation/group-lifecycle.service.test.ts.

- [x] Step 1: Viết test thất bại: should_require_owner_transfer_before_leave; should_revoke_invites_on_close; should_deny_download_after_leave. Assertions cốt lõi: expect(error.code).toBe(ERROR_CODES.OWNER_TRANSFER_REQUIRED); expect(activeInvites).toHaveLength(0).
- [x] Step 2: Chạy pnpm -C backend exec vitest run src/modules/conversation/group-lifecycle.service.test.ts; xác nhận FAIL đúng hành vi.
- [x] Step 3: Viết repository interface + Mongoose repository và service signatures ở trên; transaction khi nhiều bản ghi thay đổi; constants/typed BusinessException; không gọi Mongoose trong service.
- [x] Step 4: Chạy lại test và backend typecheck; phải PASS. Commit domain task.

### Task 2: API boundary and integration

**Files:** route/controller/dto/schema/mapper trong module; test backend/src/modules/conversation/group-lifecycle.route.test.ts.

- [x] Step 1: Viết test route thất bại: member leave 200; owner close 200, member close 403; closed group rejects new sends/joins. Assert status, envelope, error code và DTO; dùng MongoDB test cô lập.
- [x] Step 2: Chạy pnpm -C backend exec vitest run src/modules/conversation/group-lifecycle.route.test.ts; xác nhận FAIL đúng lý do.
- [x] Step 3: Nối Zod, auth/RBAC middleware, controller HTTP-only và DTO mapper; đăng ký route tại composition root, bỏ wiring cũ.
- [x] Step 4: Chạy test, backend typecheck và route smoke; phải PASS. Commit API task.

### Task 3: Client contract

**Files:** frontend/features/groups/api/groupLifecycle.api.ts; test frontend/features/groups/api/group-lifecycle.api.test.ts.

- [x] Step 1: Viết adapter contract test cho leave/close routes, DTO result và ApiError.code. Cache invalidation/navigating away belong to the UI hook, because the API adapter is transport-only and contains no React state.
- [x] Step 2: Chạy pnpm -C frontend exec vitest run features/groups/api/group-lifecycle.api.test.ts; xác nhận FAIL do adapter module chưa tồn tại.
- [x] Step 3: Viết adapter functions đã nêu, dùng shared HTTP client/constants/DTO package; không thêm JSX hoặc state.
- [x] Step 4: Chạy test, frontend typecheck/lint; PASS. Commit adapter task.

Cache invalidation and navigation remain a screen-hook responsibility for UI-11; no group screen hook exists in the feature layer yet. File-download revocation and socket room removal are verified with F10/F11 when those boundaries are introduced.

## Done when

FR-15 và 5 Review Focus có bằng chứng test; route cũ không hoạt động song song; spec/AGENTS.md được đối chiếu.
