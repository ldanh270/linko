# F03 — Tạo nhóm riêng Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Tạo GROUP conversation chỉ với chủ nhóm, tên/mô tả/ảnh đúng giới hạn.

**Architecture:** Migrate phần conversation đang chạm từ cấu trúc cũ sang backend/src/modules/conversation; route/controller mỏng, service dùng repository interface và DTO. Client API adapter dùng contract chung; các màn hình sẽ lắp hook/JSX theo screen plan.

**Tech Stack:** TypeScript strict, Express 5, Mongoose 9, Zod 4, Vitest, Supertest, MongoMemoryReplSet; Next.js 16/React 19 cho adapter.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), yêu cầu FR-03; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F00, F01. **Screen consumers:** xem implementation guide.

## Global Constraints

- AGENTS.md là chuẩn bắt buộc: ObjectId/Mongoose/Zod, strict TS, constants dùng chung, audit/delFlag, repository-only DB, DI, global error envelope và TSDoc tiếng Anh.
- API trả DTO, không trả document Mongoose/secret; lỗi business dùng code ổn định; frontend chỉ gọi API qua adapter, UI logic ở hook.
- Mỗi task viết test thất bại trước, chạy test xanh, lint/typecheck và commit nhỏ; không chỉnh module ngoài phạm vi nếu không cần.
- Giữ giới hạn spec: nhóm riêng, 100 thành viên/nhóm, lịch sử từ joinedAt, DTO không lộ dữ liệu kín; phần không liên quan của MVP không được mở rộng.

## Review Focus

1. Tên chỉ khoảng trắng.
2. avatar sai định dạng.
3. hai yêu cầu tạo cùng lúc vượt giới hạn 100 nhóm.
4. lưu Mongo thất bại sau upload.
5. Nhóm thứ 100 được tạo thành công, yêu cầu thứ 101 bị từ chối dù gửi đồng thời.

## File ownership and interface

**Existing to migrate/modify:** backend/src/routes/conversation.route.ts, backend/src/controllers/conversation.controller.ts, backend/src/services/conversation.service.ts, backend/src/models/Conversation.ts.

**Module files:** backend/src/modules/conversation/{conversation.route.ts, conversation.controller.ts, conversation.service.ts, conversation.repository.ts, conversation.dto.ts, conversation.schema.ts, conversation.constants.ts}. Đăng ký module một lần tại backend/src/app.ts; bỏ route wiring cũ tương ứng.

**Service signatures:** ConversationService.createGroup(input: CreateGroupInput): Promise<GroupDto>; updateGroup(input: UpdateGroupInput): Promise<GroupDto>. Group listing moved to the cursor-paginated InboxService in F07.

**HTTP contract:** POST /api/conversations and PATCH /api/conversations/:id. Owner được tạo nhóm một mình; không có memberIds bắt buộc. Tên 1–80, mô tả <=500; tối đa 100 nhóm/người, 100 thành viên/nhóm; group avatar dùng public R2. Owner/Admin được sửa thông tin nhóm. F07 owns GET /api/conversations and its `kind=group` filter.

**Frontend adapter:** createGroup and updateGroup in frontend/features/groups/api/groups.api.ts. Group inbox rows now come from listInbox in frontend/features/inbox/api/inbox.api.ts, with the typed F07 contract.

### Task 1: Business rules and repository

**Files:** Service/repository/types/constants trong module trên; test backend/src/modules/conversation/group-creation.service.test.ts.

- [ ] Step 1: Viết test thất bại: should_create_group_with_owner_only; should_reject_101st_group; should_reject_name_over_80_chars; should_allow_admin_to_update_group. Assertions cốt lõi: expect(group.participants).toEqual([{userId: ownerId, role: ROLE.OWNER}]); expect(limit.code).toBe(ERROR_CODES.GROUP_LIMIT). Group-list coverage moved to F07.
- [ ] Step 2: Chạy pnpm -C backend exec vitest run src/modules/conversation/group-creation.service.test.ts; xác nhận FAIL do hành vi chưa có, không do lỗi harness.
- [ ] Step 3: Viết repository interface + Mongoose repository và service signatures ở trên, áp dụng transaction khi nhiều bản ghi cùng thay đổi, constants/typed BusinessException; không gọi Mongoose trong service.
- [ ] Step 4: Chạy lại test, backend typecheck; phải PASS. Commit domain task.

### Task 2: API boundary and integration

**Files:** Route/controller/dto/schema/mapper trong module; test backend/src/modules/conversation/group-creation.route.test.ts.

- [ ] Step 1: Viết test route/integration thất bại: POST trả 201 GroupDto; PATCH kiểm tra Owner/Admin; 400 cho tên trống/quá dài hoặc mô tả >500; 401 không có phiên. Assert status, envelope, code lỗi và DTO; dùng MongoDB test cô lập. Group listing is covered by F07.
- [ ] Step 2: Chạy pnpm -C backend exec vitest run src/modules/conversation/group-creation.route.test.ts; xác nhận FAIL đúng lý do.
- [ ] Step 3: Nối Zod middleware, auth/RBAC middleware, controller HTTP-only và DTO mapper; đăng ký route ở composition root, gỡ wiring cũ.
- [ ] Step 4: Chạy lại test, pnpm -C backend typecheck và route smoke; phải PASS. Commit API task.

### Task 3: Client contract

**Files:** frontend/features/groups/api/groups.api.ts; test cùng thư mục tên group-creation.api.test.ts.

- [ ] Step 1: Viết test adapter thất bại: createGroup gửi FormData khi có avatar và JSON khi không; updateGroup ánh xạ đúng DTO/code lỗi. Giả lập HTTP envelope, xác nhận mapping dữ liệu và ApiError.code. Inbox rows are covered by F07's listInbox adapter.
- [ ] Step 2: Chạy pnpm -C frontend exec vitest run features/groups/api/group-creation.api.test.ts; xác nhận FAIL.
- [ ] Step 3: Viết adapter functions đã nêu, dùng shared HTTP client, constants và DTO package chung; không thêm state/JSX.
- [ ] Step 4: Chạy test, frontend typecheck/lint; phải PASS. Commit adapter task.

## Done when

FR-03 và 5 Review Focus có bằng chứng test; route cũ không còn hoạt động song song; spec và AGENTS.md được đối chiếu.
