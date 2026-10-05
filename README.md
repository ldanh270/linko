# Linko development commands

Run commands from the repository root. Configure MongoDB in `backend/.env` with
`MONGODB_CONNECTION_STRING` before using database commands.

## Frontend

| Command                 | Action                                  |
| ----------------------- | --------------------------------------- |
| `pnpm run fe:dev`       | Start Next.js in development mode       |
| `pnpm run fe:build`     | Build the frontend                      |
| `pnpm run fe:start`     | Serve the production frontend build     |
| `pnpm run fe:lint`      | Run ESLint                              |
| `pnpm run fe:test`      | Run frontend tests                      |
| `pnpm run fe:typecheck` | Check frontend TypeScript               |
| `pnpm run fe:install`   | Install frontend workspace dependencies |

## Backend

| Command                 | Action                                                            |
| ----------------------- | ----------------------------------------------------------------- |
| `pnpm run be:dev`       | Start the backend with file watching                              |
| `pnpm run be:start`     | Start the backend without file watching                           |
| `pnpm run be:build`     | Typecheck the backend (it runs TypeScript directly through `tsx`) |
| `pnpm run be:lint`      | Run the backend lint/type check                                   |
| `pnpm run be:test`      | Run backend tests                                                 |
| `pnpm run be:typecheck` | Check backend TypeScript                                          |
| `pnpm run be:install`   | Install backend workspace dependencies                            |

`pnpm dev` starts both frontend and backend. The root `build`, `lint`,
`typecheck`, and `test` commands run their corresponding workspace commands.

## Database

| Command                             | Action                                                   |
| ----------------------------------- | -------------------------------------------------------- |
| `pnpm run db:status`                | Show the configured database and Linko collection counts |
| `pnpm run db:shell`                 | Open `mongosh` using `MONGODB_CONNECTION_STRING`         |
| `pnpm run db:seed`                  | Add the reserved local demo records                      |
| `pnpm run db:clear`                 | Clear documents in Linko-owned collections               |
| `pnpm run db:migrate:audit`         | Preview the audit-field and index migration              |
| `pnpm run db:migrate:notifications` | Preview the notification preference migration            |

`db:clear` refuses to run with `NODE_ENV=production` and asks you to type the
connected database name. It deletes documents only from Linko's six collections
(`users`, `sessions`, `friendships`, `friendrequests`, `conversations`, and
`messages`); it preserves collection indexes and any unrelated collections.

Migrations are dry-run by default. Apply the audit-field backfill with
`pnpm run db:migrate:audit -- --apply`. Index changes require the existing
review flags:

```sh
pnpm run db:migrate:audit -- --apply --apply-indexes --backup-confirmed --dry-run-reviewed
```

Apply the notification preference migration with
`pnpm run db:migrate:notifications -- --apply`. Review
[`backend/scripts/README.md`](backend/scripts/README.md) before applying database
migrations.

The older `pnpm run seed` command remains available as an alias for
`pnpm run db:seed`.
