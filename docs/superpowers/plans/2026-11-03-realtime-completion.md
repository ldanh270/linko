# Realtime Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task after user approval. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Đã được người dùng duyệt và implement trên `codex/realtime-completion`. Xem [execution ledger](2026-11-03-realtime-completion-progress.md) để biết các commit, quyết định và kết quả kiểm chứng.

**Goal:** Hoàn thiện typing bubble, online status dùng Redis bitmap, trang phụ toàn chiều rộng và thông báo tin nhắn qua socket trên toàn app.

**Architecture:** Tái sử dụng Socket.IO, contracts, bitmap và layout hiện có. Tách lifecycle presence, typing và notification policy theo trách nhiệm; inject dependency tại composition root. Một listener thông báo trong authenticated shell xử lý event xuyên route.

**Tech Stack:** TypeScript, Express 5, Mongoose, ioredis, Socket.IO 4, Next.js 16, React 19, TanStack Query, Vitest, Playwright.

**Spec:** Phần “Phạm vi đề xuất” trong tài liệu này; các lựa chọn dưới đây là đề xuất của agent, chờ người dùng duyệt.

## Kết quả audit code hiện tại

| Yêu cầu | Trạng thái trong code | Bằng chứng và phần thiếu |
| --- | --- | --- |
| Bubble typing | Đã có luồng cơ bản | `useConversationPane.ts` phát start/stop, `useTypingIndicator.ts` nhận update, `MessageTimeline.tsx` render `TypingBubble.tsx`. Start đang phát mỗi lần gõ; setting `showTypingIndicator` chưa được đọc trong luồng này; state chưa reset khi đổi conversation; stop chưa kiểm tra membership như start. |
| Online status bằng Redis bitmap | Đã có, cần củng cố | `presence.bitmap.ts` dùng SETBIT/GETBIT/BITCOUNT và pipeline; `usePresence.ts` được dùng ở inbox, chat, danh bạ, profile. Redis là tùy chọn; không cấu hình sẽ dùng RAM. Offset cấp bằng HGET → INCR → HSET chưa atomic; đếm socket chỉ trong Map; chưa có lease dọn bit sau crash; trạng thái RAM/Redis khi mất kết nối chưa được đồng bộ rõ ràng. |
| Settings/profile/danh bạ không hiện chat | Đã có theo cấu trúc route | `workspace.navigation.ts` đánh dấu settings, people, notifications, profile và profile/:id là full page. Các page này không compose `MessengerWorkspace`; `useVisibleConversationId` trả null trên detail route. Cần kiểm thử DOM/responsive với query conversation; một số E2E cũ còn kỳ vọng chat tồn tại ở profile. |
| Thông báo đẩy socket | Có một phần | Backend phát `MESSAGE_CREATED` vào conversation room và private user room; authenticated shell mount toast listener toàn app. Browser Notification nằm trong `usePushNotifications`, chỉ được gọi bởi `useNotificationsPage`, nên chưa chạy xuyên route. Browser path chưa dùng chung mute/dedup/preview policy, có khả năng trùng âm thanh và event. |

Audit xác nhận cấu trúc code, không xác nhận Redis đang được cấu hình/hoạt động trên môi trường deploy. Không đọc giá trị secret. Test hiện có của bitmap dùng in-memory store, không chứng minh nhánh Redis thật.

## Phạm vi đề xuất

