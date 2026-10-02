# F04 — Phát hành và thu hồi lời mời Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Tạo link mời bí mật có hạn và số lượt, xem metadata, thu hồi được ngay.

**Architecture:** Migrate phần invitation đang chạm từ cấu trúc cũ sang backend/src/modules/invitation; route/controller mỏng, service dùng repository interface và DTO. Client API adapter dùng contract chung; các màn hình sẽ lắp hook/JSX theo screen plan.

**Tech Stack:** TypeScript strict, Express 5, Mongoose 9, Zod 4, Vitest, Supertest, MongoMemoryReplSet; Next.js 16/React 19 cho adapter.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), yêu cầu FR-04; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F00, F03, F06. **Screen consumers:** xem implementation guide.

## Global Constraints

- AGENTS.md là chuẩn bắt buộc: ObjectId/Mongoose/Zod, strict TS, constants dùng chung, audit/delFlag, repository-only DB, DI, global error envelope và TSDoc tiếng Anh.
- API trả DTO, không trả document Mongoose/secret; lỗi business dùng code ổn định; frontend chỉ gọi API qua adapter, UI logic ở hook.
- Mỗi task viết test thất bại trước, chạy test xanh, lint/typecheck và commit nhỏ; không chỉnh module ngoài phạm vi nếu không cần.
- Giữ giới hạn spec: nhóm riêng, 100 thành viên/nhóm, lịch sử từ joinedAt, DTO không lộ dữ liệu kín; phần không liên quan của MVP không được mở rộng.

## Review Focus

1. Token trong logs/referrer.
2. member tự tạo lời mời.
3. cùng token dùng sau thu hồi.
4. cố sao chép link cũ từ danh sách.
5. Tạo link lần nữa không làm link cũ còn hiệu lực vượt giới hạn nhóm.

## File ownership and interface

**Existing to migrate/modify:** backend/src/models/Conversation.ts, backend/src/routes/conversation.route.ts.

**Module files:** backend/src/modules/invitation/{invitation.route.ts, invitation.controller.ts, invitation.service.ts, invitation.repository.ts, invitation.dto.ts, invitation.constants.ts, Invitation.ts}. Đăng ký module một lần tại backend/src/app.ts; bỏ route wiring cũ tương ứng.

**Service signatures:** InvitationService.issue(input: IssueInvitationInput): Promise<IssuedInvitationDto>; list(conversationId: ObjectId): Promise<InvitationSummaryDto[]>; revoke(invitationId: ObjectId): Promise<void>.

**HTTP contract:** POST/GET /api/conversations/:id/invitations; DELETE /api/conversations/:id/invitations/:invitationId. Token 32 byte ngẫu nhiên, lưu SHA-256; expiresAt = createdAt + 7 ngày, maxUses=25. URL chỉ trả một lần lúc tạo; danh sách chỉ có metadata, UI tạo link mới nếu đã mất URL.

**Frontend adapter:** issueInvitation, listInvitations, revokeInvitation in frontend/features/invitations/api/invitations.api.ts. File frontend/features/invitations/api/invitations.api.ts; typed result từ packages/contracts, không copy DTO.

### Task 1: Business rules and repository

**Files:** Service/repository/types/constants trong module trên; test backend/src/modules/invitation/invitation-issue.service.test.ts.

- [x] Step 1: Viết test thất bại: should_store_only_sha256_token_hash; should_expire_after_7_days; should_revoke_immediately. Assertions cốt lõi: expect(saved.tokenHash).toHaveLength(64); expect(saved).not.toHaveProperty('token'); expect(revoked.revokedAt).not.toBeNull().
- [x] Step 2: Chạy pnpm -C backend exec vitest run src/modules/invitation/invitation-issue.service.test.ts; xác nhận FAIL do hành vi chưa có, không do lỗi harness.
- [x] Step 3: Viết repository interface + Mongoose repository và service signatures ở trên, áp dụng transaction khi nhiều bản ghi cùng thay đổi, constants/typed BusinessException; không gọi Mongoose trong service.
- [x] Step 4: Chạy lại test, backend typecheck; phải PASS. Commit domain task.

### Task 2: API boundary and integration

**Files:** Route/controller/dto/schema/mapper trong module; test backend/src/modules/invitation/invitation-issue.route.test.ts.

- [x] Step 1: Viết test route/integration thất bại: owner/admin 201, member 403; list omits raw token; revoke 200; expired link 410 via preview. Assert status, envelope, code lỗi và DTO; dùng MongoDB test cô lập.
- [x] Step 2: Chạy pnpm -C backend exec vitest run src/modules/invitation/invitation-issue.route.test.ts; xác nhận FAIL đúng lý do.
- [x] Step 3: Nối Zod middleware, auth/RBAC middleware, controller HTTP-only và DTO mapper; đăng ký route ở composition root, gỡ wiring cũ.
- [x] Step 4: Chạy lại test, pnpm -C backend typecheck và route smoke; phải PASS. Commit API task.

### Task 3: Client contract

**Files:** frontend/features/invitations/api/invitations.api.ts; test cùng thư mục tên invitation-issue.api.test.ts.

- [ ] Step 1: Viết test adapter thất bại: issue response exposes one-time URL only; list adapter exposes summary without URL. Giả lập HTTP envelope, xác nhận mapping dữ liệu và ApiError.code.
- [ ] Step 2: Chạy pnpm -C frontend exec vitest run features/invitations/api/invitation-issue.api.test.ts; xác nhận FAIL.
- [ ] Step 3: Viết adapter functions đã nêu, dùng shared HTTP client, constants và DTO package chung; không thêm state/JSX.
- [ ] Step 4: Chạy test, frontend typecheck/lint; phải PASS. Commit adapter task.

## Done when

FR-04 và 5 Review Focus có bằng chứng test; route cũ không còn hoạt động song song; spec và AGENTS.md được đối chiếu.
