# F09 — Trả lời và nhắc tên Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Chỉ cho reply tới tin nhìn thấy trong cùng hội thoại và mention thành viên hiện tại.

**Architecture:** Module backend/src/modules/message sở hữu hành vi; controller HTTP-only, service qua interface, repository Mongoose. Adapter frontend dùng shared HTTP client và packages/contracts; màn hình lắp hook/JSX riêng.

**Tech Stack:** TypeScript strict, Express 5, Mongoose 9, Zod 4, Vitest/Supertest/MongoMemoryReplSet; Next.js 16/React 19 cho adapter.

**Spec:** [Linko design](../../../specs/2026-10-03-linko-product-design.md), FR-09; [AGENTS.md](../../../../../AGENTS.md)

**Depends on:** F08, F06. **Screen consumers:** xem implementation guide.

## Global Constraints

- AGENTS.md bắt buộc: ObjectId/Mongoose/Zod, strict TS, constants dùng chung, audit/delFlag, repository-only DB, DI, global error envelope, TSDoc tiếng Anh.
- Không trả document/secret; lỗi business dùng code, lỗi kỹ thuật vào global handler. FE adapter dùng contract chung, không có JSX/state.
- Mỗi task có test thất bại → triển khai tối thiểu → test xanh → typecheck/lint → commit.
- Giữ giới hạn spec: nhóm riêng, 100 thành viên/nhóm, lịch sử từ joinedAt; DTO không lộ dữ liệu kín. Không thêm tính năng sau MVP.

## Review Focus

1. Reply qua nhóm khác.
2. reply tới tin trước joinedAt.
3. mention người đã rời.
4. mention trùng.
5. tin gốc không còn xem được.

## File ownership and interface

**Existing to migrate/modify:** backend/src/models/Message.ts và module message của F08.

**Module files:** backend/src/modules/message/{replyMention.service.ts, replyMention.types.ts, replyMention.repository.ts, message.schema.ts, message.mapper.ts, message.service.ts}. Đăng ký validator một lần tại backend/src/app.ts; giữ một active message router.

**Service signatures:** ReplyMentionService.validate(input: ReplyMentionInput): Promise<ValidatedMessageContext>.

**HTTP contract:** POST /api/messages nhận replyTo và mentions. MessageService của F08 gọi ReplyMentionService đã inject trước khi lưu. Giới hạn mentions <=20 ID duy nhất; response chỉ trả ID reply target, không sao chép nội dung tin cũ vào metadata.

**Frontend adapter:** sendMessage ở frontend/features/chat/api/messages.api.ts nhận replyTo?: string và mentions?: string[]. File frontend/features/chat/api/messages.api.ts; typed result từ packages/contracts.

### Task 1: Business rules and repository

**Files:** service/repository/types/constants trong module trên; test backend/src/modules/message/reply-mentions.service.test.ts.

- [x] Step 1: Added failures for cross-conversation and pre-join replies, outsider/departed-member mentions, hidden targets, and duplicate mention normalization.
- [x] Step 2: Ran the local backend Vitest executable; it failed because the reply/mention repository and service modules did not exist yet.
- [x] Step 3: Added repository and service interfaces, Mongoose visibility reads, transactional validation, stable reply error code, and current-member mention checks. The service contains no Mongoose calls.
- [x] Step 4: Reply/mention service tests (6) and backend typecheck pass. Domain task committed as `1c445f3`; visibility edge tests committed as `3a815fd`.

### Task 2: API boundary and integration

**Files:** route/controller/dto/schema/mapper trong module; test backend/src/modules/message/reply-mentions.route.test.ts.

- [x] Step 1: Added isolated route tests for malformed reply IDs, inaccessible targets, ID-only reply metadata, and duplicate mentions.
- [x] Step 2: Ran the local backend Vitest executable; the new metadata tests failed because the existing send schema rejected reply and mention fields.
- [x] Step 3: Added Zod validation, controller ObjectId mapping, safe message DTO mapping, transactional persistence, and composition-root wiring. The app has one active message router.
- [x] Step 4: Route and affected messaging/read suites (20) plus backend typecheck pass. API task committed as `7c9ce24`.

### Task 3: Client contract

**Files:** frontend/features/chat/api/messages.api.ts; test frontend/features/chat/api/reply-mentions.api.test.ts.

- [x] Step 1: Added adapter tests for JSON fields, multipart field encoding, and preserved `ApiError.code`.
- [x] Step 2: Ran the local frontend Vitest executable; JSON omitted both fields and the multipart serializer was missing.
- [x] Step 3: Updated `sendMessage`, added a shared-key multipart serializer for F10, and extended the contract DTO/request types. No JSX or state.
- [x] Step 4: F09 and existing messaging adapter tests (7) pass; frontend typecheck and eslint pass. Adapter task committed as `2f48665`.

## Done when

FR-09 and all five review focus cases have test evidence: cross-conversation, pre-join, departed-member mention, duplicate mention, and sender-hidden reply target. The DTO contains only the validated reply ID; the app registers one active message router. Spec and AGENTS.md were checked.
