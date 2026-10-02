# Linko local demo seeder

## Goal

Provide representative local data for trying Linko's existing user, friend,
conversation, and message flows without manually creating records.

## Scope

- Add a TypeScript seeder under `backend/scripts/seed.ts`, run with the existing
  `tsx` dependency.
- Add a `seed` command in the backend package and a root convenience command.
- Create four demo users (`demo_an`, `demo_binh`, `demo_chi`, `demo_duong`),
  friendships, one pending friend request, a direct conversation, a group
  conversation, and representative Vietnamese messages.
- Use `example.test` email addresses and the shared local-only login
  `LinkoDemo123!`; store only its bcrypt hash.
- Do not seed sessions, uploaded files, or Cloudinary records.
- Document the command and demo logins in the backend README.

## Data and repeatability

Use fixed ObjectIds for fixture documents and upsert by those IDs with
`$setOnInsert`. This makes repeated runs idempotent while preserving any
existing fixture edits and limiting writes to the seeder's own records. Use
friendship pairs An–Bình, Bình–Chi, and Chi–Dương to fit the current friendship
index; do not change the existing schema or indexes in this task. Seeded
conversations must reference their messages consistently in `lastMessage`;
participants and friendship endpoints must follow the ordering used by
existing model hooks and services.

The seeder must not drop collections or delete records. It refuses to run when
`NODE_ENV=production` and asks the operator to confirm the target database name
before writing. Disable Mongoose automatic collection and index creation while
connecting so cancellation performs no database writes. It requires the
existing `MONGODB_CONNECTION_STRING` setting, reports failures with a nonzero
exit code, and always closes the Mongoose connection.

## Acceptance

- A developer can run one documented command from the repository root.
- The command creates a complete, usable local demo dataset.
- Re-running the command does not duplicate fixture records or touch unrelated
  records.
- Production mode is rejected before any database write.

## Out of scope

- Production data migration or seeding.
- Resetting or clearing a database.
- Randomized fixture generation or a general-purpose fixture framework.
