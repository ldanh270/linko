# F14 — Tắt thông báo nhóm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Mỗi thành viên tắt/bật toast của nhóm mà vẫn nhận unread count.

**Architecture:** Module backend/src/modules/notification sở hữu hành vi; controller HTTP-only, service qua interface, repository Mongoose. Adapter frontend dùng shared HTTP client và packages/contracts; màn hình lắp hook/JSX riêng.

**Tech Stack:** TypeScript strict, Express 5, Mongoose 9, Zod 4, Vitest/Supertest/MongoMemoryReplSet; Next.js 16/React 19 cho adapter.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), FR-14; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F06, F11, F12. **Screen consumers:** xem implementation guide.

## Global Constraints

- AGENTS.md bắt buộc: ObjectId/Mongoose/Zod, strict TS, constants dùng chung, audit/delFlag, repository-only DB, DI, global error envelope, TSDoc tiếng Anh.
- Không trả document/secret; lỗi business dùng code, lỗi kỹ thuật vào global handler. FE adapter dùng contract chung, không có JSX/state.
- Mỗi task có test thất bại → triển khai tối thiểu → test xanh → typecheck/lint → commit.
- Giữ giới hạn spec: nhóm riêng, 100 thành viên/nhóm, lịch sử từ joinedAt; DTO không lộ dữ liệu kín. Không thêm tính năng sau MVP.

## Review Focus

1. Mute ở một nhóm nhưng không nhóm khác.
2. toggle từ hai tab.
3. unread vẫn tăng.
4. nhóm đã rời.
5. toast trong phòng đang mở.

## File ownership and interface

**Existing to migrate/modify:** backend/src/models/Conversation.ts participant.mutedUntil; thêm isMuted Boolean và migration chuyển mutedUntil còn hiệu lực sang isMuted=true, giữ bản cũ đọc được trong giai đoạn chuyển tiếp.

**Module files:** backend/src/modules/notification/{notification.route.ts, notification.controller.ts, notification.service.ts, notification.repository.ts, notification.dto.ts, notification.constants.ts}. Đăng ký một lần tại backend/src/app.ts; bỏ wiring cũ tương ứng.

**Service signatures:** NotificationPreferenceService.setMuted(input: SetMutedInput): Promise<NotificationPreferenceDto>; get(userId, conversationId): Promise<NotificationPreferenceDto>.

**HTTP contract:** PUT /api/conversations/:id/notification-preference. Bản đầu dùng isMuted Boolean per active participant, không dùng ngày xa tùy ý. Mute chỉ chặn in-app toast; số chưa đọc và message event vẫn hoạt động.

**Frontend adapter:** setGroupMuted, getGroupNotificationPreference in frontend/features/settings/api/notification.api.ts. Hook frontend/features/settings/hooks/useNotificationToasts.ts nhận sự kiện F11, đối chiếu isMuted và phòng đang mở rồi gọi shared ToastProvider. DTO từ packages/contracts.

### Task 1: Business rules and repository

**Files:** service/repository/types/constants trong module trên; test backend/src/modules/notification/mute.service.test.ts.

- [ ] Step 1: Viết test thất bại: should_mute_only_current_member; should_keep_unread_incrementing; should_not_emit_toast_for_muted_room. Assertions cốt lõi: expect(other.isMuted).toBe(false); expect(muted.unreadCount).toBe(1); expect(toasts).toHaveLength(0).
- [ ] Step 2: Chạy pnpm -C backend exec vitest run src/modules/notification/mute.service.test.ts; xác nhận FAIL đúng hành vi.
- [ ] Step 3: Viết repository interface + Mongoose repository và service signatures ở trên; transaction khi nhiều bản ghi thay đổi; constants/typed BusinessException; không gọi Mongoose trong service.
- [ ] Step 4: Chạy lại test và backend typecheck; phải PASS. Commit domain task.

### Task 2: API boundary and integration

**Files:** route/controller/dto/schema/mapper trong module; test backend/src/modules/notification/mute.route.test.ts.

- [ ] Step 1: Viết test route thất bại: nonmember 403/404; false restores alerts; stable response DTO. Assert status, envelope, error code và DTO; dùng MongoDB test cô lập.
- [ ] Step 2: Chạy pnpm -C backend exec vitest run src/modules/notification/mute.route.test.ts; xác nhận FAIL đúng lý do.
- [ ] Step 3: Nối Zod, auth/RBAC middleware, controller HTTP-only và DTO mapper; đăng ký route tại composition root, bỏ wiring cũ.
- [ ] Step 4: Chạy test, backend typecheck và route smoke; phải PASS. Commit API task.

### Task 3: Client contract

**Files:** frontend/features/settings/api/notification.api.ts, frontend/features/settings/hooks/useNotificationToasts.ts; tests frontend/features/settings/api/mute.api.test.ts and frontend/features/settings/hooks/useNotificationToasts.test.ts.

- [ ] Step 1: Viết test thất bại cho adapter và hook: preference update dùng đúng DTO; sự kiện nhóm muted hoặc phòng đang mở không hiện toast, nhóm khác có toast; giả lập envelope và xác nhận ApiError.code.
- [ ] Step 2: Chạy pnpm -C frontend exec vitest run features/settings/api/mute.api.test.ts features/settings/hooks/useNotificationToasts.test.ts; xác nhận FAIL.
- [ ] Step 3: Viết adapter và hook đã nêu, dùng shared HTTP client/constants/DTO package và ToastProvider; hook giữ state, adapter không có JSX.
- [ ] Step 4: Chạy cả hai test, frontend typecheck/lint; phải PASS. Commit client task.

## Done when

FR-14 và 5 Review Focus có bằng chứng test; route cũ không hoạt động song song; spec/AGENTS.md được đối chiếu.
