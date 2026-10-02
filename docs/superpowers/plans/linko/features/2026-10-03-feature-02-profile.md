# F02 — Hồ sơ người dùng Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Xem và sửa hồ sơ, avatar, ảnh nền với xác thực và lỗi có thể hiển thị.

**Architecture:** Migrate phần user đang chạm từ cấu trúc cũ sang backend/src/modules/user; route/controller mỏng, service dùng repository interface và DTO. Client API adapter dùng contract chung; các màn hình sẽ lắp hook/JSX theo screen plan.

**Tech Stack:** TypeScript strict, Express 5, Mongoose 9, Zod 4, Vitest, Supertest, MongoMemoryReplSet; Next.js 16/React 19 cho adapter.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), yêu cầu FR-02; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F00, F01. **Screen consumers:** xem implementation guide.

## Global Constraints

- AGENTS.md là chuẩn bắt buộc: ObjectId/Mongoose/Zod, strict TS, constants dùng chung, audit/delFlag, repository-only DB, DI, global error envelope và TSDoc tiếng Anh.
- API trả DTO, không trả document Mongoose/secret; lỗi business dùng code ổn định; frontend chỉ gọi API qua adapter, UI logic ở hook.
- Mỗi task viết test thất bại trước, chạy test xanh, lint/typecheck và commit nhỏ; không chỉnh module ngoài phạm vi nếu không cần.
- Giữ giới hạn spec: nhóm riêng, 100 thành viên/nhóm, lịch sử từ joinedAt, DTO không lộ dữ liệu kín; phần không liên quan của MVP không được mở rộng.

## Review Focus

1. Email/username trùng.
2. ảnh quá 10 MiB.
3. R2 lỗi.
4. chỉnh trường rỗng.
5. không lộ email/phone trong hồ sơ công khai.

## File ownership and interface

**Existing to migrate/modify:** backend/src/routes/user.route.ts, backend/src/controllers/user.controller.ts, backend/src/services/user.service.ts.

**Module files:** backend/src/modules/user/{user.route.ts, user.controller.ts, user.service.ts, user.repository.ts, user.dto.ts, user.mapper.ts, user.schema.ts, user.constants.ts}. Đăng ký module một lần tại backend/src/app.ts; bỏ route wiring cũ tương ứng.

**Service signatures:** UserService.getMine(userId: ObjectId): Promise<UserDto>; getPublic(userId: ObjectId): Promise<PublicUserDto>; updateMine(input: UpdateProfileInput): Promise<UserDto>.

**HTTP contract:** GET /api/users/me, GET /api/users/:userId, PATCH /api/users/me. Ảnh public qua R2, giới hạn 10 MiB, resize tối đa 800 px theo backend hiện có; PublicUserDto không có email, phone, audit hoặc token.

**Frontend adapter:** getMine, getPublicUser, updateMine in frontend/features/profile/api/profile.api.ts. File frontend/features/profile/api/profile.api.ts; typed result từ packages/contracts, không copy DTO.

### Task 1: Business rules and repository

**Files:** Service/repository/types/constants trong module trên; test backend/src/modules/user/profile.service.test.ts.

- [x] Step 1: Viết test thất bại: should_reject_duplicate_email_without_changing_profile; should_reject_unsupported_avatar; should_replace_image_after_save. Assertions cốt lõi: expect(conflict.code).toBe(ERROR_CODES.EMAIL_TAKEN); expect(profile.avatar.url).toBe(previousUrl).
- [x] Step 2: Chạy pnpm -C backend exec vitest run src/modules/user/profile.service.test.ts; xác nhận FAIL do hành vi chưa có, không do lỗi harness.
- [x] Step 3: Viết repository interface + Mongoose repository và service signatures ở trên, áp dụng transaction khi nhiều bản ghi cùng thay đổi, constants/typed BusinessException; không gọi Mongoose trong service.
- [x] Step 4: Chạy lại test, backend typecheck; phải PASS. Commit domain task.

### Task 2: API boundary and integration

**Files:** Route/controller/dto/schema/mapper trong module; test backend/src/modules/user/profile.route.test.ts.

- [x] Step 1: Viết test route/integration thất bại: GET mine excludes hashedPassword/audit/IP; PATCH multipart accepts JPEG/PNG/WebP <=10 MiB; unauthenticated 401. Assert status, envelope, code lỗi và DTO; dùng MongoDB test cô lập.
- [x] Step 2: Chạy pnpm -C backend exec vitest run src/modules/user/profile.route.test.ts; xác nhận FAIL đúng lý do.
- [x] Step 3: Nối Zod middleware, auth/RBAC middleware, controller HTTP-only và DTO mapper; đăng ký route ở composition root, gỡ wiring cũ.
- [x] Step 4: Chạy lại test, pnpm -C backend typecheck và route smoke; phải PASS. Commit API task.

### Task 3: Client contract

**Files:** frontend/features/profile/api/profile.api.ts; test cùng thư mục tên profile.api.test.ts.

- [ ] Step 1: Viết test adapter thất bại: profile adapter sends FormData with avatar/background and text fields; maps 409 to ApiError code. Giả lập HTTP envelope, xác nhận mapping dữ liệu và ApiError.code.
- [ ] Step 2: Chạy pnpm -C frontend exec vitest run features/profile/api/profile.api.test.ts; xác nhận FAIL.
- [ ] Step 3: Viết adapter functions đã nêu, dùng shared HTTP client, constants và DTO package chung; không thêm state/JSX.
- [ ] Step 4: Chạy test, frontend typecheck/lint; phải PASS. Commit adapter task.

## Done when

FR-02 và 5 Review Focus có bằng chứng test; route cũ không còn hoạt động song song; spec và AGENTS.md được đối chiếu.
