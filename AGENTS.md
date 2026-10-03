# Engineering Standards (for AI Agents)

> **Persona:** Act as a Senior Software Engineer with 20+ years of experience. You write clean, readable, maintainable code that follows SOLID, OOP, AOP and well-known design patterns. You optimize for the next developer who has to read and change your code, not for the fewest keystrokes.
>
> **Keywords:** **MUST / MUST NOT** = hard rule, no exceptions. **SHOULD** = default; deviate only with a written reason in the PR/summary.
>
> **Priority when rules conflict:** explicit user instruction → this file → existing code conventions in the repo → general best practice.

---

## 0. Project Decisions (fill in once, never deviate)

These are the "pick one and be consistent" decisions. Before writing any code, read this table. If a row is blank, **infer it from the existing schema/code and follow it**; if nothing exists, use the DEFAULT. Never introduce a second style.

| Decision | Chosen value | DEFAULT if blank |
|---|---|---|
| ID type (PKs **and** FKs, incl. `createdBy`/`updatedBy`) | MongoDB ObjectId; string in API DTOs | UUID (string) everywhere |
| Enum strategy | Text values defined once in `@linko/contracts` constants | Text values defined once in a constants file (see 6.4) |
| `delFlag` type | `Boolean`, default `false` | `Boolean`, default `false` |
| Timestamp type | MongoDB `Date` in UTC | `timestamptz` (UTC) |
| API response envelope | `{ success, data, error, meta }` | `{ success, data, error, meta }` (see 3.5) |
| ORM / validation lib | Mongoose / Zod | Prisma / Zod |

---

## 1. Core Principles

### 1.1 SOLID: what it means in practice

| Principle | Concrete rule for this codebase |
|---|---|
| **S**ingle Responsibility | One reason to change per class/function/file. A controller handles HTTP only; a service handles business rules only; a repository handles data access only. If you write "and" in a function's summary, split it. |
| **O**pen/Closed | Adding a new variant (payment method, notification channel, export format) MUST NOT require editing existing `if/else` or `switch` chains. Use Strategy/Factory/registry (see 5). |
| **L**iskov Substitution | Any implementation of an interface MUST be usable wherever the interface is expected without special-casing. No `instanceof` checks on injected dependencies. |
| **I**nterface Segregation | Small, role-specific interfaces (`UserReader`, `UserWriter`) over one fat interface. Consumers depend only on what they use. |
| **D**ependency Inversion | High-level modules depend on abstractions. Inject dependencies via constructor; wire them in ONE composition root. Never `new` a collaborator inside a service. |

### 1.2 Clean code rules

- **KISS / YAGNI:** build what the task needs, not what it might need. No speculative abstractions. Apply the *rule of three*: abstract on the third repetition, not the first.
- **DRY:** one source of truth for every piece of knowledge (field names, error codes, routes, enum values, validation rules).
- **Naming:** names reveal intent. Classes = nouns (`OrderService`), functions = verbs (`calculateTotal`), booleans = `is/has/can/should` prefix. No abbreviations except universally known ones (`id`, `url`, `dto`). No `data`, `info`, `temp`, `manager`, `helper` as stand-alone names.
- **Functions:** do one thing, ≤ ~30 lines, ≤ 3 parameters (use an options object beyond that), single level of abstraction, early return over deep nesting (max 2 levels).
- **No magic values:** no raw strings/numbers for statuses, roles, error codes, routes, query keys, field names, config. Use constants (see 6).
- **No dead code, no commented-out code, no `console.log`.** Use the logger.
- **Immutability by default:** `const`, `readonly`, no mutation of arguments.
- **Strict typing:** TypeScript `strict: true`. No `any` (use `unknown` + narrowing). No non-null `!` unless provably safe and commented.
- **Composition over inheritance.** Inherit only for genuine "is-a" with shared behavior (e.g. a base exception class).
- **Pure functions** for calculations and mapping. Side effects live at the edges (controllers, repositories, hooks).

### 1.3 OOP

- Backend services, repositories, strategies and exceptions are **classes** behind **interfaces**, with constructor-injected dependencies and `private`/`readonly` members (encapsulation).
- Avoid anemic god-classes (`Utils`, `Helper`, `Manager`). Behavior lives next to the data it operates on.
- Pure stateless utilities and React components/hooks MAY be functions; do not force classes where the framework idiom is functional.

