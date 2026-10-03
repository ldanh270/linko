# Linko Implementation Guide

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement the linked plans task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Triển khai Linko qua các lát cắt chạy được: nền kỹ thuật, tài khoản, nhóm riêng, chat và quản trị.

**Architecture:** Frontend Next.js tách route/page/component/hook/API; backend Express + Mongoose theo module route → middleware → controller → service → repository. MongoDB là nguồn dữ liệu, Socket.IO phát thay đổi sau khi lưu, R2 giữ tệp riêng.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript strict, Express 5, Mongoose 9, Zod 4, Socket.IO 4, R2. F00 thiết lập Vitest, React Testing Library, Supertest, MongoMemoryReplSet và Playwright.

**Spec:** [Thiết kế Linko, SRS và RDS](../../specs/2026-10-03-linko-product-design.md)

## Cách dùng

Đọc [AGENTS.md](../../../../AGENTS.md), spec và file này, rồi thực hiện các file theo thứ tự dưới đây. Mỗi feature plan sở hữu một FR; mỗi screen plan sở hữu một UI. Các đường dẫn code trong plan là dự kiến, chưa tồn tại. Một task kết thúc bằng kiểm thử và commit nhỏ. Không triển khai tính năng sau MVP.

## Global Constraints

- Web responsive 360–1440 px, tiếng Việt, một nhóm riêng = một GROUP conversation, tối đa 100 thành viên/nhóm và 100 nhóm/người; thành viên mới chỉ thấy tin từ joinedAt.
- Be Vietnam Pro và token trong spec; WCAG 2.2 AA; zoom 200%; vùng bấm ưu tiên 44 × 44 px; data view có loading/empty/error.
- Frontend: page chỉ compose, JSX tách hook logic, API tách component, URL là nguồn duy nhất cho filter/search/tab/sort; shared Button/IconButton/Link đủ trạng thái.
- Backend: Zod ở biên, controller không business logic/try-catch, service inject interface, repository duy nhất gọi Mongoose, một composition root, DTO và envelope thống nhất.
- Lỗi business có class/code ổn định, không log; lỗi kỹ thuật vào global handler và log JSON có request ID, phản hồi 500 chung. Không any, console.log, magic values hoặc copy constants giữa FE/BE.
- Collection mới và model được sửa có audit fields, delFlag Boolean mặc định false, soft-delete filter; thời gian UTC. F00 xử lý migration dữ liệu cũ.
- Suy từ code hiện có thay cho default để trống trong AGENTS.md: PK/FK ObjectId, enum text từ constants as const, Date UTC, Mongoose + Zod, API envelope { success, data, error, meta }. F00 ghi các lựa chọn này vào Section 0 của AGENTS.md trước khi triển khai code.
- Comment code bằng tiếng Anh theo TSDoc/JSDoc; test service/hook và quyền truy cập; mỗi plan chạy lint/typecheck/test ở phạm vi mình chạm.

## Cấu trúc code khóa trước khi triển khai

| Vùng | Quy ước | Chủ sở hữu |
|---|---|---|
| `backend/src/shared` | Error handler, logger, context, audit/soft-delete plugin, constants | F00 |
| `backend/src/modules/<feature>` | Route/controller/service/repository/dto/mapper/constants/types | Feature plan tương ứng |
| `backend/src/app.ts` | Composition root duy nhất | F00 tạo, feature đăng ký ở đây |
| `frontend/shared` | HTTP client, query provider, URL hook, tokens và UI primitives | F00 |
| `frontend/features/<feature>/api` | Client adapter nhận contract chung | Feature plan |
| `frontend/features/<screen>/pages/components/hooks` | Page compose, component JSX, hook state | Screen plan |
| `frontend/app` | Next App Router entry và layout | Screen plan |
| `packages/contracts` | Envelope, DTO, route/error/role/event constants dùng chung | F00 |

Khi chuyển code backend cũ, chỉ một route/service hoạt động; xóa wiring cũ cùng task. Không tạo API song song có hành vi khác nhau.

## Thứ tự thực hiện

