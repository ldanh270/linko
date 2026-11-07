# REST API Specification

This document provides the complete, authoritative specification for all Linko REST API endpoints.

---

## 1. Global Conventions

### Base URL
All API routes are prefixed under `/api` (e.g., `http://localhost:5000/api`).

### Response Envelopes
Every HTTP endpoint returns a standardized JSON envelope conforming to `@linko/contracts`:

#### Successful Response (`2xx`)
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": null
}
```

#### Paginated Response (`2xx`)
```json
{
  "success": true,
  "data": [ ... ],
  "error": null,
  "meta": {
    "nextCursor": "651d2f8e1234567890abcdef",
    "totalCount": 42
  }
}
```

#### Error Response (`4xx` / `5xx`)
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION",
    "message": "Invalid request",
    "details": { "email": ["Invalid email format"] },
    "requestId": "req_01h7x..."
  },
  "meta": null
}
```

---

## 2. Authentication & Session Endpoints (`/api/auth`)

### 2.1 Sign Up
- **Method:** `POST /api/auth/signup`
- **Auth:** None
- **Body:**
  ```json
  {
    "username": "alice_w",
    "password": "StrongPassword123!",
    "email": "alice@example.com",
    "displayName": "Alice Williams"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "651d2f8e...",
      "username": "alice_w",
      "displayName": "Alice Williams",
      "email": "alice@example.com"
    },
    "error": null,
    "meta": null
  }
  ```

### 2.2 Login
- **Method:** `POST /api/auth/login`
- **Auth:** None
- **Body:**
  ```json
  {
    "username": "alice_w",
    "password": "StrongPassword123!"
  }
  ```
- **Headers:** Sets `Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Lax`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs..."
    },
    "error": null,
    "meta": null
  }
  ```

### 2.3 Refresh Token
- **Method:** `POST /api/auth/refresh-token`
- **Auth:** Refresh Cookie
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs..."
    },
    "error": null,
    "meta": null
  }
  ```

### 2.4 Logout
- **Method:** `POST /api/auth/logout`
- **Auth:** Optional / Refresh Cookie
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": { "loggedOut": true },
    "error": null,
    "meta": null
  }
  ```

---

## 3. User & Profile Endpoints (`/api/users`)

### 3.1 Get Current User Profile
- **Method:** `GET /api/users/me`
- **Auth:** Bearer Access Token
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "651d2f8e...",
      "username": "alice_w",
      "displayName": "Alice Williams",
      "email": "alice@example.com",
      "bio": "Software engineer and open-source enthusiast.",
      "avatarUrl": "https://media.linko.test/avatars/651d2f8e.jpg",
      "backgroundUrl": null
    },
    "error": null,
    "meta": null
  }
  ```

### 3.2 Update User Profile
- **Method:** `PATCH /api/users/me`
- **Auth:** Bearer Access Token
- **Content-Type:** `multipart/form-data`
- **Fields:**
  - `displayName`: string (optional)
  - `bio`: string (optional)
  - `avatar`: file binary (JPEG, PNG, WebP up to 10 MiB)
  - `background`: file binary (JPEG, PNG, WebP up to 10 MiB)
- **Response `200 OK`:** Returns updated `UserProfileDto`.

### 3.3 Search Users
- **Method:** `GET /api/users?q=alice&limit=20`
- **Auth:** Bearer Access Token
- **Response `200 OK`:** List of user profiles.

---

## 4. Friend & Connection Endpoints (`/api/friends`)

### 4.1 List Friends
- **Method:** `GET /api/friends`
- **Auth:** Bearer Access Token
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "651d2f8e...",
        "userId": "651d3a1b...",
        "username": "bob_m",
        "displayName": "Bob Martin",
        "avatarUrl": "https://media.linko.test/avatars/651d3a1b.jpg",
        "status": "accepted",
        "createdAt": "2026-10-03T10:00:00.000Z"
      }
    ],
    "error": null,
    "meta": null
  }
  ```

### 4.2 Send Friend Request
- **Method:** `POST /api/friends/requests`
- **Auth:** Bearer Access Token
- **Body:** `{ "recipientId": "651d3a1b..." }`
- **Response `201 Created`:** Returns created `FriendRequestDto`.

### 4.3 Accept Friend Request
- **Method:** `POST /api/friends/requests/:requestId/accept`
- **Auth:** Bearer Access Token
- **Response `200 OK`:** Returns new friendship record.

---

## 5. Conversations & Inbox (`/api/conversations`)

### 5.1 List Inbox Conversations
- **Method:** `GET /api/conversations?kind=all`
- **Query Params:** `kind=all|group|direct`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "651d4567...",
        "type": "GROUP",
        "status": "ACTIVE",
        "participants": [ ... ],
        "unreadCount": 3,
        "lastMessage": {
          "id": "651d89ab...",
          "sender": { "id": "651d3a1b...", "displayName": "Bob", "avatarUrl": null },
          "content": "Let's review the release plan tomorrow.",
          "createdAt": "2026-11-06T14:30:00.000Z"
        },
        "group": {
          "name": "Frontend Team",
          "description": "Next.js & UI design discussions",
          "avatarUrl": null
        },
        "createdAt": "2026-10-01T12:00:00.000Z",
        "updatedAt": "2026-11-06T14:30:00.000Z"
      }
    ],
    "error": null,
    "meta": null
  }
  ```