### 1.4 AOP (Aspect-Oriented Programming)

**Cross-cutting concerns MUST NOT be hand-written inside business code.** Implement them once, as aspects, and apply them declaratively.

| Concern | Where it lives (Express/Prisma/React) |
|---|---|
| Authentication / RBAC | Middleware (`authenticate`, `authorize(PERMISSIONS.X)`) |
| Request validation | Middleware (`validate(schema)`) |
| Error translation & responses | **Global error handler** (see 2) |
| Logging / request ID / tracing | Middleware + `AsyncLocalStorage` request context |
| Audit columns (`createdBy`, `updatedIp`…) | ORM extension/middleware (see 6.1) |
| Soft-delete filtering (`delFlag`) | ORM extension/middleware (see 6.2) |
| Transactions | `withTransaction(fn)` higher-order function / decorator |
| Caching, rate limiting, retries | Middleware / decorators / HOFs |
| FE: auth token, 401 handling, error toasts | HTTP client interceptors, Error Boundaries, query client defaults |

Rule of thumb: if the same 3+ lines appear at the start/end of many functions (try/catch, logging, permission check, setting audit fields), it is an aspect and belongs in one place.

---

## 2. Exception Handling

### 2.1 Two kinds of exceptions: never mix them

| | **Business exception** | **Technical exception** |
|---|---|---|
| Meaning | The request is invalid or violates a business rule (not found, duplicate email, insufficient balance, wrong password, validation failure, forbidden) | A bug or infrastructure failure (null reference, DB down, bad query, unexpected third-party response) |
| Whose fault | The client / the user | Our code / our infra |
| Logging | **Do NOT log.** It is expected behavior. | **MUST log** on the server with full stack and context. |
| Fix needed? | No. | **Yes.** It is a defect to investigate and fix. |
| Response to client | Real HTTP status (4xx), stable `code`, safe human-readable `message` | **Generic `500`** with a generic message only. **NEVER** leak stack traces, SQL, file paths, or internal messages. |

### 2.2 Rules

1. All errors are handled in **one global error handler**. Controllers and services MUST NOT build error responses by hand.
2. Controllers MUST NOT contain `try/catch` (use `asyncHandler`, or Express ≥ 5 native async support). Services MUST NOT catch an error just to log it and rethrow.
3. Throw business exceptions from the service layer using typed classes, never `throw new Error('...')` for expected conditions.
4. Catch a technical exception **only** to (a) translate a *known, client-caused* infra error into a business exception at the boundary (e.g. Prisma `P2002` unique violation → `ConflictException`), or (b) add context and rethrow. Everything else bubbles up to the global handler.
5. Error codes and messages are **constants** (see 6), never inline strings. Error codes are part of the API contract and are stable.
6. Anything that is not a `BusinessException` is treated as technical, by default.

### 2.3 Reference implementation

```ts
// shared/errors/business.exception.ts
/**
 * Base class for expected, client-caused errors. Never logged; returned to the client as-is.
 */
export class BusinessException extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly httpStatus: number,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundException extends BusinessException {
  constructor(code: ErrorCode = ERROR_CODES.NOT_FOUND, message = 'Resource not found') {
    super(code, 404, message);
  }
}
export class ConflictException extends BusinessException { /* 409 */ }
export class ValidationException extends BusinessException { /* 400 + details */ }
export class UnauthorizedException extends BusinessException { /* 401 */ }
export class ForbiddenException extends BusinessException { /* 403 */ }
```

```ts
// shared/middlewares/global-error-handler.ts
export const globalErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // 1) Business exception: expected. No logging. Return as-is.
  if (err instanceof BusinessException) {
    return res
      .status(err.httpStatus)
      .json(ApiResponse.fail(err.code, err.message, err.details));
  }

  // 2) Known client-caused library errors (malformed JSON, expired JWT...) → map to business
  const mapped = clientErrorMapper.map(err);
  if (mapped) {
    return res.status(mapped.httpStatus).json(ApiResponse.fail(mapped.code, mapped.message));
  }

  // 3) Technical exception: log everything server-side, expose nothing to the client.
  logger.error(
    { err, requestId: req.id, method: req.method, url: req.originalUrl, userId: req.user?.[USER_FIELDS.ID] },
    'Unhandled technical exception',
  );
  return res
    .status(500)
    .json(ApiResponse.fail(ERROR_CODES.INTERNAL, 'Internal server error', undefined, req.id));
};
```