1. **Typing:** dùng cho direct và group; không hiện bản thân, không lẫn conversation. Khi setting `showTypingIndicator=false`, ngừng phát trạng thái đang gõ của người dùng đó; vẫn nhận typing của người khác. Start ngay lần gõ đầu, refresh tối đa mỗi 1 giây, stop sau 2,5 giây không gõ hoặc khi gửi/xóa hết/blur/rời chat. Bên nhận tự hết hạn sau 3,5 giây. Đây là các giá trị đề xuất, giữ timeout hiện có.
2. **Presence:** một user online khi còn ít nhất một socket có lease hợp lệ. Redis bitmap lưu trạng thái đọc; metadata ObjectId → offset và session lease là phần bộ nhớ bổ sung, không tính trong con số 1 bit/user. Heartbeat phía server mỗi 15 giây, lease 45 giây, cleanup mỗi 15 giây; mất kết nối cuối cùng được cập nhật ngay khi nhận disconnect, crash được dọn trong tối đa khoảng 60 giây sau lần renew cuối khi worker cleanup hoạt động. Khi backend ngừng hoàn toàn, lần startup tiếp theo dọn lease cũ trước khi công bố snapshot.
3. **Layout:** settings, profile, profile/:id, people, notifications chiếm toàn vùng nội dung bên cạnh navigation; không mount chat/timeline/composer và không mark-read chat ẩn. Giữ conversation hợp lệ trong URL để quay lại inbox; không cần xóa query hiện có. Group info/manage, attachments vẫn là detail pages theo routing hiện có.
4. **Socket notifications:** trước mắt là tin nhắn mới direct/group. Khi app đang hiển thị: toast nếu chat đích không thực sự được xem. Khi document hidden: browser notification nếu đã cấp quyền; chỉ một đường phát âm thanh cho mỗi event trong một tab. Luôn áp dụng mute, preview, sound setting và bỏ event của chính mình. Click mở canonical direct/group route sau khi tra loại conversation từ inbox/API; không suy đoán loại từ ID.
5. **Reconnect:** refetch inbox khi socket connect lại để cập nhật unread bị bỏ lỡ; giữ cơ chế recover message history hiện có. Không phát lại hàng loạt toast cho tin cũ. Logout xóa listener/cache presence/dedup, đăng nhập tài khoản khác dùng socket mới.

**Ngoài phạm vi đợt này:** Web Push/service worker để nhận khi đóng trình duyệt; notification database/read-receipt riêng; event lời mời kết bạn; cam kết chỉ hiện một thông báo trên tất cả các tab; triển khai nhiều backend replica. Presence store phải kiểm thử concurrency giữa các client Redis, nhưng Socket.IO adapter/load balancer cho scale nhiều replica là hạng mục riêng nếu cần triển khai.

## Phương án và khuyến nghị

- **A — Hoàn thiện trên nền hiện có (khuyến nghị):** giữ bitmap và socket, bổ sung correctness và test; tận dụng UI/layout đã có. Chi phí thấp hơn làm lại; Redis lease metadata làm tăng bộ nhớ nhưng xử lý được online ảo sau crash.
- **B — Chỉ chuyển push listener lên shell:** nhanh hơn, nhưng vẫn để lại race offset, stale presence, typing setting chưa hoạt động và notification trùng. Không đạt đầy đủ tiêu chí dưới đây.
- **C — Xây Web Push và notification center bền vững:** phục vụ cả lúc đóng app, nhưng cần subscription, service worker, lưu trữ/retry và scope riêng. Chỉ chọn khi người dùng cần offline push.

## Global Constraints

- Chỉ implement sau khi người dùng duyệt plan. Không đổi product code trong lần audit/lập plan này.
- Tuân thủ `AGENTS.md`: ObjectId/string DTO, Mongoose/Zod, contracts là nguồn enum/event/type dùng chung, error envelope hiện có.
- Service/repository là class sau interface; inject tại `backend/src/index.ts`/`app.ts`; không tạo thêm singleton collaborator trong service.
- Logic frontend ở hook/service; component chỉ presentation; constants cho event/timing/key; TSDoc cho export mới.
- Redis dùng `REDIS_URL`, tương thích alias `REDIS_CONNECTION_STRING`; local thiếu Redis có fallback rõ ràng. Production thiếu Redis phải có chẩn đoán cấu hình, không mô tả fallback RAM là đã dùng Redis.
- Không hash/cắt ObjectId thành bit offset vì có thể va chạm. Lookup user chưa có offset trả offline, không cấp offset chỉ để đọc.
- Không ngầm mở rộng thành refactor toàn app hoặc thêm notification persistence/dependency khi chưa cần.
- Mỗi task implement xong phải verify và commit atomic; chỉ commit local, không push.

