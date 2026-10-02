# Cloudflare R2 media storage design

## Goal

Move Linko's profile image uploads from Cloudinary to Cloudflare R2 and add a
backend upload path for message attachments. Profile images remain publicly
readable. New message attachments are private and downloadable only by members
of their conversation.

## Current behavior

- `PATCH /api/users/me` accepts `avatar` and `background` multipart files and
  stores them through Cloudinary. MongoDB records `{ url, id }` for each image.
- `POST /api/messages/` accepts JSON metadata and optional attachment `{ url,
  id }` values. It does not receive or upload file bytes.
- `GET /api/messages/:conversationId` checks conversation membership before
  returning messages.
- The frontend is a Next.js scaffold and has no chat or upload interface.

## Chosen approach

Use a backend-mediated multipart upload for all new files. This keeps R2
credentials on the server, reuses the existing profile upload route, and adds
message files to the message creation request. Browser-direct presigned PUTs
would reduce backend bandwidth, but require a separate upload lifecycle and a
frontend upload flow that does not exist yet. Serving every private download
through the backend consumes backend bandwidth, but it preserves the requested
membership check on every download. Stream private files through a protected
application endpoint instead of issuing shareable bearer URLs.

## Storage layout and access

Use two R2 buckets because a public bucket would make its objects public even
when they are stored under an `attachments/` prefix:

- **Public media bucket:** avatar and background images. Store a stable URL
  under `R2_PUBLIC_BASE_URL` for rendering in existing clients. Configure the
  bucket's public custom domain outside the application; `r2.dev` is only for
  development use.
- **Private attachment bucket:** message attachment objects. Do not enable
  public access or configure a public domain for this bucket. Keep the object
  key in MongoDB. A protected application route verifies membership and streams
  the object from R2 on each download request; never expose the bucket endpoint
  or object key as a directly accessible URL.

Use the R2 S3-compatible API with `@aws-sdk/client-s3`. Credentials and
bucket/domain settings come from environment variables. The service must not
create buckets or change Cloudflare account settings.

## Upload API behavior

### Profile images

Keep `PATCH /api/users/me` and its `avatar` / `background` multipart fields.
Accept JPEG, PNG, and WebP input, up to 10 MiB per image and one file per field.
Multer parses the files into memory; after request validation, the backend
resizes images to a maximum width of 800 pixels, converts them to JPEG at
quality 82, and stores them in the public media bucket. Keep the current
MongoDB `{ url, id }` shape. New IDs use an `r2:` prefix followed by the object
key, allowing cleanup code to distinguish new R2 objects from legacy
Cloudinary public IDs.

Replacing or deleting a new image deletes its R2 object. Existing Cloudinary
images keep their current URLs and remain readable. When one is replaced or
deleted, use Cloudinary only to remove that legacy object; retain its package
and credentials for any legacy Cloudinary IDs that remain in MongoDB. Remove
that cleanup support only after a separate migration/cleanup. Do not bulk-copy
existing profile images to R2 in this change.

### Message attachments

`POST /api/messages/` continues to accept JSON text-only messages and also
accepts `multipart/form-data` with repeated `attachments` file fields plus the
existing message fields (`recipientId` or `conversationId`, `content`,
`replyTo`, and `mentions`; encode `mentions` as a JSON array string). New
attachment uploads:

- Allow up to 5 files per message and 10 MiB per file.
- Allow JPEG (`image/jpeg`, `.jpg`/`.jpeg`), PNG (`image/png`, `.png`), WebP
  (`image/webp`, `.webp`), PDF (`application/pdf`, `.pdf`), UTF-8 text
  (`text/plain`, `.txt`), CSV (`text/csv`, `.csv`), and OpenXML Word (`.docx`,
  `application/vnd.openxmlformats-officedocument.wordprocessingml.document`),
  Excel (`.xlsx`,
  `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`), and
  PowerPoint (`.pptx`,
  `application/vnd.openxmlformats-officedocument.presentationml.presentation`).
  Use `file-type` magic-byte detection for supported binary formats and validate
  the matching filename extension; validate `.txt` and `.csv` as UTF-8 text
  without NUL bytes. Reject HTML, SVG, scripts, executables, legacy
  macro-enabled files, and generic archives. Serve all files as attachments
  with `X-Content-Type-Options: nosniff`.
- Are parsed into memory first. Verify friendship for a new direct conversation
  or membership for an existing conversation before writing any object to R2.
- Store objects in the private bucket. Include the sanitized original filename,
  content type, and byte size in the message attachment metadata. Keep the
  object key in the existing attachment `id` field with the `r2:` prefix; add
  optional `name`, `contentType`, and `size` metadata fields. Do not persist a
  public object URL for new attachments. In API responses, replace that
  internal R2 `id` value with the attachment subdocument ID and provide the
  protected route as `url`; do not expose the stored R2 key.
- Return a protected API download URL in message creation and message-list
  responses, using `/api/messages/:messageId/attachments/:attachmentId`. The
  download route authenticates the bearer token, loads the message and its
  attachment subdocument, verifies membership in the parent message's
  conversation, then streams the object from the private bucket. Clients must
  send the access token when fetching this URL.
- Delete uploaded R2 objects if message/conversation persistence fails.

Keep JSON message requests for text-only messages; reject newly supplied JSON
`attachments` values so a client cannot claim an arbitrary public URL as a
private R2 object. Historical attachment records remain readable through the
authorized message API, but any historical public URL keeps its provider's
existing access behavior because historical files are not migrated.

The route must parse multipart fields before its friendship middleware. The
middleware should verify friendship when `recipientId` is supplied and defer
existing-conversation membership checks to the controller, which already checks
that the requester belongs to that conversation. The download route performs
its own membership check on every request.

## Configuration and dependencies

Add these backend settings to `.env.example` and document them:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_BUCKET_NAME`
- `R2_PRIVATE_BUCKET_NAME`
- `R2_PUBLIC_BASE_URL`

Add `@aws-sdk/client-s3`, `file-type`, and `sharp`; remove
`multer-storage-cloudinary`. Keep the Cloudinary SDK only for deleting legacy
profile media. The example environment must label the remaining Cloudinary
variables as legacy-cleanup credentials needed while MongoDB still contains
Cloudinary IDs. The R2 access key must be scoped for object reads/writes/deletes
in both buckets; the private bucket must have no public access enabled.

Update the backend README and the Postman message example to describe the
multipart attachment request and the required R2 bucket setup. Do not add a
chat UI in the frontend scaffold. Historical public URLs are not made private
by this change; strict member-only checks apply to newly uploaded R2
attachments.

## Failure handling

- Missing or invalid R2 configuration must produce a clear backend error before
  attempting an upload.
- Reject unsupported file types, excess file count, and oversize files before
  storing objects.
- If a database write fails after upload, attempt to delete every object created
  for that request and preserve the original request error.
- If a protected download fails, return an appropriate not-found or internal
  server error without exposing bucket names, credentials, or object keys.
- If replacing a legacy Cloudinary image, a failed legacy deletion must be
  logged without losing the newly saved R2 image.
- If saving a new profile image fails, delete the newly uploaded R2 object; only
  delete the replaced object after the user document has saved successfully.

## Out of scope

- Bulk migration of existing Cloudinary images or historical message URLs.
- Direct browser-to-R2 uploads, public message attachment URLs, chat UI, group
  avatar upload, bucket provisioning, and changes to message deletion/recall.
- Changing attachment visibility for historical URLs already stored in MongoDB.