- Logs MUST be structured (JSON), carry a `requestId`, and MUST redact secrets/PII (passwords, tokens, auth headers, card numbers). Never log raw `req.body`.
- The `requestId` is returned to the client so support can correlate a 500 with the server log.

### 2.4 Frontend

- The HTTP client interceptor normalizes API errors into one `ApiError` shape. UI code branches on `error.code`, never on message text.
- A global Error Boundary catches render crashes. Business errors → user-friendly toast/inline message. 500 → generic "Something went wrong" (+ request ID). Never display raw server messages for 500s.

### 2.5 API response envelope (default)

```jsonc
// success
{ "success": true, "data": { }, "meta": { "page": 1, "pageSize": 20, "total": 134 } }
// failure
{ "success": false, "error": { "code": "USER_EMAIL_TAKEN", "message": "Email already in use", "details": null, "requestId": "…" } }
```

---

## 3. Backend Architecture

### 3.1 Layers (dependencies point inward only)

```
Route → Middleware (auth, validate) → Controller → Service → Repository → DB
                                          │            │
                                         DTOs      Domain logic / events
```

| Layer | Responsibility | MUST NOT |
|---|---|---|
| **Route** | Map path + method → middleware chain → controller method. | Contain logic. |
| **Controller** | Parse validated input, call **one** service method, shape the HTTP response. | Contain business rules, call repositories, or access the DB. |
| **Service** | Business rules, orchestration, transaction boundary, publishing domain events. | Know about `req`/`res`, HTTP status codes, or Prisma query details. |
| **Repository** | The only place that talks to the ORM/DB. Returns domain entities. | Contain business rules. |
| **DTO / Mapper** | Define request/response contracts; map entity ↔ DTO. | Be skipped. |

- **Never return raw DB entities** from the API. Map to a response DTO. Always strip `password`, tokens, `delFlag`, and the `*Ip` audit columns unless explicitly required.
- Input is validated at the boundary (schema validation middleware). Services trust validated types but still enforce business invariants.
- Organize **by feature module**, not by technical type:

```
src/
  modules/
    user/
      user.route.ts
      user.controller.ts
      user.service.ts
      user.repository.ts
      user.dto.ts
      user.mapper.ts
      user.constants.ts        # USER_FIELDS, user error codes, user events
      user.types.ts
  shared/
    constants/  errors/  middlewares/  utils/  logger/  context/
  config/
  app.ts    # composition root: wires dependencies
```

### 3.2 Dependency injection

- Constructor injection, depend on interfaces. Wire in **one** composition root (`app.ts`/container). No service locators, no hidden singletons (`export const x = new X()` scattered around).
- Singleton behavior is achieved by the container's lifetime, not by a static `getInstance()`.

### 3.3 Transactions

- The **service** owns the transaction boundary. Use `withTransaction(async (tx) => { … })` and pass `tx` to repositories. Never start transactions in controllers or repositories.

### 3.4 Security baseline

- Never trust client input. Validate, sanitize, and authorize on the server (RBAC checks via middleware, ownership checks in the service).
- No secrets in code or logs. Config comes from environment variables, validated at startup.
- Hash passwords with a modern algorithm (argon2/bcrypt). JWT: short-lived access token, rotated refresh token, verify `exp`/`iss`/`aud`.
- Use parameterized queries only (ORM or `$queryRaw` with parameters). Never concatenate SQL.
- Apply least privilege: every route declares the permission it requires; default is deny.

---

## 4. Design Patterns: Use With Judgment

Use a pattern **when it removes a concrete problem**, never as decoration. Name the pattern in the class doc-comment (`@pattern Strategy`).

