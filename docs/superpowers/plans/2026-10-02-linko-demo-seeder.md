# Linko Local Demo Seeder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe, repeatable command that creates representative local Linko demo data.

**Architecture:** A TypeScript CLI connects with the existing MongoDB setting, refuses production mode, and confirms the database name before writing. It upserts deterministic fixtures with `$setOnInsert`, then exits after disconnecting; root and backend package scripts expose it.

**Tech Stack:** Node.js ES modules, TypeScript, `tsx`, Mongoose, `bcrypt`, `dotenv`, Node `readline/promises`.

**Spec:** `docs/superpowers/specs/2026-10-02-linko-demo-seeder-design.md`

## Global Constraints

- Use fixed ObjectIds for fixture documents and upsert by those IDs with `$setOnInsert`.
- The seeder must not drop collections or delete records.
- It refuses to run when `NODE_ENV=production` and asks the operator to confirm the target database name before writing.
- It requires the existing `MONGODB_CONNECTION_STRING` setting, reports failures with a nonzero exit code, and always closes the Mongoose connection.
- Use `example.test` email addresses and the shared local-only login `LinkoDemo123!`; store only its bcrypt hash.
- Do not seed sessions, uploaded files, or Cloudinary records.
- Disable automatic collection and index creation while connecting, before database-name confirmation.

## Review Focus

- `NODE_ENV=production`: reject before connecting to MongoDB.
- Missing `MONGODB_CONNECTION_STRING`: report configuration failure without connecting.
- Database-name confirmation mismatch or EOF: perform no collection/index creation or data writes, then disconnect.
- Repeat invocation: `$setOnInsert` preserves the existing fixture documents and creates no duplicates.
- Any write error: set a nonzero exit code and close the Mongoose connection.

These are code-review checkpoints; no test files or test runs are included because the user did not request testing.

---

### Task 1: Implement the safe fixture seeder

**Files:**
- Create: `backend/scripts/seed.ts`

**Interfaces:**
- Consumes: `MONGODB_CONNECTION_STRING`, `NODE_ENV`, and the existing `User`, `Friendship`, `FriendRequest`, `Conversation`, and `Message` models.
- Produces: `seedDemoData(): Promise<{ users: number; friendships: number; friendRequests: number; conversations: number; messages: number }>` for fixture upsert and inserted-count reporting.

- [x] **Step 1: Define stable fixtures**

  Reserve fixed ObjectIds for four users (`demo_an`, `demo_binh`, `demo_chi`, `demo_duong`), friendship records, one pending request, one direct and one group conversation, and representative messages. Use friendship pairs An–Bình, Bình–Chi, and Chi–Dương to fit the current friendship index without changing the schema. Use `example.test` emails and `LinkoDemo123!`; set only the bcrypt hash in user documents. Keep message timestamps and `lastMessage` references consistent. Sort friendship endpoints and direct-conversation participants explicitly because bulk upserts do not invoke document save hooks.

- [x] **Step 2: Add guards and execution lifecycle**

  Load dotenv before reading settings. Reject production mode and missing `MONGODB_CONNECTION_STRING` before connecting. Connect with `autoCreate: false` and `autoIndex: false`, show `mongoose.connection.name`, and require the operator to type that exact database name before any write. Treat mismatch or EOF as a clean abort. Set `process.exitCode = 1` on errors and disconnect in `finally`.

- [x] **Step 3: Upsert and report fixture documents**

  Implement `seedDemoData()` using `bulkWrite` `updateOne` operations filtered by each reserved `_id`, with `$setOnInsert` and `upsert: true`. Seed users before documents that reference them, messages before conversations, and print the upserted counts. Never call collection deletion or reset APIs.

### Task 2: Expose and document the command

**Files:**
- Modify: `backend/package.json`
- Modify: `package.json`
- Modify: `backend/README.md`

**Interfaces:**
- Consumes: `backend/scripts/seed.ts` from Task 1.
- Produces: backend `seed` script (`tsx scripts/seed.ts`) and root `seed` script (`nr -C backend seed`).

- [x] **Step 1: Add package scripts**

  Add the backend command and root convenience command without changing existing scripts.

- [x] **Step 2: Document local usage**

  Add the root command, the exact production guard and database-name prompt behavior, and the four demo usernames plus shared local-only login to `backend/README.md`. State that the command never clears collections and that these accounts are for local development.
