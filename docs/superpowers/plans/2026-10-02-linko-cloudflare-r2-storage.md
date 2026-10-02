# Cloudflare R2 Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store new profile images and message attachments in Cloudflare R2, with private message files downloadable only through membership-checked backend routes.

**Architecture:** A shared R2 S3 client writes profile images to a public media bucket and message files to a separate private bucket. MongoDB keeps stable public URLs for profile media and private object keys plus metadata for messages. Authenticated download requests load the message, verify conversation membership, and stream the selected object from R2.

**Tech Stack:** TypeScript, Express, Multer memory storage, AWS SDK v3 S3 client, `sharp`, `file-type`, Mongoose, and Cloudinary cleanup for legacy profile IDs.

**Spec:** [docs/superpowers/specs/2026-10-02-linko-cloudflare-r2-storage-design.md](../specs/2026-10-02-linko-cloudflare-r2-storage-design.md)

## Global Constraints

- Profile uploads accept JPEG, PNG, and WebP; maximum one file per field and 10 MiB per image; resize to width at most 800 pixels and encode JPEG at quality 82.
- Message uploads accept at most 5 files per message and 10 MiB per file.
- Attachment MIME types and extensions follow the allowlist in the spec; text and CSV must be valid UTF-8 without NUL bytes.
- Profile media uses the public bucket; new message files use the private bucket and are streamed only after membership validation.
- Historical Cloudinary images and historical message URLs are not migrated; their current visibility remains unchanged.
- No chat UI, browser-direct R2 upload, bucket provisioning, or message deletion/recall work.
- Do not add or run tests unless the user asks; use code inspection for this implementation.

## Review Focus

- Missing or malformed R2 settings: the storage adapter must fail clearly before sending an object command (Task 1 source inspection).
- MIME/extension mismatch, malformed binary files, invalid text encoding, zero-byte files, and limit boundaries: reject before any object is written (Tasks 2 and 3 source inspection).
- A non-member requests an existing conversation attachment: deny before `GetObject` and return no object bytes (Task 3 source inspection).
- A database write fails after upload: attempt to remove every object created by that request and preserve the database error (Tasks 2 and 3 source inspection).
- A legacy image ID has no `r2:` prefix: route cleanup to Cloudinary and never issue R2 deletion for that ID (Task 2 source inspection).

---

### Task 1: Add the R2 storage adapter and configuration

**Files:**
- Create: `backend/src/configs/r2.config.ts`
- Create: `backend/src/services/r2Storage.service.ts`
- Modify: `backend/package.json`
- Create: `backend/pnpm-lock.yaml` (the backend package has no local lockfile yet)
- Modify: `backend/.env.example`

