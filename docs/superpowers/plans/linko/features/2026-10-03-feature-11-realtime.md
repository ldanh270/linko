# F11 — Đồng bộ thời gian thực Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Xác thực Socket.IO, phát tin sau lưu và đồng bộ lại sau reconnect không nhân đôi.

**Architecture:** Module backend/src/modules/realtime sở hữu hành vi; controller HTTP-only, service qua interface, repository Mongoose. Adapter frontend dùng shared HTTP client và packages/contracts; màn hình lắp hook/JSX riêng.

**Tech Stack:** TypeScript strict, Express 5, Mongoose 9, Zod 4, Vitest/Supertest/MongoMemoryReplSet; Next.js 16/React 19 cho adapter.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), FR-11; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F08, F06. **Screen consumers:** xem implementation guide.

## Global Constraints

- AGENTS.md bắt buộc: ObjectId/Mongoose/Zod, strict TS, constants dùng chung, audit/delFlag, repository-only DB, DI, global error envelope, TSDoc tiếng Anh.
- Không trả document/secret; lỗi business dùng code, lỗi kỹ thuật vào global handler. FE adapter dùng contract chung, không có JSX/state.
- Mỗi task có test thất bại → triển khai tối thiểu → test xanh → typecheck/lint → commit.
- Giữ giới hạn spec: nhóm riêng, 100 thành viên/nhóm, lịch sử từ joinedAt; DTO không lộ dữ liệu kín. Không thêm tính năng sau MVP.

## Review Focus

1. Socket không auth.
2. join room đoán ID.
3. DB write fail.
4. thành viên bị loại khi đang online.
5. reconnect giữa hai tin.

## File ownership and interface

**Existing to migrate/modify:** `backend/src/socket/socket.ts`. The legacy `backend/src/utils/messageHelper.ts` remains under its unmounted legacy controller; the active message module already owns the atomic summary update and realtime publication path.

**Module files:** backend/src/modules/realtime/{realtime.gateway.ts, realtime.auth.ts, realtime.constants.ts, realtime.types.ts, realtime.repository.ts}. Authentication lives in Socket.IO middleware because room joins are not HTTP routes; production composition builds one gateway in `backend/src/index.ts`, injects it through `backend/src/app.ts`, and attaches it to the HTTP server once.

**Service signatures:** RealtimeGateway.authenticate(socket): Promise<SocketIdentity>; joinConversation(socket, conversationId): Promise<boolean> (acknowledges membership-authorized joins); publishMessage(message: MessageDto): Promise<void>; revokeMember(conversationId, userId): Promise<void>.

**Transport contract:** Socket events `conversation:join`, `message:created`, `conversation:updated`, `membership:changed`; the existing message history GET is the REST recovery source. Handshake validates the shared access-token issuer/audience and active account; the server checks current membership for every join. Message and conversation events publish after persistence commits. Reconnect pages use `afterMessageId` and preserve the joinedAt visibility boundary; clients de-duplicate by `MessageDto.id`.

**Frontend adapter:** createChatSocket, subscribeToConversation in frontend/features/chat/api/chatSocket.ts. File frontend/features/chat/api/chatSocket.ts; typed result từ packages/contracts.

### Task 1: Business rules and repository

**Files:** service/repository/types/constants in the realtime module; tests in `backend/src/modules/realtime/realtime.gateway.test.ts` and `backend/src/modules/message/messaging.service.test.ts`.

- [x] Step 1: Added gateway authentication, nonmember join, safe DTO event, active-account, and commit-only/idempotent message publication tests.
- [x] Step 2: Confirmed the initial gateway test failed because `realtime.gateway` was absent.
- [x] Step 3: Added the Mongoose authorization repository, shared JWT verification, typed gateway ports, and after-commit publisher integration without persistence calls in the gateway service.
- [x] Step 4: Gateway and message service tests pass; backend typecheck passes. Domain implementation committed.

### Task 2: Socket and REST recovery integration

**Files:** Socket.IO wiring and message history query schema/controller/repository/service; tests in `backend/src/modules/realtime/realtime.gateway.test.ts`, `backend/src/modules/message/messaging.service.test.ts`, and `backend/src/modules/message/messaging.route.test.ts`. Socket room joins use handshake middleware and acknowledgements; a separate Express route/controller would duplicate the existing message API boundary.

- [x] Step 1: Added tests for unauthorized/nonmember room access, member revocation, private safe events, and paginated reconnect recovery with pre-join history excluded.
- [x] Step 2: Reconnect recovery extends the existing message history route rather than adding a separate realtime route; focused MongoDB-backed service and route regressions pass.
- [x] Step 3: Wired one gateway in the production composition root, emits after commit, revokes removed/leaving sockets, and validates forward cursors through Zod on the existing history endpoint.
- [x] Step 4: Focused gateway/service/route tests and backend typecheck pass. API integration committed.

### Task 3: Client contract

**Files:** frontend/features/chat/api/chatSocket.ts; test frontend/features/chat/api/realtime.api.test.ts.

- [x] Step 1: Added adapter coverage for ID-based merging, reconnect pagination, listener cleanup, authenticated handshake, and normalized API errors.
- [x] Step 2: Ran the realtime adapter tests; all pass.
- [x] Step 3: Added the Socket.IO client adapter and shared auth-token access; no JSX or UI state added.
- [x] Step 4: Adapter and message API tests, frontend typecheck, and lint pass. Client adapter committed.

## Done when

FR-11 and the five review focus items have test evidence. The app mounts the module message router and does not mount the legacy message router alongside it. The legacy `messageHelper.ts` remains only under the unmounted legacy controller; the active message service/repository owns the transactional summary and realtime publication path.
