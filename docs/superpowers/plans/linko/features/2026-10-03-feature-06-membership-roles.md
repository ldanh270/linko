# F06 — Thành viên và phân quyền Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Quản lý owner/admin/member, danh sách thành viên, loại người và chuyển chủ nhóm.

**Architecture:** Migrate phần membership đang chạm từ cấu trúc cũ sang backend/src/modules/membership; route/controller mỏng, service dùng repository interface và DTO. Client API adapter dùng contract chung; các màn hình sẽ lắp hook/JSX theo screen plan.

**Tech Stack:** TypeScript strict, Express 5, Mongoose 9, Zod 4, Vitest, Supertest, MongoMemoryReplSet; Next.js 16/React 19 cho adapter.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), yêu cầu FR-06; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F00, F03. **Screen consumers:** xem implementation guide.

## Global Constraints

- AGENTS.md là chuẩn bắt buộc: ObjectId/Mongoose/Zod, strict TS, constants dùng chung, audit/delFlag, repository-only DB, DI, global error envelope và TSDoc tiếng Anh.
- API trả DTO, không trả document Mongoose/secret; lỗi business dùng code ổn định; frontend chỉ gọi API qua adapter, UI logic ở hook.
- Mỗi task viết test thất bại trước, chạy test xanh, lint/typecheck và commit nhỏ; không chỉnh module ngoài phạm vi nếu không cần.
- Giữ giới hạn spec: nhóm riêng, 100 thành viên/nhóm, lịch sử từ joinedAt, DTO không lộ dữ liệu kín; phần không liên quan của MVP không được mở rộng.

## Review Focus

1. Admin sửa owner.
2. tự nâng quyền.
3. hai chủ nhóm sau concurrent transfer.
4. xóa thành viên đang online.
5. role thay đổi giữa request.

## File ownership and interface

**Existing to migrate/modify:** backend/src/routes/conversationRoutes/participant.route.ts, backend/src/models/Conversation.ts.

**Module files:** backend/src/modules/membership/{membership.route.ts, membership.controller.ts, membership.service.ts, membership.repository.ts, membership.dto.ts, membership.constants.ts}. Đăng ký module một lần tại backend/src/app.ts; bỏ route wiring cũ tương ứng.

**Service signatures:** MembershipService.list(conversationId: ObjectId, actorId: ObjectId): Promise<MemberDto[]>; addFromInvitation(input: AddMemberInput, tx: TransactionContext): Promise<MemberDto>; changeRole(input: ChangeRoleInput): Promise<MemberDto>; remove(input: RemoveMemberInput): Promise<void>; transferOwner(input: TransferOwnerInput): Promise<void>.

**HTTP contract:** GET/PATCH/DELETE /api/conversations/:id/participants; POST /api/conversations/:id/transfer-owner. Owner là duy nhất. Admin quản lý member nhưng không owner/admin khác; chỉ owner cấp/hạ admin và chuyển owner. addFromInvitation là service nội bộ dùng TransactionContext của F00 trong transaction F05; không có route POST thêm member trực tiếp.

**Frontend adapter:** listMembers, changeRole, removeMember, transferOwner in frontend/features/membership/api/membership.api.ts. File frontend/features/membership/api/membership.api.ts; typed result từ packages/contracts, không copy DTO.

### Task 1: Business rules and repository

**Files:** Service/repository/types/constants trong module trên; test backend/src/modules/membership/membership-roles.service.test.ts.

- [x] Step 1: Viết test thất bại: should_forbid_admin_removing_owner; should_forbid_member_promoting_self; should_transfer_owner_atomically. Assertions cốt lõi: expect(forbidden.code).toBe(ERROR_CODES.INSUFFICIENT_ROLE); expect(ownerCount).toBe(1).
- [x] Step 2: Chạy pnpm -C backend exec vitest run src/modules/membership/membership-roles.service.test.ts; xác nhận FAIL do hành vi chưa có, không do lỗi harness.
- [x] Step 3: Viết repository interface + Mongoose repository và service signatures ở trên, áp dụng transaction khi nhiều bản ghi cùng thay đổi, constants/typed BusinessException; không gọi Mongoose trong service.
- [x] Step 4: Chạy lại test, backend typecheck; phải PASS. Commit domain task.

### Task 2: API boundary and integration

**Files:** Route/controller/dto/schema/mapper trong module; test backend/src/modules/membership/membership-roles.route.test.ts.

- [x] Step 1: Viết test route/integration thất bại: owner/admin/member matrix matches spec; nonmember 404/403 without leaking membership; duplicate participant rejected. Assert status, envelope, code lỗi và DTO; dùng MongoDB test cô lập.
- [x] Step 2: Chạy pnpm -C backend exec vitest run src/modules/membership/membership-roles.route.test.ts; xác nhận FAIL đúng lý do.
- [x] Step 3: Nối Zod middleware, auth/RBAC middleware, controller HTTP-only và DTO mapper; đăng ký route ở composition root, gỡ wiring cũ.
- [x] Step 4: Chạy lại test, pnpm -C backend typecheck và route smoke; phải PASS. Commit API task.

### Task 3: Client contract

**Files:** frontend/features/membership/api/membership.api.ts; test cùng thư mục tên membership-roles.api.test.ts.

- [x] Step 1: Viết test adapter thất bại: role adapter uses ROLE constants from contract; no UI-side authorization assumption. Giả lập HTTP envelope, xác nhận mapping dữ liệu và ApiError.code.
- [x] Step 2: Chạy pnpm -C frontend exec vitest run features/membership/api/membership-roles.api.test.ts; xác nhận FAIL.
- [x] Step 3: Viết adapter functions đã nêu, dùng shared HTTP client, constants và DTO package chung; không thêm state/JSX.
- [x] Step 4: Chạy test, frontend typecheck/lint; phải PASS. Commit adapter task.

## Done when

FR-06 và 5 Review Focus có bằng chứng test; route cũ không còn hoạt động song song; spec và AGENTS.md được đối chiếu.
