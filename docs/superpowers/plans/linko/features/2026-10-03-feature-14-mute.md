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

- [x] Step 1: Viết test thất bại: should_mute_only_current_member; should_keep_unread_incrementing; should_not_emit_toast_for_muted_room. Assertions cốt lõi: expect(other.isMuted).toBe(false); expect(muted.unreadCount).toBe(1); expect(toasts).toHaveLength(0).
- [x] Step 2: Chạy pnpm -C backend exec vitest run src/modules/notification/mute.service.test.ts; xác nhận FAIL đúng hành vi.
- [x] Step 3: Viết repository interface + Mongoose repository và service signatures ở trên; transaction khi nhiều bản ghi thay đổi; constants/typed BusinessException; không gọi Mongoose trong service.
- [x] Step 4: Chạy lại test và backend typecheck; phải PASS. Commit domain task.

### Task 2: API boundary and integration

**Files:** route/controller/dto/schema/mapper trong module; test backend/src/modules/notification/mute.route.test.ts.

- [x] Step 1: Viết test route thất bại: nonmember 403/404; false restores alerts; stable response DTO. Assert status, envelope, error code và DTO; dùng MongoDB test cô lập.
- [x] Step 2: Chạy pnpm -C backend exec vitest run src/modules/notification/mute.route.test.ts; xác nhận FAIL đúng lý do.
- [x] Step 3: Nối Zod, auth/RBAC middleware, controller HTTP-only và DTO mapper; đăng ký route tại composition root, bỏ wiring cũ.
- [x] Step 4: Chạy test, backend typecheck và route smoke; phải PASS. Commit API task.

### Task 3: Client contract

**Files:** frontend/features/settings/api/notification.api.ts, frontend/features/settings/hooks/useNotificationToasts.ts; tests frontend/features/settings/api/mute.api.test.ts and frontend/features/settings/hooks/useNotificationToasts.test.ts.

- [x] Step 1: Viết test thất bại cho adapter và hook: preference update dùng đúng DTO; sự kiện nhóm muted hoặc phòng đang mở không hiện toast, nhóm khác có toast; giả lập envelope và xác nhận ApiError.code.
- [x] Step 2: Chạy pnpm -C frontend exec vitest run features/settings/api/mute.api.test.ts features/settings/hooks/useNotificationToasts.test.ts; xác nhận FAIL.
- [x] Step 3: Viết adapter và hook đã nêu, dùng shared HTTP client/constants/DTO package và ToastProvider; hook giữ state, adapter không có JSX.
- [x] Step 4: Chạy cả hai test, frontend typecheck/lint; phải PASS. Commit client task.

## Done when

FR-14 và 5 Review Focus có bằng chứng test; route cũ không hoạt động song song; spec/AGENTS.md được đối chiếu.

## Implementation notes and verification

- Notification preference is per active participant. Group PUT updates only that participant and clears their legacy expiry; direct conversations return the default preference and reject changes.
- Existing F11 events originally reached only joined conversation rooms. The gateway now also sends the same safe message DTO to each other current member's private user room, excluding the sender. The repository filters departed/deleted participants, so the authenticated frontend listener can receive inactive-group messages without a global broadcast.
- The listener mounts only after session restoration, derives an open group from `/groups/:conversationId`, and reads the preference on each event. This keeps another tab's change effective on the next message; failures to load preferences fail closed. Message persistence continues to increment unread counts independently of mute state.
- `migrateNotificationPreferences.ts` previews by default, backfills `isMuted: true` only for unexpired legacy `mutedUntil` values without a new preference, records the system audit actor, and preserves the legacy expiry for transition reads. The runbook describes backup, dry-run, apply, and repeat verification.
- Verification: backend mute service/route, migration, realtime gateway/repository, and messaging regression suites passed (33 unique tests); frontend mute adapter and toast hook passed (7 tests); backend/frontend typechecks and changed-file frontend lint passed. Initial red runs confirmed missing domain/route/client behavior before implementation.
- Commits: `f6025b0` preference domain, migration, and private delivery; `0c17d61` authenticated preference endpoints; `856fba4` client adapter and toast listener.