| Pattern | Use it when | Example here |
|---|---|---|
| **Repository** | Isolating persistence from business logic. | `UserRepository` hides Prisma. |
| **Strategy** | Behavior varies by type/config; you'd otherwise write `if/switch` on a type. | Payment gateways, export formats (CSV/XLSX/PDF), pricing rules. |
| **Factory / Registry** | Selecting/creating the right implementation by key. | `NotificationChannelFactory.get(CHANNELS.EMAIL)`. |
| **Observer (Domain Events / Pub-Sub)** | A change must trigger several decoupled reactions. The publisher MUST NOT know the subscribers. | `user.created` → send welcome email, write audit entry, create default workspace. |
| **Adapter / Facade** | Wrapping a third-party SDK so the rest of the code depends on *our* interface. | `MailerPort` + `SendgridMailerAdapter`. |
| **Decorator / Middleware / Chain of Responsibility** | Layering cross-cutting behavior around a call. | Express middleware chain, `withTransaction`, caching wrapper. |
| **Builder** | Constructing complex objects/queries with many optional parts. | Dynamic filter/sort query builder. |
| **Template Method** | A fixed algorithm skeleton with variable steps. | Base importer: `parse() → validate() → persist()`. |
| **State** | Behavior depends on a lifecycle status with strict transitions. | Order: `PENDING → PAID → SHIPPED`. |

**Observer example (domain events):**

```ts
// Publisher: knows nothing about subscribers
await this.eventBus.publish(EVENTS.USER_CREATED, { userId: user[USER_FIELDS.ID] });

// Subscriber: registered in the composition root
eventBus.subscribe(EVENTS.USER_CREATED, welcomeEmailHandler.handle);
eventBus.subscribe(EVENTS.USER_CREATED, defaultWorkspaceHandler.handle);
```

- Subscribers MUST be idempotent and MUST NOT break the publisher's transaction. Technical failures in a subscriber are logged (technical exception rules apply).
- **Anti-patterns:** Singleton for convenience, God objects, deep inheritance trees, premature abstraction, patterns with a single implementation and no foreseeable second.

---

## 5. Database Conventions

### 5.1 Mandatory audit columns: every table, no exceptions

| Column | Type (default) | Set by |
|---|---|---|
| `createdAt` | `timestamptz`, default `now()` | DB default |
| `updatedAt` | `timestamptz`, auto-updated | ORM (`@updatedAt`) |
| `createdBy` | same type as the User ID | Audit aspect, from request context |
| `updatedBy` | same type as the User ID | Audit aspect |
| `createdIp` | `varchar(45)` (fits IPv6) | Audit aspect |
| `updatedIp` | `varchar(45)` | Audit aspect |
| `delFlag` | per Project Decisions (default `Boolean false`) | Soft-delete aspect |

- Application code MUST NOT set these columns by hand. A single audit aspect fills them from `AsyncLocalStorage` request context (`userId`, `ip`). System jobs use a defined `SYSTEM` actor.
- Back-office/system writes with no request context MUST still set `createdBy`/`updatedBy` to the `SYSTEM` actor id, never `null` by accident.

```prisma
model User {
  id         String   @id @default(uuid())
  email      String
  name       String

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  createdBy  String?
  updatedBy  String?
  createdIp  String?  @db.VarChar(45)
  updatedIp  String?  @db.VarChar(45)
  delFlag    Boolean  @default(false)

  @@map("users")
}
```

```ts
// shared/context/request-context.ts
export const requestContext = new AsyncLocalStorage<{ requestId: string; userId?: string; ip: string }>();

// infra/prisma/audit.extension.ts  (illustrative; adapt types to your Prisma version)
export const auditExtension = Prisma.defineExtension({
  name: 'audit',
  query: {
    $allModels: {
      async create({ args, query }) {
        const ctx = requestContext.getStore();
        args.data = {
          ...args.data,
          [AUDIT_FIELDS.CREATED_BY]: ctx?.userId ?? SYSTEM_ACTOR_ID,
          [AUDIT_FIELDS.UPDATED_BY]: ctx?.userId ?? SYSTEM_ACTOR_ID,
          [AUDIT_FIELDS.CREATED_IP]: ctx?.ip,
          [AUDIT_FIELDS.UPDATED_IP]: ctx?.ip,
        };
        return query(args);
      },
      async update({ args, query }) {
        const ctx = requestContext.getStore();
        args.data = {
          ...args.data,
          [AUDIT_FIELDS.UPDATED_BY]: ctx?.userId ?? SYSTEM_ACTOR_ID,
          [AUDIT_FIELDS.UPDATED_IP]: ctx?.ip,
        };
        return query(args);
      },
      // createMany / upsert / updateMany handled the same way
    },
  },
});
```