## Review Focus

1. Hai connection đồng thời cho một user không cấp hai offset hoặc báo offline khi còn socket khác: Task 2.
2. Redis disconnect/reconnect hoặc backend crash không giữ online ảo vô hạn hoặc trộn offset RAM với Redis: Task 2.
3. Đổi chat, tắt typing, gõ tiếng Việt bằng IME hoặc mất stop event không để bubble lẫn chat/kẹt: Task 1.
4. Một message tới cả private room và conversation room không tăng unread/toast/sound hai lần: Task 3.
5. Route phụ mang conversation query, chuyển viewport và đổi tài khoản không gây mark-read sai hay dùng lại presence của phiên cũ: Tasks 2–4.

## Task 1 — Hoàn thiện typing hiện có

**Files:**
- Modify: `packages/contracts/src/constants.ts`, `packages/contracts/src/users.ts` — giữ event hiện có, chuẩn hóa field/type/timing cần chia sẻ.
- Modify: `backend/src/modules/realtime/realtime.gateway.ts`, `realtime.types.ts`.
- Create: `backend/src/modules/realtime/realtime.typing.ts` — membership validation và rate control cho typing.
- Create: `frontend/features/chat/hooks/useTypingEmitter.ts` — lifecycle phát typing, thay logic inline trong `useConversationPane.ts`.
- Modify: `frontend/features/chat/hooks/useTypingIndicator.ts`, `useConversationPane.ts`, `useMessageComposer.ts`, `useMessageComposerView.ts` — reset, blur/empty/IME wiring.
- Modify: `frontend/features/chat/components/TypingBubble.tsx`, `MessageComposer.tsx` và `frontend/shared/i18n/{i18n.types.ts,translations/vi.ts,translations/en.ts}` — text dịch, reduced-motion, presentation/event bindings.
- Test: `backend/src/modules/realtime/realtime.typing.test.ts`, `frontend/features/chat/hooks/{useTypingEmitter.test.tsx,useTypingIndicator.test.tsx}`, `frontend/features/chat/components/MessageComposer.test.tsx`.

**Interfaces:** giữ `typing:start/stop` input `{ conversationId: string }`, `typing:update` output `{ conversationId: string; userId: string; isTyping: boolean }`. `useTypingEmitter({ conversationId, isEnabled })` trả `{ onTyping, onStopTyping }`; identity luôn lấy từ authenticated socket.

- [ ] Viết test fail: member/nonmember cho cả start và stop; invalid payload; throttle 1 giây; stop 2,5 giây; expired bubble 3,5 giây; đổi chat reset ngay; false setting không start và stop trạng thái cũ; IME không gửi nhầm tin.
- [ ] Chạy test mới để xác nhận fail trước khi sửa.
- [ ] Implement hook/typing handler, kiểm tra membership trước emit; start bị giới hạn theo socket/conversation, stop không bị chặn bởi throttle. Socket disconnected không buffer typing cũ để phát lại khi reconnect. Clear receiver state khi disconnect/rời conversation; không persist typing vào DB.
- [ ] Chạy `pnpm -C backend exec vitest run src/modules/realtime/realtime.typing.test.ts` và `pnpm -C frontend exec vitest run features/chat/hooks/useTypingEmitter.test.tsx features/chat/hooks/useTypingIndicator.test.tsx features/chat/components/MessageComposer.test.tsx`; tất cả pass.
- [ ] Stage đúng các file của task; commit `fix(chat): complete typing lifecycle`.

## Task 2 — Củng cố Redis bitmap presence

