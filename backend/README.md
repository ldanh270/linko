# linko-backend

A simple way to stay connected with seamless chat and smooth calls.

## MongoDB DNS troubleshooting

If startup fails with `querySrv ECONNREFUSED` for a `mongodb+srv://` connection,
check the DNS servers used by Node with
`node -e "console.log(require('node:dns').getServers())"`.
If the configured resolver is unavailable, set `DNS_SERVERS` in the backend
`.env` to a trusted resolver that can answer this cluster's SRV query, then
restart the backend. The migration CLI uses the same setting. Leave it empty
to use Node's system resolver. The cluster hostname is sent to the selected
resolver, so use one approved for that metadata.

## Local demo data

From the repository root, run:

```sh
pnpm run seed
```

The command connects using `MONGODB_CONNECTION_STRING`, refuses to run when
`NODE_ENV=production`, and asks you to type the connected database name before
writing. It only inserts the reserved demo records and does not clear existing
collections. Re-running it leaves existing demo records unchanged.

New demo accounts use the initial local-only login `LinkoDemo123!`:

- `demo_an` — An Nguyễn (`demo.an@example.test`)
- `demo_binh` — Bình Trần (`demo.binh@example.test`)
- `demo_chi` — Chi Lê (`demo.chi@example.test`)
- `demo_duong` — Dương Phạm (`demo.duong@example.test`)

Use these accounts only in local development.

## Cloudflare R2 uploads

New avatar and background images use the public media bucket. New message
attachments use a separate private bucket and are streamed only after the API
confirms that the requester belongs to the conversation.

Create two R2 buckets in Cloudflare:

- A public media bucket with a custom domain. Set that domain as
  `R2_PUBLIC_BASE_URL`; `r2.dev` is suitable only for local development.
- A private attachments bucket with public access disabled and no public
  domain.

Create an R2 API token scoped to read, write, and delete objects in both
buckets. Copy its access key and secret, along with the account ID and both
bucket names, into the R2 settings in `.env`. See
[`.env.example`](.env.example) for the variable names. Cloudinary
credentials remain optional cleanup credentials while existing MongoDB user
records still contain Cloudinary image IDs.

Profile uploads remain `PATCH /api/users/me` multipart fields named `avatar`
and `background`. Each accepts one JPEG, PNG, or WebP image up to 10 MiB; the
backend resizes it to at most 800 pixels wide and stores a JPEG.

To send message attachments, use `POST /api/messages/` as
`multipart/form-data`. Send either `recipientId` or `conversationId`, an
optional `content`, optional `replyTo`, optional `mentions` as a JSON array
string, and up to five repeated `attachments` file fields. Each file is limited
to 10 MiB. Accepted files are JPEG, PNG, WebP, PDF, UTF-8 TXT, UTF-8 CSV, and
OpenXML DOCX/XLSX/PPTX. The backend validates file signatures, extensions, and
text encoding before writing to the private bucket. The Postman collection has
a `SendMessage with attachments` multipart example.
Set the Postman collection's `access_token` variable to a valid bearer token
before sending it.

New attachment responses include a protected API URL at
`/api/messages/:messageId/attachments/:attachmentId`. Fetch it with the same
`Authorization: Bearer <access-token>` header. Every download checks
conversation membership. New attachment object keys are never returned to the
client. Existing Cloudinary profile URLs and historical message attachment
URLs remain unchanged.
