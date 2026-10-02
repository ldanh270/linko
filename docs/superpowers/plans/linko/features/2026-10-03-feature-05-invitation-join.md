# F05 — Xem trước và tham gia nhóm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Cho người nhận xem preview tối thiểu và tham gia nhóm qua link hợp lệ, chống tranh chấp.

**Architecture:** Migrate phần invitation đang chạm từ cấu trúc cũ sang backend/src/modules/invitation; route/controller mỏng, service dùng repository interface và DTO. Client API adapter dùng contract chung; các màn hình sẽ lắp hook/JSX theo screen plan.

**Tech Stack:** TypeScript strict, Express 5, Mongoose 9, Zod 4, Vitest, Supertest, MongoMemoryReplSet; Next.js 16/React 19 cho adapter.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), yêu cầu FR-05; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F00, F03, F04, F06. **Screen consumers:** xem implementation guide.

## Global Constraints

- AGENTS.md là chuẩn bắt buộc: ObjectId/Mongoose/Zod, strict TS, constants dùng chung, audit/delFlag, repository-only DB, DI, global error envelope và TSDoc tiếng Anh.
- API trả DTO, không trả document Mongoose/secret; lỗi business dùng code ổn định; frontend chỉ gọi API qua adapter, UI logic ở hook.
- Mỗi task viết test thất bại trước, chạy test xanh, lint/typecheck và commit nhỏ; không chỉnh module ngoài phạm vi nếu không cần.
- Giữ giới hạn spec: nhóm riêng, 100 thành viên/nhóm, lịch sử từ joinedAt, DTO không lộ dữ liệu kín; phần không liên quan của MVP không được mở rộng.

## Review Focus

1. Hai join đồng thời khi còn một lượt.
2. nhóm đủ 100.
3. link bị thu hồi giữa preview và accept.
4. đã là thành viên.
5. token không hợp lệ.

## File ownership and interface

**Existing to migrate/modify:** backend/src/models/Conversation.ts; module invitation tạo ở F04.

**Module files:** backend/src/modules/invitation/{invitation.route.ts, invitation.controller.ts, invitation.service.ts, invitation.repository.ts, invitation.dto.ts}. Đăng ký module một lần tại backend/src/app.ts; bỏ route wiring cũ tương ứng.

**Service signatures:** InvitationService.preview(rawToken: string): Promise<InvitationPreviewDto>; accept(input: AcceptInvitationInput): Promise<GroupDto>. accept dùng MembershipService.addFromInvitation(input, tx) của F06 trong cùng TransactionContext với cập nhật useCount.

**HTTP contract:** GET /api/invitations/:token/preview; POST /api/invitations/:token/accept. Preview công khai chỉ lộ thông tin tối thiểu. Accept transaction kiểm tra group ACTIVE, token còn hạn/lượt, sức chứa; idempotent cho thành viên hiện tại và không tăng useCount.

**Frontend adapter:** previewInvitation, acceptInvitation in frontend/features/invitations/api/invitations.api.ts. File frontend/features/invitations/api/invitations.api.ts; typed result từ packages/contracts, không copy DTO.

### Task 1: Business rules and repository

**Files:** Service/repository/types/constants trong module trên; test backend/src/modules/invitation/invitation-join.service.test.ts.

- [x] Step 1: Viết test thất bại: should_not_increment_use_count_for_existing_member; should_allow_one_of_two_competing_final_uses; should_set_joinedAt_to_acceptance_time. Assertions cốt lõi: expect(successCount).toBe(1); expect(invitation.useCount).toBe(25); expect(member.joinedAt).toBeDefined().
- [x] Step 2: Chạy pnpm -C backend exec vitest run src/modules/invitation/invitation-join.service.test.ts; xác nhận FAIL do hành vi chưa có, không do lỗi harness.
- [x] Step 3: Viết repository interface + Mongoose repository và service signatures ở trên, áp dụng transaction khi nhiều bản ghi cùng thay đổi, constants/typed BusinessException; không gọi Mongoose trong service.
- [x] Step 4: Chạy lại test, backend typecheck; phải PASS. Commit domain task.

### Task 2: API boundary and integration

**Files:** Route/controller/dto/schema/mapper trong module; test backend/src/modules/invitation/invitation-join.route.test.ts.

- [x] Step 1: Viết test route/integration thất bại: public preview contains name/avatar/description/count only; invalid/expired/revoked 410; unauthenticated accept 401; full group 409. Assert status, envelope, code lỗi và DTO; dùng MongoDB test cô lập.
- [x] Step 2: Chạy pnpm -C backend exec vitest run src/modules/invitation/invitation-join.route.test.ts; xác nhận FAIL đúng lý do.
- [x] Step 3: Nối Zod middleware, auth/RBAC middleware, controller HTTP-only và DTO mapper; đăng ký route ở composition root, gỡ wiring cũ.
- [x] Step 4: Chạy lại test, pnpm -C backend typecheck và route smoke; phải PASS. Commit API task.

### Task 3: Client contract

**Files:** frontend/features/invitations/api/invitations.api.ts; test cùng thư mục tên invitation-join.api.test.ts.

- [ ] Step 1: Viết test adapter thất bại: preview adapter never caches token in persistent storage; accept returns destination group ID. Giả lập HTTP envelope, xác nhận mapping dữ liệu và ApiError.code.
- [ ] Step 2: Chạy pnpm -C frontend exec vitest run features/invitations/api/invitation-join.api.test.ts; xác nhận FAIL.
- [ ] Step 3: Viết adapter functions đã nêu, dùng shared HTTP client, constants và DTO package chung; không thêm state/JSX.
- [ ] Step 4: Chạy test, frontend typecheck/lint; phải PASS. Commit adapter task.

## Done when

FR-05 và 5 Review Focus có bằng chứng test; route cũ không còn hoạt động song song; spec và AGENTS.md được đối chiếu.