**Files:**
- Modify: `backend/src/modules/realtime/presence.bitmap.ts`, `presence.service.ts`, `realtime.types.ts`, `realtime.gateway.ts`, `backend/src/configs/redis.config.ts`, `backend/src/{index.ts,app.ts}`.
- Create: `backend/src/modules/realtime/presence.{types,constants,repository}.ts` — ports, keys/timings và persistence của lastActive.
- Create: `backend/src/modules/realtime/presence.sessions.ts` — Redis lease và cleanup.
- Modify: `backend/src/modules/user/{profile.controller.ts,profile.route.ts,profile.schema.ts}` — inject presence reader; cùng validation/batch limit với socket.
- Modify: `frontend/shared/presence/usePresence.ts`, `frontend/features/chat/api/chatSocket.ts` — teardown/reset, reference count ID đang theo dõi.
- Modify: `backend/.env.example` — ghi config Redis không chứa secret.
- Test: `backend/src/modules/realtime/presence.bitmap.test.ts`; create `presence.redis.test.ts`, `presence.sessions.test.ts`, `frontend/shared/presence/usePresence.test.tsx`.

**Interfaces:** `PresenceLifecycle.connect({ userId, socketId }): Promise<boolean>`, `.disconnect({ userId, socketId }): Promise<boolean>` trả true chỉ khi đổi online/offline; `PresenceReader.getPresenceBatch(userIds: readonly string[]): Promise<Record<string, boolean>>`; `PresenceLifecycle.start(): Promise<void>`, `.stop(): Promise<void>` quản lý renew/cleanup. `resetPresence()` được gọi trong teardown shared socket/session.

- [ ] Viết test fail: concurrent cấp offset cùng user trả cùng offset; lookup unknown không tạo mapping; 2 socket đóng 1 vẫn online; disconnect lặp idempotent; fake clock hết lease/offline; restart cleanup; Redis outage/recovery; pipeline error không âm thầm biến thành offline; logout/login dùng socket và snapshot mới; ID không còn subscriber được bỏ theo dõi.
- [ ] Chạy test mới, xác nhận fail; integration test Redis bắt buộc dùng database test riêng qua `REDIS_TEST_URL`, không dùng Redis production và không `FLUSHDB`.
- [ ] Cấp offset bằng Lua atomic HGET/INCR/HSET; dùng namespace key constants, không thay PK/FK. Batch mapping lookup bằng HMGET, GETBIT pipeline chỉ cho offset tồn tại; deduplicate/giới hạn 200 IDs cho cả HTTP và socket.
- [ ] Lưu lease theo socket trong sorted set mỗi user và deadline cleanup trong sorted set dùng chung; Lua renew/disconnect/prune cập nhật bitmap cùng lease atomically. Timer server renew 15 giây, lease 45 giây, cleanup 15 giây. Chỉ emit thay đổi trạng thái; lastActive ghi qua repository khi offline.
- [ ] Khi Redis lỗi, log technical error có context đã redact; giữ local active socket registry để fallback cho một tiến trình. Khi Redis ready lại, bỏ expired lease và replay socket đang sống trước khi dùng snapshot Redis; không tái sử dụng numeric offset từ RAM. Chặn snapshot startup đến khi reconcile xong. Timer/socket cleanup phải được stop khi shutdown/test kết thúc.
- [ ] Inject cùng instance lifecycle/reader tại composition root thay singleton import. Cache FE reset lúc logout và re-query ID được theo dõi lúc reconnect; effect không chạy lại chỉ vì array reference đổi.
- [ ] Chạy `pnpm -C backend exec vitest run src/modules/realtime/presence.bitmap.test.ts src/modules/realtime/presence.sessions.test.ts src/modules/realtime/presence.redis.test.ts src/modules/realtime/realtime.gateway.test.ts` với Redis test thật; `pnpm -C frontend exec vitest run shared/presence/usePresence.test.tsx`; tất cả pass, không skip Redis gate.
- [ ] Stage đúng các file của task; commit `fix(presence): harden Redis bitmap lifecycle`.

## Task 3 — Thông báo socket xuyên route

