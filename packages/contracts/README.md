# `@linko/contracts`

> **Single Source of Truth** for API contracts, data transfer objects (DTOs), error codes, route
> definitions, and real-time event constants shared across the Linko monorepo.

---

## Overview

`@linko/contracts` is a lightweight, zero-dependency TypeScript package consumed by both the
**Express backend** (`backend`) and the **Next.js frontend** (`frontend`). It ensures compile-time
and runtime type safety across network boundaries, preventing contract drift between server
endpoints and client adapters.

---

## Architecture & Design Principles

1. **Zero Runtime Dependencies:** Contracts export pure TypeScript interfaces, types, and immutable
   constant objects (`as const`).
2. **Deterministic Envelopes:** All HTTP responses conform strictly to the standard Linko API
   envelope structure (`{ success, data, error, meta }`).
3. **No Magic Strings or Literals:** Route paths, query parameters, error codes, socket events,
   database field keys, and roles are defined once as constants.
4. **Idempotent Identifiers:** Client-generated unique identifiers (`clientMessageId`) prevent
   duplicate message and card dispatch across retry loops.

---

## Canonical Envelope Specification

All REST API endpoints in Linko return a unified envelope structure defined in
[`envelope.ts`](src/envelope.ts):

### Success Envelope (`ApiSuccess<T>`)

```ts
export interface ApiSuccess<T> {
	success: true;
	data: T;
	error: null;
	meta: ApiMeta | null;
}
```

- `success`: Constant `true` discriminator.
- `data`: Typed payload of type `T`.
- `error`: Constant `null`.
- `meta`: Auxiliary pagination, cursor, or count metadata (e.g.,
  `{ nextCursor: string, totalCount: number }`).

### Failure Envelope (`ApiFailure`)

```ts
export interface ApiFailure {
	success: false;
	data: null;
	error: ApiErrorBody;
	meta: null;
}

export interface ApiErrorBody {
	code: string;
	message: string;
	details?: Record<string, unknown> | null;
	requestId?: string;
}
```

- `success`: Constant `false` discriminator.
- `data`: Constant `null`.
- `error.code`: Machine-readable error code defined in `ERROR_CODES`.
- `error.message`: Client-safe, human-readable description.
- `error.details`: Optional structured validation breakdown (e.g., field-level validation errors).
- `error.requestId`: Tracing correlation ID correlating the client error with server logs.

---

## Exported Modules Summary

| Module             | File                                         | Description                                                                                      |
| ------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Constants**      | [`constants.ts`](src/constants.ts)           | API routes, error codes, roles, field mappings, pagination limits, and regexes.                  |
| **Envelope**       | [`envelope.ts`](src/envelope.ts)             | `EntityId`, `ApiMeta`, `ApiErrorBody`, `ApiSuccess<T>`, `ApiFailure`, and `ApiEnvelope<T>`.      |
| **Auth**           | [`auth.ts`](src/auth.ts)                     | `UserDto`, `AuthAccessTokenDto`, `SignupInput`, `LoginInput`.                                    |
| **Conversations**  | [`conversations.ts`](src/conversations.ts)   | `InboxItemDto`, `ConversationParticipantSummaryDto`, `ConversationLastMessageSummaryDto`.        |
| **Messages**       | [`messages.ts`](src/messages.ts)             | `MessageDto`, `MessageAttachmentDto`, `SendMessageRequest`, `CursorPage<T>`.                     |
| **Chat Utilities** | [`chat-utilities.ts`](src/chat-utilities.ts) | `PollDto`, `AppointmentDto`, `LocationShareDto`, `ReminderDto`, `UtilityChangedEvent`.           |
| **Groups**         | [`groups.ts`](src/groups.ts)                 | `CreateGroupInput`, `GroupDto`, `GroupDetailsDto`, group lifecycle requests.                     |
| **Memberships**    | [`memberships.ts`](src/memberships.ts)       | `MemberDto`, `ChangeMemberRoleRequest`, `TransferOwnerRequest`.                                  |
| **Invitations**    | [`invitations.ts`](src/invitations.ts)       | `InvitationDto`, `InvitationPreviewDto`, `CreateInvitationInput`.                                |
| **Friends**        | [`friends.ts`](src/friends.ts)               | `FriendshipDto`, `FriendRequestDto`, friendship actions (`SEND`, `ACCEPT`, `DECLINE`).           |
| **Notifications**  | [`notifications.ts`](src/notifications.ts)   | `NotificationPreferenceDto`, `UpdateGroupMuteInput`.                                             |
| **Pins**           | [`pins.ts`](src/pins.ts)                     | `PinDto`, pin limit constants (`PIN_LIMITS.MAX_PINS = 3`).                                       |
| **Read State**     | [`read-state.ts`](src/read-state.ts)         | `ReadStateDto`, `MarkReadRequest`, unread counter structures.                                    |
| **Realtime**       | [`realtime.ts`](src/realtime.ts)             | Socket timing (`TYPING_TIMING`), presence limits (`PRESENCE_LIMITS`), presence status constants. |
| **Users**          | [`users.ts`](src/users.ts)                   | `UserProfileDto`, `UpdateProfileInput`, user search schemas.                                     |

---

## Usage Examples

### In Backend Services

```ts
import { ApiResponse } from "#/shared/http/ApiResponse";
import { ERROR_CODES, type UserDto } from "@linko/contracts";

export class UserController {
	async getProfile(req: Request, res: Response) {
		const user: UserDto = await this.userService.getUser(req.params.id);
		return res.status(200).json(ApiResponse.ok(user));
	}
}
```

### In Frontend Adapters & Hooks

```ts
import { ApiClient } from "@/shared/http/client";
import type { MessageDto, SendMessageRequest } from "@linko/contracts";

export async function sendMessage(payload: SendMessageRequest): Promise<MessageDto> {
	return apiClient.request<MessageDto>({
		path: "/api/messages",
		method: "POST",
		body: payload,
	});
}
```

---

## Build & Verification

```sh
# Typecheck contracts workspace
pnpm -C packages/contracts typecheck
```