| # | Plan | Mốc đạt |
|---:|---|---|
| 01 | [F00 Nền kỹ thuật](features/2026-10-03-feature-00-foundation.md) | Rules, contracts, test harness, audit/soft delete, UI tokens |
| 02 | [UI-01 Chào mừng](screens/2026-10-03-screen-01-welcome.md) | Landing responsive |
| 03 | [F01 Tài khoản/phiên](features/2026-10-03-feature-01-auth.md) | Signup/login/refresh/logout |
| 04 | [UI-02 Đăng ký](screens/2026-10-03-screen-02-signup.md) | Form đăng ký |
| 05 | [UI-03 Đăng nhập](screens/2026-10-03-screen-03-login.md) | Form đăng nhập |
| 06 | [F02 Hồ sơ](features/2026-10-03-feature-02-profile.md) | Đọc/sửa hồ sơ |
| 07 | [UI-14 Hồ sơ tôi](screens/2026-10-03-screen-14-profile.md) | Hồ sơ hoàn chỉnh |
| 08 | [F03 Tạo nhóm](features/2026-10-03-feature-03-group-creation.md) | Tạo nhóm một mình |
| 09 | [UI-05 Danh sách nhóm](screens/2026-10-03-screen-05-groups.md) | Danh sách nhóm |
| 10 | [UI-06 Tạo nhóm](screens/2026-10-03-screen-06-create-group.md) | Form tạo nhóm |
| 11 | [F06 Thành viên/quyền](features/2026-10-03-feature-06-membership-roles.md) | Vai trò và loại thành viên |
| 12 | [F04 Phát hành lời mời](features/2026-10-03-feature-04-invitation-issue.md) | Link có hạn/lượt và thu hồi |
| 13 | [UI-12 Quản lý lời mời](screens/2026-10-03-screen-12-invitations.md) | Copy và revoke |
| 14 | [F05 Tham gia bằng lời mời](features/2026-10-03-feature-05-invitation-join.md) | Preview/join chống tranh chấp |
| 15 | [UI-07 Xem trước lời mời](screens/2026-10-03-screen-07-invite-preview.md) | Join và lỗi |
| 16 | [F15 Vòng đời nhóm](features/2026-10-03-feature-15-group-lifecycle.md) | Rời/đóng nhóm |
| 17 | [UI-11 Quản lý nhóm](screens/2026-10-03-screen-11-group-manage.md) | Quản trị nhóm |
| 18 | [F08 Tin nhắn](features/2026-10-03-feature-08-messaging.md) | Gửi/đọc/phân trang |
| 19 | [F12 Đã đọc/chưa đọc](features/2026-10-03-feature-12-read-state.md) | Read marker |
| 20 | [F07 Danh sách hội thoại](features/2026-10-03-feature-07-inbox.md) | Inbox đúng quyền |
| 21 | [UI-04 Hộp thư](screens/2026-10-03-screen-04-inbox.md) | Filter URL và trạng thái |
| 22 | [F09 Trả lời/nhắc tên](features/2026-10-03-feature-09-reply-mentions.md) | Reply/mention đúng quyền |
| 23 | [F10 Tệp](features/2026-10-03-feature-10-attachments.md) | Upload/download riêng |
| 24 | [F11 Realtime](features/2026-10-03-feature-11-realtime.md) | Socket auth/reconnect |
| 25 | [F13 Tin ghim](features/2026-10-03-feature-13-pins.md) | Tối đa 3 tin |
| 26 | [UI-08 Chat nhóm](screens/2026-10-03-screen-08-group-chat.md) | Phòng chat đầy đủ |
| 27 | [F14 Tắt thông báo](features/2026-10-03-feature-14-mute.md) | Mute cá nhân |
| 28 | [UI-10 Thông tin nhóm](screens/2026-10-03-screen-10-group-info.md) | Mô tả, thành viên, ghim |
| 29 | [UI-16 Xem tệp](screens/2026-10-03-screen-16-file-viewer.md) | Viewer bảo vệ auth |
| 30 | [UI-15 Cài đặt](screens/2026-10-03-screen-15-settings.md) | Theme và phiên |
| 31 | [F16 Bạn bè/DM](features/2026-10-03-feature-16-direct-friends.md) | Kết bạn, DM duy nhất |
| 32 | [UI-13 Bạn bè/hồ sơ khác](screens/2026-10-03-screen-13-people.md) | Tìm người và mở DM |
| 33 | [UI-09 Chat riêng](screens/2026-10-03-screen-09-direct-chat.md) | DM với chat shell chung |

Sau 07 có thể trình diễn auth/hồ sơ; sau 15 có thể tạo và vào nhóm; sau 29 có thể chat nhóm trọn luồng; sau 33 hoàn thành MVP. Ở mỗi mốc chạy pnpm build, lint, typecheck, test và một luồng Playwright với database test riêng.

## Review Focus

1. Hai người dùng đồng thời tiêu thụ lượt mời cuối: không vượt 25 lượt hoặc 100 thành viên (F05).
2. Thành viên mới/bị loại dùng URL tệp hoặc socket cũ: không thấy tin trước joinedAt, không tải tệp, room bị thu hồi (F08/F10/F11).
3. Gửi tin đứt mạng sau khi server đã lưu: cùng clientMessageId trả cùng một tin (F08).
4. DIRECT gửi bằng conversationId sau hủy kết bạn: server từ chối (F16).
5. Cookie/refresh lỗi, 500, file lỗi hoặc viewport 360 px: UI giải thích được, không rò token/stack, không che nút (F01/F10/UI-02/UI-03/UI-16).

## Handoff

Đây chỉ là kế hoạch. Sau khi review các file, chọn một plan ở thứ tự trên để triển khai. Trước mỗi plan đọc lại AGENTS.md và spec; đối chiếu Definition of Done; commit từng task nhỏ. Không dùng database cá nhân hoặc production cho test.

## Tham khảo cho test harness

- [Next.js — Testing with Vitest](https://nextjs.org/docs/app/guides/testing/vitest): unit/component tests; Next.js khuyến nghị E2E cho async Server Components.
- [Playwright — Installation and test runner](https://playwright.dev/docs/intro): kiểm thử luồng web và viewport.
- [mongodb-memory-server — ReplicaSet guide](https://typegoose.github.io/mongodb-memory-server/versions/10.x/docs/guides/quick-start-guide/): replica set với wiredTiger cho transaction tests.