**Files:**
- Modify: `backend/src/modules/realtime/realtime.gateway.ts`, `realtime.gateway.test.ts` — union recipients, tránh emit hai lần cho cùng socket.
- Modify: `frontend/features/settings/hooks/useNotificationToasts.ts`, `frontend/features/settings/components/NotificationToastsListener.tsx`, `frontend/features/auth/components/ProtectedAppShell.tsx` — một consumer toàn app.
- Create: `frontend/features/notifications/notification.{policy,constants}.ts`, `hooks/useRealtimeNotifications.ts`, `api/browserNotification.ts` — eligibility, dedup, delivery orchestration và browser boundary.
- Modify: `frontend/features/notifications/hooks/{usePushNotifications.ts,useNotificationsPage.ts}` — hook permission không còn tự subscribe MESSAGE_CREATED.
- Modify: `frontend/features/chat/hooks/useConversationChat.ts` — bỏ sound delivery trùng, giữ sync history.
- Modify: `frontend/shared/sound/notificationSound.ts`, i18n files cần cho copy mới.
- Test: `frontend/features/notifications/{notification.policy.test.ts,hooks/useRealtimeNotifications.test.tsx}`, `frontend/features/settings/hooks/useNotificationToasts.test.ts`, `frontend/features/chat/hooks/useConversationChat.test.tsx`.

**Interfaces:** `evaluateMessageNotification({ message, currentUserId, visibleConversationId, isDocumentVisible, isMuted, previewEnabled, permission }): { showToast: boolean; showBrowserNotification: boolean; playSound: boolean }`. `useRealtimeNotifications(visibleConversationId: string | null): void` sở hữu duy nhất MESSAGE_CREATED consumer cho thông báo. Permission request chỉ khi người dùng bấm nút; browser adapter nhận `onClick` để focus window và mở route đã resolve.

- [ ] Viết test fail: nhận ở /settings và /people không cần mở /notifications; cùng message ID hai lần chỉ cập nhật unread/thông báo một lần; own message không notify; muted group không notify; chat đang xem không toast; document hidden vẫn nhận browser notification; permission denied/unsupported không lỗi, không tự xin lại; preview off không lộ nội dung; sound tôn trọng setting.
- [ ] Viết thêm test race: mute request hoàn tất sau khi đổi route/unmount không phát notification sai; reconnect refetch inbox không toast tin cũ; dedup cache bounded 500 message IDs mỗi session; click direct/group mở đúng route, không biết loại thì về inbox có selected conversation.
- [ ] Chạy tests mới, xác nhận fail.
- [ ] Backend phát MESSAGE_CREATED qua union conversation room và các private recipient rooms, giữ event/DTO hiện có. FE dedup trước mọi cache increment và async preference request; one delivery policy chọn toast hoặc browser notification và một sound call trong tab. Không thay đổi message persistence.
- [ ] Mount consumer ở authenticated shell; dùng active conversation kết hợp document visibility. Tách permission khỏi subscription để NotificationsPage không tạo listener thứ hai. Refetch inbox trên CONNECT; không hứa replay socket event đã mất.
- [ ] Chạy `pnpm -C backend exec vitest run src/modules/realtime/realtime.gateway.test.ts`; `pnpm -C frontend exec vitest run features/notifications features/settings/hooks/useNotificationToasts.test.ts features/chat/hooks/useConversationChat.test.tsx`; tất cả pass.
- [ ] Stage đúng các file của task; commit `fix(notifications): deliver socket alerts app-wide`.

## Task 4 — Khóa hành vi full page và nghiệm thu tích hợp

**Files:**
- Modify tests: `frontend/shared/layout/workspace.navigation.test.ts`, `frontend/features/settings/components/NotificationToastsListener.test.tsx`, `frontend/test/e2e/messenger-flows.spec.ts`.
- Create: `frontend/test/e2e/realtime-completion.spec.ts` — full-page responsive acceptance.
- Chỉ modify `frontend/shared/layout/{workspace.navigation.ts,useVisibleConversationId.ts,AppShell.tsx}` hoặc route page liên quan nếu test chứng minh còn lỗi; không viết lại layout đã hoạt động.

