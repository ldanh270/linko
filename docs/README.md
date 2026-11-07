# Linko Technical Documentation Hub

Welcome to the Linko Technical Documentation Hub. This directory contains in-depth, production-ready architectural guides, API contracts, database specifications, and runbooks for engineers building and maintaining Linko.

---

## Documentation Directory

```
docs/
├── README.md                              # This documentation portal index
├── architecture/
│   ├── system-overview.md                 # System architecture, layered patterns, and data pipelines
│   └── realtime-protocol.md               # Socket.IO connection lifecycle, room topology, and presence bitmap
├── api/
│   └── rest-api-specification.md          # Comprehensive REST API endpoint catalog and response envelopes
├── database/
│   └── schema-and-migrations.md           # Mongoose schemas, partial unique indexes, soft delete, and audit runbooks
├── storage/
│   └── cloudflare-r2-dual-bucket.md       # S3-compatible dual-bucket isolation and authenticated streaming
├── features/
│   └── chat-utilities-deep-dive.md        # Technical spec for Polls, Appointments, Reminders, and Location Sharing
└── guides/
    └── local-development-setup.md         # Developer onboarding, Docker, database seeding, and troubleshooting
```

---

## Document Index & Summary

### 1. Architecture & Design

- 🏛️ [**System Architecture Overview**](architecture/system-overview.md):
  Covers the overall system topology, monorepo workspace dependencies, clean-architecture layering (Routes, Middlewares, Controllers, Services, Repositories), Aspect-Oriented Programming (AOP), and dependency inversion patterns.

- ⚡ [**Real-Time Protocol & Socket.IO Engine**](architecture/realtime-protocol.md):
  Detailed protocol specification for real-time messaging, user and conversation room topology, typing indicator cadences, and presence tracking using Redis bitfields (`SETBIT`/`GETBIT`).

---

### 2. APIs & Data Transfer

- 🔌 [**REST API Specification**](api/rest-api-specification.md):
  Exhaustive endpoint catalog with HTTP verbs, authentication requirements, request schemas, status codes, error mappings, and standard `{ success, data, error, meta }` response envelopes.

- ☁️ [**Cloudflare R2 Dual-Bucket Storage**](storage/cloudflare-r2-dual-bucket.md):
  Explains the separation between the public media bucket (avatars, banners) and the isolated private attachment bucket, including MIME sniffing, signed tokens, and conversation-authorized streaming proxies.

---

### 3. Persistence & Operations

- 🗄️ [**Database Models, Indexes & Migrations**](database/schema-and-migrations.md):
  Complete documentation of MongoDB collections, Mongoose schemas, compound and partial unique indexes (accommodating soft deletes), AOP audit plugins, and step-by-step migration runbooks.

- 🎯 [**Chat Utilities Deep-Dive**](features/chat-utilities-deep-dive.md):
  Detailed operational specifications for the in-chat utility suite: interactive polls, scheduled appointments, distributed reminder workers with lease management, and privacy-first live location sharing.

- 🚀 [**Local Development & Onboarding Guide**](guides/local-development-setup.md):
  Comprehensive onboarding guide for new contributors, including prerequisite installation, local MongoDB/Redis configuration, test execution, and common troubleshooting steps.
