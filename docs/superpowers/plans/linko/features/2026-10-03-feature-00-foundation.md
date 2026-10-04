# F00 — Engineering Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Tạo nền contract, lỗi, audit, test và UI dùng chung để các plan Linko còn lại tuân AGENTS.md.

**Architecture:** Giữ MongoDB/Mongoose hiện có; đưa cross-cutting vào backend/src/shared, một composition root và một package contract dùng chung. Frontend dùng API client/query provider, theme tokens và primitives; route/page không chứa logic.

**Tech Stack:** TypeScript strict, Express 5, Mongoose 9, Zod 4, Next.js 16, React 19, Tailwind 4, Vitest, React Testing Library, Supertest, MongoMemoryReplSet, Playwright.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md) · [AGENTS.md](../../../../../AGENTS.md)

## Global Constraints

- Theo guide: ObjectId cho PK/FK, text constants as const cho enum, Date UTC, delFlag Boolean false, Mongoose/Zod; API envelope { success, data, error, meta }.
- Controllers chỉ HTTP, services constructor injection qua interface, repository duy nhất truy cập DB. Không sao chép constants FE/BE, không any hoặc console.log.
- Lỗi business không log; lỗi kỹ thuật log JSON có requestId và trả 500 chung. Audit tự động, soft-delete mặc định, không sửa các collection ngoài migration có kiểm soát.
- FE: JSX riêng, hook riêng; shared button đủ hover/active/focus/disabled/loading; theme theo spec; WCAG 2.2 AA.

## Review Focus

1. Một lỗi Zod hoặc JWT hết hạn phải thành 4xx có code ổn định, không bị log như technical error.
2. Một lỗi DB không mong đợi phải thành 500 chung có requestId; log có stack nhưng không có password/token.
3. find/count/aggregate không vô tình trả bản ghi delFlag=true; chỉ đường includeDeleted có tên mới thấy.
4. Dữ liệu cũ thiếu audit fields vẫn đọc được trong lúc backfill; không ghi IP giả làm IP thật.
5. Tests dùng DB cô lập; suite không chạm MongoDB đã cấu hình của máy phát triển.

---

### Task 1: Khóa quyết định và test harness

**Files:**
- Modify: AGENTS.md Section 0, backend/tsconfig.json, backend/package.json, frontend/package.json, package.json
- Create: pnpm-workspace.yaml, packages/contracts/package.json, packages/contracts/src/index.ts, packages/contracts/src/envelope.ts, packages/contracts/src/constants.ts, backend/src/shared/contracts.test.ts
- Create: backend/vitest.config.ts, frontend/vitest.config.ts, frontend/playwright.config.ts, backend/test/setup.ts, frontend/test/setup.ts

**Interfaces:**
- Produce: ApiSuccess<T> / ApiFailure; API_ROUTES, ERROR_CODES, ROLE, SOCKET_EVENTS as const in packages/contracts.
- Produce scripts: pnpm -C backend test/typecheck, pnpm -C frontend test/typecheck, pnpm -C frontend exec playwright test; root pnpm lint/typecheck/test/build lần lượt tổng hợp hai package.

- [x] Step 1: Write contract tests asserting the four envelope keys, ObjectId-string DTO identity, and text role values; run pnpm -C backend exec vitest run src/shared/contracts.test.ts and verify FAIL because the contract package is absent.
- [x] Step 2: Fill AGENTS.md Section 0 with inferred choices; add workspace/contract package, strict backend tsconfig and test dependencies/scripts. Do not replace Mongoose with Prisma or ObjectId with UUID.
- [x] Step 3: Run both typechecks and contract test; expect PASS. Commit only decisions, contract and harness files.

**Task 1 evidence:** the shared-contract suite passed (3/3), and both package typechecks passed. Contract/harness implementation is in `4aa2d77`.

### Task 2: HTTP boundary, logger and composition root

**Files:**
- Create: backend/src/app.ts, backend/src/shared/errors/BusinessException.ts, backend/src/shared/middlewares/globalErrorHandler.ts, backend/src/shared/middlewares/requestContext.ts, backend/src/shared/logger/logger.ts, backend/src/shared/http/ApiResponse.ts
- Modify: backend/src/index.ts
- Test: backend/src/shared/http/httpBoundary.test.ts

**Interfaces:**
- Produce: createApp(dependencies: AppDependencies): Express; BusinessException(code: ErrorCode, httpStatus: number, message: string); ApiResponse.ok<T>(data: T); ApiResponse.fail(error: ApiError).
- The logger receives requestId/userId from AsyncLocalStorage, redacts password, cookie, authorization and invite tokens.

- [x] Step 1: Write route tests: business exception returns its 4xx/code without logging; unexpected Error returns generic 500/requestId and one redacted structured log; malformed JSON maps to a safe 400. Run pnpm -C backend exec vitest run src/shared/http/httpBoundary.test.ts; expect FAIL.
- [x] Step 2: Implement shared HTTP boundary and composition root; register one error handler last. Adapt existing route wiring incrementally without adding duplicate active routes.
- [x] Step 3: Run focused test, backend typecheck and existing route smoke tests; expect PASS. Commit boundary work.