### 5.2 Soft delete

- "Delete" = set `delFlag = true` (+ audit columns). Hard delete only for explicitly approved cases (GDPR erasure, purge jobs).
- Reads MUST exclude soft-deleted rows by default (a query extension adds `delFlag = false`). Reading deleted rows requires an explicit, named opt-in (`includeDeleted`).
- Unique constraints must account for soft delete: use a **partial unique index** (`UNIQUE (email) WHERE del_flag = false`) via raw SQL migration, otherwise a deleted row blocks re-use of the value.

### 5.3 IDs: one type everywhere

- Use the single ID type from **Project Decisions** for *every* PK, FK, and reference column (including `createdBy`/`updatedBy`, polymorphic refs, JWT `sub`, API path params, and FE types).
- Never mix `int` and `uuid` across tables. Never expose sequential IDs if the project decision is UUID.

### 5.4 Enums: one strategy everywhere

Choose **one** strategy per Project Decisions, and apply it to **all** enums in the project:

- **Strategy A: constants + text/int column:** values defined once in a constants file; DB stores the text (or int) value. Use `as const` objects and derived union types (see 6.3). No DB-native enums.
- **Strategy B: lookup tables (DB-managed, CRUD-able):** every enum becomes a table with its own CRUD and FKs pointing to it.

You MUST NOT have one enum as a native DB enum, another as a lookup table, and another as a free-text column. The DB value, TS constant, API payload, and FE option list for a given enum MUST come from the **same** source.

### 5.5 Naming & schema hygiene

- Tables: plural `snake_case` (`@@map`). Columns in code: `camelCase`. Booleans: `is*/has*`.
- Every FK has an explicit index. Every query pattern used for filtering/sorting has a supporting index.
- Migrations only through the ORM's migration tool; never edit an applied migration; every migration is reversible or documented as irreversible.
- Money: `Decimal`/integer minor units, never `float`.
- Store all times in UTC; convert in the UI.

---

## 6. Constants: Single Source of Truth

> **Rule:** any field name that is **reused or repeated**, and any magic string/number, MUST be referenced through a constant so it can be changed in **one place**.

### 6.1 Field-name access

```ts
// modules/user/user.constants.ts
export const USER_FIELDS = {
  ID: 'id',
  NAME: 'name',
  EMAIL: 'email',
} as const;                       // `as const` keeps literal types → full type-safety
export type UserField = (typeof USER_FIELDS)[keyof typeof USER_FIELDS];

// ❌ Bad
const label = user.name;
await prisma.user.findMany({ select: { name: true, email: true } });

// ✅ Good
const label = user[USER_FIELDS.NAME];
await prisma.user.findMany({ select: { [USER_FIELDS.NAME]: true, [USER_FIELDS.EMAIL]: true } });
```

Applies to every place a field name crosses a boundary or repeats: DB columns/Prisma selects, DTO keys, JSON keys, form field names, table column definitions, query-param keys, sort/filter keys.

### 6.2 What else MUST be a constant

Route paths, permission/role names, error codes, event names, query-param keys, default page size, cache keys, storage keys, regexes, config keys, status values, HTTP header names, user-facing message keys.

### 6.3 Constants file conventions

- Module-specific constants live in `<module>.constants.ts`. Shared ones live in `shared/constants/`. Never duplicate a constant across modules, import it.
- Naming: object `SCREAMING_SNAKE_CASE` (`USER_FIELDS`), keys `SCREAMING_SNAKE_CASE`, always `as const`.
- Enums: `export const ORDER_STATUS = { PENDING: 'PENDING', PAID: 'PAID' } as const; export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];`
- The FE SHOULD import shared constants/types from the same package (monorepo) or generate them from the API contract. Never hand-copy.

---

## 7. Frontend (React) Standards

### 7.1 Separate UI from logic: mandatory

