# F01 — Tài khoản và phiên Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Đăng ký, đăng nhập, refresh xoay vòng và đăng xuất an toàn với envelope thống nhất.

**Architecture:** Migrate phần auth đang chạm từ cấu trúc cũ sang backend/src/modules/auth; route/controller mỏng, service dùng repository interface và DTO. Client API adapter dùng contract chung; các màn hình sẽ lắp hook/JSX theo screen plan.

**Tech Stack:** TypeScript strict, Express 5, Mongoose 9, Zod 4, Vitest, Supertest, MongoMemoryReplSet; Next.js 16/React 19 cho adapter.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), yêu cầu FR-01; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F00. **Screen consumers:** xem implementation guide.

## Global Constraints

- AGENTS.md là chuẩn bắt buộc: ObjectId/Mongoose/Zod, strict TS, constants dùng chung, audit/delFlag, repository-only DB, DI, global error envelope và TSDoc tiếng Anh.
- API trả DTO, không trả document Mongoose/secret; lỗi business dùng code ổn định; frontend chỉ gọi API qua adapter, UI logic ở hook.
- Mỗi task viết test thất bại trước, chạy test xanh, lint/typecheck và commit nhỏ; không chỉnh module ngoài phạm vi nếu không cần.
- Giữ giới hạn spec: nhóm riêng, 100 thành viên/nhóm, lịch sử từ joinedAt, DTO không lộ dữ liệu kín; phần không liên quan của MVP không được mở rộng.

## Review Focus

1. Trùng username/email.
2. cookie thiếu/hết hạn.
3. refresh token tái sử dụng.
4. logout từ phiên đã hết.
5. không log mật khẩu/token.

## File ownership and interface

**Existing to migrate/modify:** backend/src/routes/auth.route.ts, backend/src/controllers/auth.controller.ts, backend/src/services/auth.service.ts, backend/src/models/Session.ts (sửa kiểu refreshToken đang dùng nhầm Zod string), backend/src/index.ts (CORS credentials).

**Module files:** backend/src/modules/auth/{auth.route.ts, auth.controller.ts, auth.service.ts, auth.repository.ts, auth.dto.ts, auth.schema.ts, auth.constants.ts}. Đăng ký module một lần tại backend/src/app.ts; bỏ route wiring cũ tương ứng.

**Service signatures:** AuthService.signup(input: SignupInput): Promise<UserDto>; login(input: LoginInput): Promise<AuthTokens>; refresh(refreshToken: string): Promise<AuthTokens>; logout(refreshToken: string): Promise<void>.

**HTTP contract:** POST /api/auth/signup, /login, /refresh-token, /logout. Access token ở bộ nhớ client, refresh token trong HttpOnly cookie; backend lưu hash refresh token, xoay vòng mỗi lần refresh. Signup trả UserDto và dẫn tới đăng nhập; logout trả 200 envelope. Cookie Secure/SameSite lấy từ cấu hình môi trường hợp lệ cho dev HTTPS/production, cùng tên refreshToken khi set/clear. CORS chỉ cho origin frontend đã cấu hình và credentials. Không đưa token vào localStorage.

**Frontend adapter:** signup, login, refreshSession, logout in frontend/features/auth/api/auth.api.ts; frontend/features/auth/hooks/useSession.ts giữ access token trong memory và xử lý refresh; frontend/features/auth/components/ProtectedAppShell.tsx là client component dùng hook; frontend/app/(app)/layout.tsx chỉ compose component này. Typed result từ packages/contracts, không copy DTO.

### Task 1: Business rules and repository

**Files:** Service/repository/types/constants trong module trên; test backend/src/modules/auth/auth.service.test.ts.

- [x] Step 1: Viết test thất bại: should_reject_duplicate_username_with_conflict_code; should_rotate_refresh_token_once; should_invalidate_session_on_logout. Assertions cốt lõi: expect(duplicate.code).toBe(ERROR_CODES.USERNAME_TAKEN); expect(secondRefresh).toRejectWithCode(ERROR_CODES.INVALID_SESSION).
- [x] Step 2: Chạy pnpm -C backend exec vitest run src/modules/auth/auth.service.test.ts; xác nhận FAIL do hành vi chưa có, không do lỗi harness.
- [x] Step 3: Viết repository interface + Mongoose repository và service signatures ở trên, áp dụng transaction khi nhiều bản ghi cùng thay đổi, constants/typed BusinessException; không gọi Mongoose trong service.
- [x] Step 4: Chạy lại test, backend typecheck; phải PASS. Commit domain task.

**Task 1 evidence:** auth service tests passed (4/4), including duplicate username/email, one-time refresh rotation, and logout revocation. Domain implementation is in `6a8fb53`.

### Task 2: API boundary and integration

**Files:** Route/controller/dto/schema/mapper trong module; test backend/src/modules/auth/auth.route.test.ts.

- [x] Step 1: Viết test route/integration thất bại: signup 201 envelope; invalid password 400; login 200 with HttpOnly refresh cookie; logout clears exact refreshToken cookie; technical error generic 500. Assert status, envelope, code lỗi và DTO; dùng MongoDB test cô lập.
- [x] Step 2: Chạy pnpm -C backend exec vitest run src/modules/auth/auth.route.test.ts; xác nhận FAIL đúng lý do.
- [x] Step 3: Nối Zod middleware, auth/RBAC middleware, controller HTTP-only và DTO mapper; đăng ký route ở composition root, gỡ wiring cũ.
- [x] Step 4: Chạy lại test, pnpm -C backend typecheck và route smoke; phải PASS. Commit API task.

**Task 2 evidence:** auth route tests passed (8/8), covering signup envelope, password validation, hashed-only session persistence, cookie flags/rotation, replay and expiry handling, exact logout clearing, and generic 500 responses. The active composition root uses the module router; route code is in `4d04184`.

### Task 3: Client contract

**Files:** frontend/features/auth/api/auth.api.ts, frontend/features/auth/hooks/useSession.ts, frontend/features/auth/components/ProtectedAppShell.tsx, frontend/app/(app)/layout.tsx; tests frontend/features/auth/api/auth.api.test.ts and frontend/features/auth/hooks/useSession.test.ts.

- [x] Step 1: Viết test adapter và useSession thất bại: 401 trigger một refresh rồi retry đúng một lần; nhiều 401 dùng chung một refresh; refresh thất bại xóa memory token và đưa về /login; route (app) không hiện dữ liệu khi chưa xác thực.
- [x] Step 2: Chạy pnpm -C frontend exec vitest run features/auth/api/auth.api.test.ts features/auth/hooks/useSession.test.ts; xác nhận FAIL.
- [x] Step 3: Viết adapter functions, hook session và ProtectedAppShell client component; (app) layout chỉ compose, không gọi hook trong Server Component. Dùng shared HTTP client/constants/DTO, không lưu access token ở localStorage và không đặt logic vào JSX.
- [x] Step 4: Chạy hai test, frontend typecheck/lint; phải PASS. Commit client auth task.

**Task 3 evidence:** auth adapter/session tests passed (5/5), covering one refresh retry, concurrent single-flight refresh, retry limit, token clearing, redirect, and hidden protected content. Frontend typecheck and auth-file lint passed. Client implementation is in `714f899`.

## Done when

FR-01 and all five Review Focus cases have test evidence, including duplicate identities, missing/expired cookies, refresh replay, expired logout, and generic/redacted technical errors. The active composition root registers only the module route; spec and AGENTS.md were checked. **F01 complete.**