**Interfaces:** giữ `getWorkspaceLocation` và `useVisibleConversationId(): string | null`; detail routes luôn trả null cho visible conversation dù URL có conversation query.

- [ ] Thêm test cho /settings, /people, /profile, /profile/:id, /notifications tại 390px và 1440px, có/không có query conversation: có page heading; không có conversation region, timeline hoặc composer trong DOM; không gọi mark-read. Sửa E2E cũ kỳ vọng chat tồn tại trên profile.
- [ ] Test đi chat → settings → back/refresh và thay viewport: selected conversation được khôi phục đúng; hidden chat vẫn được toast, không bị suppression vì query ID.
- [ ] Chạy test để phân biệt regression thật với hành vi hiện có; chỉ sửa layout nếu cần. Chạy `pnpm -C frontend exec vitest run shared/layout/workspace.navigation.test.ts features/settings/components/NotificationToastsListener.test.tsx` và `pnpm -C frontend exec playwright test test/e2e/realtime-completion.spec.ts`; tất cả pass.
- [ ] Smoke hai tài khoản thật với backend + MongoDB + Redis test: direct/group typing, hai tab presence, logout, reconnect, muted group, notification click. Mock E2E không được dùng làm bằng chứng cho Redis/socket thật. Kiểm tra key mapping/GETBIT trước và sau disconnect; không ghi secret/log message content.
- [ ] Chạy `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm fe:build`; xác nhận toàn bộ pass hoặc ghi rõ baseline failure, không che lỗi do thay đổi. Kiểm tra reduced-motion và quyền notification trên trình duyệt hỗ trợ.
- [ ] Stage đúng các file của task; commit `test(realtime): cover full-page and alert flows`; kiểm tra `git status --short` và `git log -4 --oneline`.

## Thứ tự và điểm duyệt

Thực hiện Task 1 → Task 2 → Task 3 → Task 4 sau khi duyệt. Task 4 chủ yếu bổ sung chứng minh cho layout đã có. Không cần làm lại cả bốn tính năng.

Điểm người dùng cần duyệt: chọn phương án A; thông báo scope tin nhắn direct/group khi app còn mở; các giá trị timeout/lease và phạm vi một backend replica. Nếu cần notification lời mời kết bạn, Web Push lúc đóng app hoặc nhiều replica ngay đợt này, cập nhật scope trước khi implement.

## Tài liệu kỹ thuật tham chiếu

- [Redis bitmap](https://redis.io/docs/latest/develop/data-types/strings/bitmaps/): bitmap tối ưu phần trạng thái, vẫn cần mapping và lifecycle metadata.
- [Socket.IO delivery guarantees](https://socket.io/docs/v4/delivery-guarantees/): socket không tự replay server events cho client bị ngắt kết nối; dùng API refetch/history recovery cho phần dữ liệu cần đồng bộ.

## Verification của lần audit

- Backend: `pnpm -C backend exec vitest run src/modules/realtime/presence.bitmap.test.ts src/modules/realtime/realtime.gateway.test.ts` — **2 files, 10 tests pass**.
- Frontend: `pnpm -C frontend exec vitest run shared/layout/workspace.navigation.test.ts features/notifications/notifications.test.ts features/settings/hooks/useNotificationToasts.test.ts features/settings/components/NotificationToastsListener.test.tsx` — **4 files, 11 tests pass**.
- Phạm vi bằng chứng: test bitmap hiện tại chạy fallback RAM; gateway tests dùng transport mock. Chưa chạy browser smoke hoặc Redis integration trên môi trường deploy; chưa implement product code.
- Self-review: cả bốn yêu cầu đều có audit và task tương ứng; năm failure modes trong Review Focus đã được gắn vào test plan. Phạm vi Web Push, friend-request events và multi-replica được tách rõ để người dùng quyết định trước khi mở rộng.
