# F10 — Tệp đính kèm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Gửi tối đa 5 tệp 10 MiB và tải qua endpoint kiểm tra quyền, kể cả joinedAt.

**Architecture:** Module backend/src/modules/attachment sở hữu hành vi; controller HTTP-only, service qua interface, repository Mongoose. Adapter frontend dùng shared HTTP client và packages/contracts; màn hình lắp hook/JSX riêng.

**Tech Stack:** TypeScript strict, Express 5, Mongoose 9, Zod 4, Vitest/Supertest/MongoMemoryReplSet; Next.js 16/React 19 cho adapter.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), FR-10; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F08, F06. **Screen consumers:** xem implementation guide.

## Global Constraints

- AGENTS.md bắt buộc: ObjectId/Mongoose/Zod, strict TS, constants dùng chung, audit/delFlag, repository-only DB, DI, global error envelope, TSDoc tiếng Anh.
- Không trả document/secret; lỗi business dùng code, lỗi kỹ thuật vào global handler. FE adapter dùng contract chung, không có JSX/state.
- Mỗi task có test thất bại → triển khai tối thiểu → test xanh → typecheck/lint → commit.
- Giữ giới hạn spec: nhóm riêng, 100 thành viên/nhóm, lịch sử từ joinedAt; DTO không lộ dữ liệu kín. Không thêm tính năng sau MVP.

## Review Focus

1. Sai signature dù MIME đúng.
2. file thứ sáu.
3. R2 upload thành công nhưng Mongo fail.
4. member bị loại.
5. URL cũ trước joinedAt.

## File ownership and interface

**Existing to migrate/modify:** backend/src/services/messageAttachment.service.ts, backend/src/controllers/message.controller.ts, backend/src/configs/uploadPolicy.config.ts.

**Module files:** backend/src/modules/attachment/{attachment.route.ts, attachment.controller.ts, attachment.service.ts, attachment.repository.ts, attachment.dto.ts, attachment.constants.ts}. Đăng ký một lần tại backend/src/app.ts; bỏ wiring cũ tương ứng.

**Service signatures:** AttachmentService.store(input: StoreAttachmentsInput): Promise<StoredAttachment[]>; download(input: DownloadAttachmentInput): Promise<AttachmentStream>.

**HTTP contract:** POST /api/messages multipart; GET /api/messages/:messageId/attachments/:attachmentId. Giữ định dạng và giới hạn upload hiện có; private R2 không có public URL. Download kiểm tra membership active + message.createdAt >= joinedAt mỗi lần.

**Frontend adapter:** sendMessageFiles, downloadAttachment in frontend/features/chat/api/attachments.api.ts. File frontend/features/chat/api/attachments.api.ts; typed result từ packages/contracts.

### Task 1: Business rules and repository

**Files:** service/repository/types/constants trong module trên; test backend/src/modules/attachment/attachments.service.test.ts.

- [x] Step 1: Viết test thất bại: should_reject_6th_file_before_upload; should_delete_new_objects_when_message_write_fails; should_deny_file_before_joinedAt. Assertions cốt lõi: expect(uploadCount).toBe(0); expect(deleteCount).toBe(storedCount); expect(denied.code).toBe(ERROR_CODES.ATTACHMENT_NOT_FOUND).
- [x] Step 2: Chạy pnpm -C backend exec vitest run src/modules/attachment/attachments.service.test.ts; xác nhận FAIL đúng hành vi.
- [x] Step 3: Viết repository interface + Mongoose repository và service signatures ở trên; transaction khi nhiều bản ghi thay đổi; constants/typed BusinessException; không gọi Mongoose trong service.
- [x] Step 4: Chạy lại test và backend typecheck; phải PASS. Commit domain task.

**Task 1 evidence:** the initial red run failed because the attachment service module did not exist. The implemented tests then passed (3/3), the affected backend service suites passed (20/20), route regressions passed (14/14), and backend/frontend typechecks passed. Domain commit: `b3f82a8`.

### Task 2: API boundary and integration

**Files:** route/controller/dto/schema/mapper trong module; test backend/src/modules/attachment/attachments.route.test.ts.

- [ ] Step 1: Viết test route thất bại: supported MIME/signature accepted; unsupported/oversize 400; unauthorized/nonmember/pre-join download 404; no R2 key leaked. Assert status, envelope, error code và DTO; dùng MongoDB test cô lập.
- [ ] Step 2: Chạy pnpm -C backend exec vitest run src/modules/attachment/attachments.route.test.ts; xác nhận FAIL đúng lý do.
- [ ] Step 3: Nối Zod, auth/RBAC middleware, controller HTTP-only và DTO mapper; đăng ký route tại composition root, bỏ wiring cũ.
- [ ] Step 4: Chạy test, backend typecheck và route smoke; phải PASS. Commit API task.

### Task 3: Client contract

**Files:** frontend/features/chat/api/attachments.api.ts; test frontend/features/chat/api/attachments.api.test.ts.

- [ ] Step 1: Viết test adapter thất bại: adapter streams authenticated blob, revokes object URL, abort handles navigation; giả lập envelope và xác nhận ApiError.code.
- [ ] Step 2: Chạy pnpm -C frontend exec vitest run features/chat/api/attachments.api.test.ts; xác nhận FAIL.
- [ ] Step 3: Viết adapter functions đã nêu, dùng shared HTTP client/constants/DTO package; không thêm JSX hoặc state.
- [ ] Step 4: Chạy test, frontend typecheck/lint; phải PASS. Commit adapter task.

## Done when

FR-10 và 5 Review Focus có bằng chứng test; route cũ không hoạt động song song; spec/AGENTS.md được đối chiếu.