- A component file contains **JSX and presentation only**. All state, effects, handlers, derived data, API calls, and form logic live in a **separate custom hook file** that the component calls.

```
features/user/
  components/UserTable.tsx        # UI only
  hooks/useUserTable.ts           # logic only (state, handlers, URL params, queries)
  api/user.api.ts                 # HTTP calls, no React
  user.constants.ts               # USER_FIELDS, query keys, param keys
  user.types.ts
  pages/UserListPage.tsx          # composes components + hooks
```

```tsx
// ✅ UI file: no logic
export function UserTable() {
  const { rows, isLoading, search, onSearchChange, sort, onSortChange, pagination } = useUserTable();
  if (isLoading) return <TableSkeleton />;
  return (/* pure JSX */);
}

// ✅ Hook file: all logic
export function useUserTable() { /* useQuery, URL params, handlers… */ }
```

- Components receive data and callbacks via props/hook return values; they never call `fetch`/axios directly.
- Component size and splitting rules are defined in **7.2 (Component SRP)**.
- Server state via a query library (e.g. TanStack Query), not hand-rolled `useEffect` fetching. Forms via a form library + schema validation; field names via constants.
- Hooks: one responsibility each, names start with `use`, return a stable, typed object.

### 7.2 Component SRP: one component, one responsibility

7.1 separates **UI from logic**. This section governs how the **UI itself** is split. A component has exactly **one reason to change**. If you can't describe it in one short sentence without "and", split it.

**Component roles**

| Role | Responsibility | MUST NOT |
|---|---|---|
| **Page** (route entry) | Read route context, call the page-level hook, **compose** sections into a layout. | Contain detailed markup, table/row/form JSX, or business logic. |
| **Section / Feature component** | Render **one meaningful block** of a page (filter bar, data table, detail panel, form modal), wired to its own hook or props. | Render unrelated blocks or know about sibling sections. |
| **Presentational component** | Props in → JSX out (row, card, badge, empty state). Pure and reusable. | Fetch data, read URL/global state, or contain business rules. |
| **Shared primitive** (`shared/components`) | Domain-agnostic building blocks (`Button`, `Input`, `Modal`, `Table`, `Pagination`). | Import anything from a feature module. |

**When to split: any ONE of these triggers means extract a component**

- The file exceeds ~150 lines, or JSX nests deeper than 3–4 levels.
- The component has more than one reason to change (e.g. filters + table layout + row actions in one file).
- A `.map()` callback renders more than a few lines of JSX → extract `<Item />` / `<Row />`.
- The same JSX appears twice in a feature (extract immediately); across features, apply the rule of three, then move it to `shared/components`.
- A block has its own loading / empty / error state, or its own local state.
- A conditional renders large branches → extract each branch into a named component.
- Modals, drawers, and dialogs are **always** their own component (with their own hook).

**When NOT to split**

- Don't extract a 3-line, single-use fragment that has no meaningful name. Fragmentation is as bad as a god-component.
- If splitting forces you to pass the same props through 3+ levels, fix it with **composition** (`children`/slots) or context instead of more pass-through props.

**Hard limits**

| Item | Limit |
|---|---|
| Lines per component file | ≤ ~150 |
| JSX nesting depth | ≤ 3–4 levels |
| Props per component | ≤ ~7 (more means it does too much, or needs a grouped object / composition) |
| Exported components per file | **1** (file name = component name, PascalCase) |

**Props rules**

- Type props as `<ComponentName>Props`. Callbacks are named `on*` (`onSubmit`, `onRowClick`).
- Pass only what the child needs. Prefer a few primitives or a small view-model over an entire entity.
- Avoid boolean-flag explosions (`isPrimary isLarge isGhost`). Use a typed `variant`/`size` prop or composition.
- Prefer **composition over configuration**: build with `children`/slots rather than a component with 15 optional "show/hide" props.
- State lives in the **lowest** component that needs it. Lift it only when siblings must share it.

**Folder convention.** A component that needs its own hook, subcomponents, or styles gets a folder:

```
features/user/
  pages/UserListPage.tsx              # composes only
  components/
    UserFilterBar.tsx                 # section
    UserTable.tsx                     # section (maps rows → <UserTableRow />)
    UserTableRow.tsx                  # presentational
    UserStatusBadge.tsx               # presentational
    UserFormModal/
      UserFormModal.tsx               # UI only
      useUserForm.ts                  # its logic
  hooks/
    useUserList.ts
    useUserFilters.ts
```

**Example**

```tsx
// ❌ Bad: one component fetches, filters, lays out the table, renders rows, and owns the modal (200+ lines)
export function UserListPage() { /* … */ }

// ✅ Good: the page only composes
export function UserListPage() {
  const { rows, isLoading, pagination } = useUserList();
  return (
    <PageLayout title="Users" actions={<CreateUserButton />}>
      <UserFilterBar />
      <UserTable rows={rows} isLoading={isLoading} />
      <Pagination {...pagination} />
    </PageLayout>
  );
}

// ✅ The section only renders states + maps rows. The row logic lives elsewhere.
export function UserTable({ rows, isLoading }: UserTableProps) {
  if (isLoading) return <TableSkeleton columns={USER_TABLE_COLUMNS.length} />;
  if (rows.length === 0) return <EmptyState message={MESSAGES.USER_EMPTY} />;
  return (
    <Table>
      {rows.map((user) => (
        <UserTableRow key={user[USER_FIELDS.ID]} user={user} />
      ))}
    </Table>
  );
}
```

### 7.3 UX rule: filters and queries live in the URL

- Every filter, search, sort, pagination, and tab selection MUST be reflected in **URL search params**, so a refresh, back button, or shared link restores the exact view.
- Use one reusable hook (e.g. `useQueryParamState`) built on the router's search-params API. Param keys come from **constants**.
- Rules:
  - The URL is the **single source of truth**; do not duplicate it in `useState`.
  - Parse + validate params, falling back to defaults on invalid input.
  - Reset `page` to 1 whenever a filter or search changes.
  - Debounce text search before writing to the URL; use `replace` for keystroke-level updates and `push` for discrete changes.
  - Omit params equal to their default value to keep URLs clean.

### 7.4 UX rule: every interactive element has complete states

All buttons and clickable elements MUST implement, via the **shared** `<Button>`/`<IconButton>`/`<Link>` components (so it is defined once, not per usage):

| State | Requirement |
|---|---|
| Hover | Visible change (color/elevation) + `cursor-pointer` |
| Active / pressed | Visible pressed feedback (scale/darken) |
| Focus-visible | Clear focus ring (keyboard accessibility) |
| Disabled | Reduced emphasis, `cursor-not-allowed`, not focusable, no click |
| Loading | Spinner + `aria-busy`, **blocks double-submit** |
| Transition | Short, smooth (≈100–200 ms), respects `prefers-reduced-motion` |

Also required for every data view: **loading**, **empty**, and **error** states. Destructive actions need confirmation. Async actions give success/failure feedback.

### 7.5 General FE rules

- No inline business logic or magic strings in JSX. No `any`. No prop drilling beyond 2 levels (use composition/context).
- Accessibility: semantic HTML, labels for inputs, keyboard operable, sufficient contrast, `alt` text.
- Don't store tokens in places exposed to XSS where avoidable; follow the project's auth decision.

---

## 8. Code Comment Standard (unified template)

All comments are in **English**, use **TSDoc/JSDoc** format, and explain **why** and **contract**, not what the code obviously does. Every exported class, function, method, hook, component, constant group, and type MUST have a doc-comment in these templates.

**Class / Service / Repository:**
```ts
/**
 * <One-line summary of the responsibility.>
 *
 * <Why it exists / key business rules / constraints. Optional.>
 *
 * @pattern <Pattern name, if any (Strategy | Repository | Observer ...)>
 * @layer   <Controller | Service | Repository | Strategy | Aspect ...>
 */
```

**Function / Method:**
```ts
/**
 * <One-line summary starting with a verb.>
 *
 * <Business rule, side effects, or non-obvious behavior. Optional.>
 *
 * @param orderId - <meaning, constraints>
 * @returns <what is returned, and when it can be null/empty>
 * @throws {NotFoundException} <when>
 * @throws {ConflictException} <when>
 * @example
 * const total = await service.calculateTotal(orderId);
 */
```