**Task 2 evidence:** HTTP-boundary tests passed (7/7), including safe business/technical failures, redaction, malformed JSON, Zod, JWT, and CORS. Boundary implementation is in `56d32d7`.

### Task 3: Mongoose audit, soft delete and legacy migration

**Files:**
- Create: backend/src/shared/persistence/auditPlugin.ts, backend/src/shared/persistence/softDeletePlugin.ts, backend/src/shared/persistence/withTransaction.ts, backend/scripts/backfillAudit.ts
- Modify: backend/src/models/User.ts, Session.ts, Friendship.ts, FriendRequest.ts, Conversation.ts, Message.ts
- Test: backend/src/shared/persistence/persistence.integration.test.ts

**Interfaces:**
- Produce: auditPlugin(schema), softDeletePlugin(schema), withTransaction<T>(operation: (tx: TransactionContext) => Promise<T>): Promise<T>. TransactionContext là port trong shared/persistence; adapter Mongoose giữ ClientSession ở lớp hạ tầng.
- Audit fields: createdAt, updatedAt, createdBy, updatedBy, createdIp, updatedIp, delFlag. Legacy backfill uses SYSTEM ObjectId for unknown actor and null IP for historical unknown address.

- [x] Step 1: Write integration tests with MongoMemoryReplSet/wiredTiger: create/update fills actor/IP; find/count/aggregate hide delFlag=true; explicit includeDeleted returns it; transaction rollback leaves no partial writes. Run pnpm -C backend exec vitest run src/shared/persistence/persistence.integration.test.ts; expect FAIL.
- [x] Step 2: Implement plugins/context and an idempotent backfill with dry-run. Plan index changes before write: partial unique indexes for active records; remove Session TTL index only after backup/dry-run so expiry becomes a soft-delete lifecycle. Document rollback and any irreversible index/data operation in script README.
- [x] Step 3: Run integration suite against isolated replica set, backend typecheck and backfill dry-run on test DB. Verify repeated backfill changes zero records. Commit migration code; do not run against production in this task.

**Task 3 evidence:** isolated persistence tests passed (12/12), covering actor/IP audit, default soft-delete filtering, `includeDeleted`, transaction rollback, historical rows, bulk writes, idempotent backfill, and guarded index changes. Persistence work is in `27c6701` and `89b380f`.

### Task 4: Frontend foundation and shared state

**Files:**
- Create: frontend/shared/http/client.ts, frontend/shared/http/ApiError.ts, frontend/shared/query/QueryProvider.tsx, frontend/shared/url/useQueryParamState.ts, frontend/shared/theme/tokens.css, frontend/shared/theme/ThemeProvider.tsx, frontend/shared/theme/useTheme.ts, frontend/shared/components/Button.tsx, IconButton.tsx, Link.tsx, Input.tsx, EmptyState.tsx, ErrorState.tsx, LoadingState.tsx, ToastProvider.tsx, frontend/shared/layout/AppShell.tsx, frontend/shared/layout/useAppShell.ts, frontend/app/(app)/layout.tsx
- Modify: frontend/app/layout.tsx, frontend/app/globals.css
- Test: frontend/shared/components/Button.test.tsx, frontend/shared/url/useQueryParamState.test.ts, frontend/shared/theme/useTheme.test.ts

**Interfaces:**
- Produce: apiClient.request<T>(options: RequestOptions): Promise<T>; useQueryParamState<T>(key, schema, defaultValue); useTheme(): { mode: 'light' | 'dark' | 'system'; setMode(mode): void }; ButtonProps with variant/size/loading/disabled.
- Session token handling belongs to F01; client normalizes ApiError and leaves auth injection configurable.

- [x] Step 1: Write tests for button keyboard/focus/loading/double-submit, URL replace/push/default/invalid-param, and theme light/dark/system preference. Run pnpm -C frontend exec vitest run shared/components/Button.test.tsx shared/url/useQueryParamState.test.ts shared/theme/useTheme.test.ts; expect FAIL.
- [x] Step 2: Implement tokens/Be Vietnam Pro, primitives, theme provider với chế độ light/dark/system, shared toast provider, HTTP error normalization, query provider, URL hook và responsive AppShell (rail + mobile bottom navigation). Protected-route guard is wired by F01. Keep JSX files presentation-only and put state in hooks.
- [x] Step 3: Run focused tests, frontend lint/typecheck/build and Playwright smoke at 360/1440 px; expect PASS. Commit frontend foundation.

**Task 4 evidence:** shared UI tests passed (8/8), frontend lint/typecheck and production build passed. The viewport smoke now mocks the refresh endpoint so it tests the shell behind F01's intended guard; Playwright passed at 360px and 1440px. Frontend foundation is in `1fc1cbe`; smoke correction is in `93834d0`.

## Completion

All future plan files may assume the contract package, test commands, error boundary, audit/soft-delete behavior and shared UI primitives above. Record any AGENTS.md deviation with a written reason before proceeding. **F00 complete.**
