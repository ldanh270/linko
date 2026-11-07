# Local Development & Onboarding Guide

This guide walks new developers through bootstrapping the Linko monorepo locally from scratch.

---

## 1. Prerequisites

Ensure the following tools are installed on your workstation:

| Requirement | Minimum Version | Installation Check | Recommended Install Method |
|---|---|---|---|
| **Node.js** | `>= 20.18.0` | `node -v` | [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) |
| **pnpm** | `^11.15.1` | `pnpm -v` | `npm i -g pnpm@11.15.1` |
| **MongoDB** | `>= 7.0` | `mongod --version` | Docker or Homebrew / Windows MSI |
| **Redis** | `>= 6.0` | `redis-cli ping` | Docker or Homebrew / Memurai (Windows) |

> [!IMPORTANT]
> **MongoDB Replica Set Requirement:**
> Linko utilizes MongoDB multi-document transactions via `withTransaction`. Your local MongoDB instance **must have replica set mode enabled** (even as a single-node replica set `rs0`).

---

## 2. Quick Setup with Docker Compose (Recommended)

To run MongoDB (configured as a single-node replica set) and Redis quickly via Docker:

```yaml
# docker-compose.yml
services:
  mongodb:
    image: mongo:7.0
    container_name: linko-mongo
    command: ["--replSet", "rs0", "--bind_ip_all"]
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

  mongo-init:
    image: mongo:7.0
    depends_on:
      - mongodb
    command: >
      bash -c "sleep 2 && mongosh --host mongodb:27017 --eval 'rs.initiate({ _id: \"rs0\", members: [{ _id: 0, host: \"localhost:27017\" }] })'"

  redis:
    image: redis:7-alpine
    container_name: linko-redis
    ports:
      - "6379:6379"

volumes:
  mongo-data:
```

Start the containers:
```sh
docker compose up -d
```

---

## 3. Clone Repository & Install Dependencies

```sh
git clone https://github.com/your-username/linko.git
cd linko

# Install all monorepo dependencies
pnpm install
```

---

## 4. Configure Environment Variables

### Backend Configuration
```sh
cp backend/.env.example backend/.env
```
Ensure `backend/.env` has your database connection string and secrets:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
MONGODB_CONNECTION_STRING=mongodb://localhost:27017/linko?replicaSet=rs0
REDIS_URL=redis://localhost:6379

JWT_ACCESS_SECRET=your_jwt_access_secret_key_minimum_32_chars
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_minimum_32_chars
```

### Frontend Configuration
```sh
cp frontend/.env.example frontend/.env.local
```
Ensure `frontend/.env.local` contains:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 5. Seed Demo Data

Populate the database with pre-configured demo accounts:

```sh
pnpm run db:seed
```

When prompted, confirm by typing the database name (`linko`). This will create the standard demo accounts:

| Username | Email | Display Name | Default Password |
|---|---|---|---|
| `demo_an` | `demo.an@example.test` | An Nguyễn | `LinkoDemo123!` |
| `demo_binh` | `demo.binh@example.test` | Bình Trần | `LinkoDemo123!` |
| `demo_chi` | `demo.chi@example.test` | Chi Lê | `LinkoDemo123!` |
| `demo_duong` | `demo.duong@example.test` | Dương Phạm | `LinkoDemo123!` |

---

## 6. Running the Development Environment

Launch both backend and frontend concurrently:

```sh
pnpm dev
```

- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:5000](http://localhost:5000)

Log in with any of the demo accounts to test messaging, group chats, polls, appointments, and location sharing.

---

## 7. Running Quality Checks & Tests

Before submitting pull requests, run all quality gates:

```sh
# 1. Typecheck all workspaces
pnpm typecheck

# 2. Run linters
pnpm lint

# 3. Check Tailwind CSS classes
pnpm run fe:lint:tailwind

# 4. Run test suites
pnpm test
```

---

## 8. Common Troubleshooting

### `MongoServerSelectionError: connect ECONNREFUSED`
- Ensure MongoDB is running and reachable on port `27017`.
- Check if replica set initialization completed: `mongosh --eval "rs.status()"`.

### `querySrv ECONNREFUSED` with MongoDB Atlas
- If your system DNS resolver fails to resolve `mongodb+srv://` records, add custom resolvers in `backend/.env`:
  ```env
  DNS_SERVERS=1.1.1.1,8.8.8.8
  ```

### `.next` Typecheck Stale Artifact Errors
- If TypeScript reports missing files inside `.next/dev/types/validator.ts` after switching branches or pulling updates, clear the Next.js cache:
  ```sh
  rm -rf frontend/.next
  pnpm run fe:build
  ```