**Constants / Enum-like objects / Types:**
```ts
/** <What this group represents and where it is used.> */
export const ORDER_STATUS = { … } as const;
```

**React hook:**
```ts
/**
 * <What state/behavior this hook encapsulates.>
 *
 * @returns <shape of returned state and handlers>
 */
```

**React component:**
```tsx
/**
 * <What the component renders.> UI only, logic lives in `use<Name>`.
 *
 * @param props - <short description or link to the Props type>
 */
```

**Prisma models:** use `///` doc comments for models and non-obvious columns.

**Inline comments:**
- Only for *why*, trade-offs, workarounds, or non-obvious constraints. Never narrate the code.
- Tagged forms only: `// TODO(owner): …`, `// FIXME(owner): …`, `// NOTE: …`, `// HACK: … (link to issue)`. A TODO without an owner or context is not allowed.
- Delete outdated comments in the same change that makes them outdated.

---

## 9. Testing

- Services: unit tests with mocked repositories (depend on interfaces, so this is trivial). Business exceptions asserted by **class and code**, not message text.
- Repositories/aspects: integration tests against a real test DB.
- Controllers/routes: a few end-to-end tests for status codes, envelope shape, auth, and the global handler (including that a technical error yields a generic 500 with **no** internal detail).
- FE: test hooks (logic) separately from components (rendering). Test URL-param behavior of filters.
- Test names describe behavior: `should_throw_conflict_when_email_already_exists`.
- A bug fix MUST include a regression test.

---

## 10. Agent Workflow (follow every task)

### Before writing code
1. Read **Section 0 (Project Decisions)** and the existing module you will touch. Follow existing patterns and file layout. Do not invent a parallel style.
2. Locate existing constants, DTOs, hooks, shared components, and error codes. **Reuse before creating.**
3. If requirements are ambiguous, state your assumption explicitly in your summary rather than silently guessing. If an assumption affects the data model or API contract, ask first.

### While writing code
4. Make the smallest change that fully solves the task. Do not refactor unrelated code or reformat untouched files. If you spot a problem outside scope, mention it; don't fix it silently.
5. New code MUST follow this document even if surrounding legacy code does not. Flag the discrepancy instead of copying the bad pattern.
6. Add/modify doc-comments using the templates in Section 8.

### Definition of Done: self-review checklist
- [ ] Layers respected: no logic in controllers/routes/UI components; no DB access outside repositories
- [ ] Business errors thrown as `BusinessException` subclasses; no try/catch noise; nothing leaks to the client
- [ ] Technical errors reach the global handler, are logged with context, and return a generic 500
- [ ] No magic strings/numbers; all repeated field names go through constants (`obj[FIELDS.X]`)
- [ ] New tables have all 7 audit columns; no manual audit-field assignment; soft delete respected
- [ ] ID type and enum strategy match **Project Decisions**: no mixed styles
- [ ] DTOs used at the API boundary; no raw entities, no `password`/`delFlag`/`*Ip` leaked
- [ ] Cross-cutting concerns handled by aspects, not copy-pasted
- [ ] FE: UI separated from hook logic; filters/sort/pagination are in URL params; buttons have hover/active/focus/disabled/loading
- [ ] FE components follow SRP (7.2): pages only compose, one responsibility per component, ≤ ~150 lines, one exported component per file, no large inline JSX inside `.map()`
- [ ] Loading, empty, and error states exist for every data view
- [ ] Types strict, no `any`, no `console.log`, no dead/commented-out code
- [ ] Doc-comments follow the template; tests added/updated; lint, typecheck, and tests pass
- [ ] Any deviation from this document is justified in the summary

### Never do
- ❌ Return stack traces, SQL, or internal error text to a client
- ❌ Log business exceptions (expected behavior) or swallow technical ones silently
- ❌ Hand-write audit fields, soft-delete filters, or auth checks inside business methods
- ❌ Add a second ID type or a second enum strategy
- ❌ Put logic in a UI component file or HTTP calls inside components
- ❌ Build a monolithic page/component that mixes layout, filters, table, rows, and modals in one file
- ❌ Hard-code field names, routes, error codes, or statuses
- ❌ Introduce a pattern, library, or abstraction without a concrete need in the current task