**Interfaces:**
- `getR2Settings(): R2StorageSettings` validates `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, both bucket names, and `R2_PUBLIC_BASE_URL`; it throws an actionable configuration error if any required setting is missing or malformed.
- `putR2Object(input: { bucket: "public" | "private"; key: string; body: Buffer; contentType: string }): Promise<void>` writes with the selected bucket and declared content type.
- `deleteR2Object(input: { bucket: "public" | "private"; key: string }): Promise<void>` deletes one object.
- `getPrivateR2Object(key: string): Promise<{ body: NodeJS.ReadableStream; contentType?: string; contentLength?: number }>` reads a private object for an authorized streaming response.
- `getPublicR2Url(key: string): string` joins a normalized `R2_PUBLIC_BASE_URL` and object key.

- [x] Add direct backend dependencies `@aws-sdk/client-s3`, `file-type`, `sharp`, and `cloudinary`; remove `multer-storage-cloudinary`. Update the backend lockfile using the repository's pnpm workflow.
- [x] Add the R2 settings and an S3 client configured for `region: "auto"` and `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`; select bucket names from the `public` / `private` scope.
- [x] Implement `putR2Object`, `deleteR2Object`, `getPrivateR2Object`, and `getPublicR2Url` in `r2Storage.service.ts`; keep bucket names and R2 endpoint details inside this adapter.
- [x] Replace the Cloudinary-required `.env.example` comment with the R2 settings; label `CLOUDINARY_*` as legacy cleanup credentials.
- [x] Inspect that no storage command is constructed until the settings validator succeeds, and that private objects have no code path constructing a public R2 URL.

### Task 2: Move profile images to the public R2 bucket

**Files:**
- Modify: `backend/src/middlewares/upload.middleware.ts`
- Modify: `backend/src/routes/user.route.ts`
- Modify: `backend/src/utils/image.util.ts`
- Modify: `backend/src/services/user.service.ts`
- Modify: `backend/src/configs/cloudinary.config.ts` (retain only legacy deletion support)
- Modify: `backend/README.md`

**Interfaces:**
- `storeProfileImage(input: { userId: string; field: "avatar" | "background"; file: Express.Multer.File }): Promise<{ url: string; id: string }>` validates/normalizes an image, writes it to the public bucket, and returns `{ url, id: "r2:<key>" }`.
- `deleteStoredProfileImage(image: { url?: string; id?: string }): Promise<void>` dispatches `r2:` IDs to R2 and legacy IDs to Cloudinary.
- `PATCH /api/users/me` continues to accept `avatar` and `background` multipart fields and return the existing user shape.

- [x] Replace `CloudinaryStorage` with Multer memory storage for `avatar` and `background`; keep one-file-per-field and 10 MiB limits and restrict declared MIME types to JPEG, PNG, and WebP.
- [x] Implement `storeProfileImage` using `sharp` to validate the image, limit width to 800 pixels, encode JPEG at quality 82, and upload under a generated `avatars/` or `backgrounds/` key.
- [x] Implement `deleteStoredProfileImage` so `r2:` IDs delete from the public bucket and legacy IDs call `cloudinary.uploader.destroy`.
- [x] Update `UserService.updateUserInfo` to support explicit image deletion even when no replacement file is present. Save the user before deleting replaced objects; on upload or save failure remove every newly uploaded R2 object and rethrow the original error; log but do not fail the saved update if old-object cleanup fails.
- [x] Update README setup instructions with public bucket/domain configuration and the retained Cloudinary legacy cleanup requirement.
- [x] Inspect that existing avatar/background URLs remain unchanged unless the user replaces or deletes them, and that uploaded R2 image URLs use only `R2_PUBLIC_BASE_URL`.

### Task 3: Upload new message attachments into the private bucket

**Files:**
- Modify: `backend/src/models/Message.ts`
- Modify: `backend/src/middlewares/upload.middleware.ts`
- Modify: `backend/src/middlewares/friend.middleware.ts`
- Modify: `backend/src/routes/message.route.ts`
- Modify: `backend/src/controllers/message.controller.ts`
- Modify: `backend/src/services/message.service.ts`
- Create: `backend/src/services/messageAttachment.service.ts`

**Interfaces:**
- `storeMessageAttachments(input: { userId: string; files: Express.Multer.File[] }): Promise<Array<{ id: string; name: string; contentType: string; size: number }>>` validates files and uploads private objects with `id: "r2:<key>"`; it removes already uploaded objects if a later upload fails.
- `deleteMessageAttachments(attachments: Array<{ id: string }>): Promise<void>` removes the private R2 objects represented by `r2:` IDs.
- Persisted new attachment metadata is `{ id: "r2:<key>", name, contentType, size }`; response URL projection is added in Task 4.

- [x] Extend the attachment subdocument with optional `name`, `contentType`, and `size` fields while keeping `url` and `id` for stored historical records.
- [x] Add `parseMessageFiles` using Multer memory storage, `.array("attachments", 5)`, and a 10 MiB file limit; validate the exact spec allowlist, `file-type` signatures for supported binary types, UTF-8 text/CSV, filename extensions, and non-empty buffers before R2 upload.
- [x] Change the message POST chain to parse multipart fields before `checkFriendship`. Keep friendship checks for `recipientId`; let requests with `conversationId` reach the controller's existing participant check.
- [x] Update `MessageController.sendMessage` to accept multipart text fields and files, parse `mentions` JSON, reject JSON-supplied new attachments, require text or at least one file, and finish friendship/membership checks before storing objects.
- [x] Store private R2 metadata on the message; if message/conversation persistence fails, delete every uploaded private object and preserve the original error. Keep JSON text-only requests working.

### Task 4: Authorize and stream private attachment downloads

**Files:**
- Modify: `backend/src/routes/message.route.ts`
- Modify: `backend/src/controllers/message.controller.ts`
- Modify: `backend/src/services/message.service.ts`
- Modify: `backend/src/services/messageAttachment.service.ts`
- Modify: `backend/postman/collections/Linko.postman_collection.json`
- Modify: `backend/README.md`

**Interfaces:**
- `getMessageAttachmentDownloadUrl(messageId: string, attachmentId: string): string` returns `/api/messages/<messageId>/attachments/<attachmentId>` without an R2 URL.
- `MessageController.downloadAttachment(req, res)` resolves the message and attachment, checks conversation membership, reads the private object, and streams it with a safe attachment filename, content type, and `X-Content-Type-Options: nosniff`.
- In API responses, a new R2 attachment's `url` is the protected route and its `id` is the attachment subdocument ID; never expose the stored R2 key. Keep historical `{ url, id }` records readable as stored.

- [x] Add the protected GET route `/api/messages/:messageId/attachments/:attachmentId`. Load the message and attachment by Mongo IDs, verify requester membership before `GetObject`, then stream the body; return 404 for missing/private objects without exposing bucket details.
- [x] Add protected route URLs to new attachment fields in message creation and message-list responses, using the message and attachment subdocument IDs; replace internal R2 `id` values with attachment subdocument IDs. Do not replace historical URLs.
- [x] Update the Postman collection with a multipart message example and README with fields, limits, allowlist, private bucket setup, and bearer-token download behavior.
- [x] Inspect that message creation and downloads check friendship/membership before any R2 write/read, and historical links are returned unchanged.

### Task 5: Review the complete diff and operational instructions

**Files:**
- Review: `backend/src/configs/r2.config.ts`
- Review: `backend/src/services/r2Storage.service.ts`
- Review: profile and message upload/download files from Tasks 2–4
- Review: `backend/.env.example`, `backend/README.md`, and Postman collection

- [x] Read the full diff against the spec, focusing on private/public bucket separation, legacy Cloudinary cleanup routing, multipart parsing order, membership checks, and failure cleanup.
- [x] Check JSON/YAML syntax for the changed package and Postman files and run `git diff --check`; do not run tests unless the user asks.
- [x] Summarize required Cloudflare setup: two buckets, one public custom domain, one private bucket without public access, and scoped R2 S3 credentials.