### 5.2 Create Group Conversation
- **Method:** `POST /api/conversations/groups`
- **Content-Type:** `multipart/form-data`
- **Fields:**
  - `name`: string (1-100 characters)
  - `description`: string (optional, up to 500 characters)
  - `avatar`: file (optional)
  - `members`: JSON array of user IDs `["651d3a1b...", "651d99ff..."]`
- **Response `201 Created`:** Returns created group conversation.

---

## 6. Messages & Attachments (`/api/messages`)

### 6.1 List Messages (Cursor Pagination)
- **Method:** `GET /api/messages?conversationId=651d4567...&cursor=...&limit=30`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "651d89ab...",
          "conversationId": "651d4567...",
          "senderId": "651d3a1b...",
          "clientMessageId": "uuid-v4-client-id",
          "content": "Meeting notes attached below.",
          "replyTo": null,
          "mentions": [],
          "attachments": [
            {
              "id": "651d9999...",
              "url": "/api/messages/651d89ab.../attachments/651d9999...",
              "name": "specs.pdf",
              "contentType": "application/pdf",
              "size": 1048576
            }
          ],
          "createdAt": "2026-11-06T14:30:00.000Z",
          "updatedAt": "2026-11-06T14:30:00.000Z"
        }
      ],
      "nextCursor": "651d89aa..."
    },
    "error": null,
    "meta": null
  }
  ```

### 6.2 Send Message (Text & Attachments)
- **Method:** `POST /api/messages`
- **Content-Type:** `multipart/form-data`
- **Fields:**
  - `conversationId`: string (or `recipientId` for direct message bootstrap)
  - `clientMessageId`: string (unique client UUID)
  - `content`: string (optional if attachments present)
  - `replyTo`: string (optional message ID)
  - `mentions`: string (JSON array string of user IDs)
  - `attachments`: repeat up to 5 files (max 10 MiB each)
- **Response `201 Created`:** Returns created `MessageDto`.

### 6.3 Secure Attachment Download
- **Method:** `GET /api/messages/:messageId/attachments/:attachmentId`
- **Auth:** Bearer Access Token
- **Headers:** `Content-Type: <validated-mime>`, `Content-Disposition: inline/attachment`
- **Response `200 OK`:** Binary stream streamed securely from private R2 bucket.

---

## 7. Chat Utilities (`/api/conversations/:id/...`)

### 7.1 Interactive Polls
- **Create Poll:** `POST /api/conversations/:id/polls`
  - Body: `{ "clientMessageId": "...", "question": "Release date?", "options": ["Monday", "Wednesday"], "mode": "single" }`
- **Vote on Poll:** `POST /api/conversations/:id/polls/:resourceId/vote`
  - Body: `{ "optionIds": ["opt_1"] }`
- **Close Poll:** `POST /api/conversations/:id/polls/:resourceId/close`

### 7.2 Scheduled Appointments
- **Create Appointment:** `POST /api/conversations/:id/appointments`
  - Body: `{ "clientMessageId": "...", "title": "Design Sync", "startsAt": "2026-11-10T10:00:00Z", "timezone": "Asia/Ho_Chi_Minh", "place": "Room 3B" }`
- **RSVP:** `POST /api/conversations/:id/appointments/:resourceId/rsvp`
  - Body: `{ "status": "going", "reminderMinutes": 15 }`

### 7.3 Foreground Live Location
- **Start Location:** `POST /api/conversations/:id/locations`
  - Body: `{ "clientMessageId": "...", "durationMinutes": 60, "publisherId": "tab_uuid", "latitude": 10.7769, "longitude": 106.7009, "accuracy": 12.5 }`
- **Push Fix:** `POST /api/conversations/:id/locations/:resourceId/fix`
  - Body: `{ "publisherId": "tab_uuid", "sequence": 2, "latitude": 10.7772, "longitude": 106.7012, "accuracy": 10.0 }`
- **Stop Location:** `POST /api/conversations/:id/locations/:resourceId/stop`

### 7.4 Personal Reminders
- **Create Reminder:** `POST /api/reminders`
  - Body: `{ "conversationId": "...", "messageId": "...", "dueAt": "2026-11-10T09:00:00Z", "note": "Review bug" }`
- **List Reminder Inbox:** `GET /api/reminders/inbox`
  - Response: `{ "items": [ ... ], "nextCursor": null, "unreadCount": 1 }`
- **Mark All Read:** `POST /api/reminders/read-all`
