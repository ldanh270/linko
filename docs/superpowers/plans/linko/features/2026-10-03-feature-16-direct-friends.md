# F16 — Bạn bè và chat riêng Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Kết bạn, chỉ một DM/cặp và từ chối gửi khi đã hủy bạn.

**Architecture:** Module backend/src/modules/friend sở hữu hành vi; controller HTTP-only, service qua interface, repository Mongoose. Adapter frontend dùng shared HTTP client và packages/contracts; màn hình lắp hook/JSX riêng.

**Tech Stack:** TypeScript strict, Express 5, Mongoose 9, Zod 4, Vitest/Supertest/MongoMemoryReplSet; Next.js 16/React 19 cho adapter.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), FR-16; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F01, F08. **Screen consumers:** xem implementation guide.

## Global Constraints

- AGENTS.md bắt buộc: ObjectId/Mongoose/Zod, strict TS, constants dùng chung, audit/delFlag, repository-only DB, DI, global error envelope, TSDoc tiếng Anh.
- Không trả document/secret; lỗi business dùng code, lỗi kỹ thuật vào global handler. FE adapter dùng contract chung, không có JSX/state.
- Mỗi task có test thất bại → triển khai tối thiểu → test xanh → typecheck/lint → commit.
- Giữ giới hạn spec: nhóm riêng, 100 thành viên/nhóm, lịch sử từ joinedAt; DTO không lộ dữ liệu kín. Không thêm tính năng sau MVP.

## Review Focus

1. Hai request kết bạn ngược chiều.
2. accept/decline cùng lúc.
3. hai tab mở DM.
4. hủy bạn rồi gửi bằng conversationId.
5. user search GET body cũ.

## File ownership and interface

**Existing to migrate/modify:** backend/src/routes/friend.route.ts, backend/src/controllers/friend.controller.ts, backend/src/services/friend.service.ts, backend/src/models/Friendship.ts.

**Module files:** backend/src/modules/friend/{friend.route.ts, friend.controller.ts, friend.service.ts, friend.repository.ts, friend.dto.ts, friend.constants.ts}. Đăng ký một lần tại backend/src/app.ts; bỏ wiring cũ tương ứng.

**Service signatures:** FriendService.sendRequest(input: SendFriendRequestInput): Promise<FriendRequestDto>; accept(input: AcceptFriendRequestInput): Promise<FriendDto>; decline(input: DeclineFriendRequestInput): Promise<void>; unfriend(input: UnfriendInput): Promise<void>; getOrCreateDirectConversation(input): Promise<ConversationDto>.

**HTTP contract:** GET/POST /api/friends; POST /api/friends/:requestId/accept; POST /api/friends/:requestId/decline; DELETE /api/friends/:friendId; GET /api/users/search. Friendship pair chuẩn hóa và partial unique index active; DIRECT pair unique. Sửa route decline trùng accept, search GET lấy query thay vì body. Cả recipientId và conversationId đều kiểm tra friendship khi gửi.

**Frontend adapter:** searchPeople, listFriends, requestFriend, acceptFriend, declineFriend, unfriend, openDirectChat in frontend/features/people/api/people.api.ts. File frontend/features/people/api/people.api.ts; typed result từ packages/contracts.

### Task 1: Business rules and repository

**Files:** service/repository/types/constants trong module trên; test backend/src/modules/friend/direct-friends.service.test.ts.

- [ ] Step 1: Viết test thất bại: should_create_only_one_direct_conversation_under_race; should_reject_send_after_unfriend_for_conversationId; should_decline_on_distinct_route. Assertions cốt lõi: expect(directConversations).toHaveLength(1); expect(sendError.code).toBe(ERROR_CODES.NOT_FRIENDS).
- [ ] Step 2: Chạy pnpm -C backend exec vitest run src/modules/friend/direct-friends.service.test.ts; xác nhận FAIL đúng hành vi.
- [ ] Step 3: Viết repository interface + Mongoose repository và service signatures ở trên; transaction khi nhiều bản ghi thay đổi; constants/typed BusinessException; không gọi Mongoose trong service.
- [ ] Step 4: Chạy lại test và backend typecheck; phải PASS. Commit domain task.

### Task 2: API boundary and integration

**Files:** route/controller/dto/schema/mapper trong module; test backend/src/modules/friend/direct-friends.route.test.ts.

- [ ] Step 1: Viết test route thất bại: accept/decline đúng path, không trùng; user search query validated; nonfriend DM 403; response không rò email/phone. Assert status, envelope, error code và DTO; dùng MongoDB test cô lập.
- [ ] Step 2: Chạy pnpm -C backend exec vitest run src/modules/friend/direct-friends.route.test.ts; xác nhận FAIL đúng lý do.
- [ ] Step 3: Nối Zod, auth/RBAC middleware, controller HTTP-only và DTO mapper; đăng ký route tại composition root, bỏ wiring cũ.
- [ ] Step 4: Chạy test, backend typecheck và route smoke; phải PASS. Commit API task.

### Task 3: Client contract

**Files:** frontend/features/people/api/people.api.ts; test frontend/features/people/api/direct-friends.api.test.ts.

- [ ] Step 1: Viết test adapter thất bại: adapter tìm người bằng query param, request state rõ và mở đúng direct conversation; giả lập envelope và xác nhận ApiError.code.
- [ ] Step 2: Chạy pnpm -C frontend exec vitest run features/people/api/direct-friends.api.test.ts; xác nhận FAIL.
- [ ] Step 3: Viết adapter functions đã nêu, dùng shared HTTP client/constants/DTO package; không thêm JSX hoặc state.
- [ ] Step 4: Chạy test, frontend typecheck/lint; phải PASS. Commit adapter task.

## Done when

FR-16 và 5 Review Focus có bằng chứng test; route cũ không hoạt động song song; spec/AGENTS.md được đối chiếu.
