# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CourseFlow AI** — A web app that professors connect to their Gmail to automatically manage course communications. Students email the professor using a plus-addressed email (e.g., `prof+cs101@university.edu`), and CourseFlow monitors, classifies, triages, and optionally auto-responds. A living FAQ is generated from actual student questions (anonymized, FERPA-compliant).

**Key insight:** No custom email infrastructure. Plus-addressing works on the professor's existing Gmail. Students email the professor like normal. CourseFlow just watches and helps.

## Architecture

### System Flow

```
Student emails prof+course@uni.edu
    → Gmail delivers to professor's inbox
    → Gmail Pub/Sub fires webhook to CourseFlow
    → CourseFlow classifies, drafts response, updates FAQ
    → Professor approves/edits via dashboard OR auto-reply sends
```

### Authentication Model

CourseFlow uses a **decoupled authentication model**:

1. **Login via Magic Link** — Professors and students sign in by entering their email and clicking a link sent to their inbox. No passwords, no Google OAuth wall on first visit.

2. **Gmail as a Connector** — Gmail integration is a toggleable connector, not required at signup. Professors can create courses, upload syllabi, manage rosters, and use FAQ features before ever connecting Gmail. When ready, they connect Gmail from Settings → Integrations.

This design eliminates friction: professors get value immediately without navigating OAuth consent screens.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router) — professor dashboard + student portal |
| Backend | Next.js API routes + BullMQ workers |
| Database | PostgreSQL 16 + pgvector (embeddings for semantic search) |
| Auth | Magic link (email-based, JWT sessions) |
| Integrations | Gmail API (toggleable connector, per-user OAuth tokens) |
| LLM | Anthropic Claude Sonnet 4.5 (classification, FAQ gen, drafts, chatbot) |
| Embeddings | OpenAI text-embedding-3-small (1536 dimensions) |
| Job Queue | BullMQ + Redis (async email processing, cron tasks) |
| File Storage | Local disk (MVP) → S3/DigitalOcean Spaces (later) |
| Hosting | DigitalOcean droplet ($48/month for MVP) |

### Key Directories (Target Structure)

```
courseflow/
├── app/                        # Next.js app (pages + API routes)
│   ├── (auth)/                 # Auth pages (login, verify)
│   ├── (professor)/            # Professor dashboard pages
│   │   ├── dashboard/
│   │   ├── courses/
│   │   ├── settings/
│   │   └── analytics/
│   ├── (student)/              # Student-facing pages
│   │   ├── faq/
│   │   ├── chat/
│   │   └── emails/
│   └── api/                    # API routes
│       ├── auth/               # Magic link endpoints
│       ├── integrations/       # Gmail connector OAuth
│       ├── courses/            # Course CRUD
│       ├── emails/             # Email processing + approval
│       ├── faq/                # FAQ management
│       ├── gmail/              # Gmail Pub/Sub webhook
│       ├── student/            # Student-facing API
│       └── cron/               # Cron-triggered endpoints
├── lib/                        # Core business logic (shared)
│   ├── gmail.ts                # Gmail API (read, send, watch)
│   ├── integrations.ts         # Connector token management
│   ├── email-pipeline.ts       # Classification + draft generation
│   ├── faq-engine.ts           # FAQ generation, clustering, lifecycle
│   ├── anonymizer.ts           # FERPA anonymization pipeline
│   ├── embeddings.ts           # OpenAI embedding generation + search
│   ├── classifier.ts           # Email classification + confidence scoring
│   ├── chatbot.ts              # Student chatbot (grounded in FAQ + materials)
│   ├── db.ts                   # PostgreSQL connection + queries
│   └── auth.ts                 # Magic link + JWT session helpers
├── workers/                    # BullMQ job processors
│   ├── email-processor.ts      # Process incoming emails
│   ├── faq-generator.ts        # Weekly FAQ regeneration
│   ├── feedback-processor.ts   # Analyze reply signals
│   ├── gmail-watcher.ts        # Renew Pub/Sub watches
│   └── notification-sender.ts  # Professor digests, student invites
├── db/                         # Database
│   ├── schema.sql              # Full schema (PostgreSQL + pgvector)
│   └── migrations/             # Incremental migrations
├── docs/                       # Documentation
│   └── ARCHITECTURE.md         # Detailed architecture notes
├── docker-compose.yml          # Local dev: app + postgres + redis
├── CLAUDE.md                   # This file
└── TASKS.md                    # Implementation task tracker
```

## Development Commands

```bash
# Setup
npm install                     # Install dependencies
docker compose up -d            # Start PostgreSQL + Redis
npm run db:migrate              # Run database migrations
cp .env.example .env            # Set up environment variables

# Development
npm run dev                     # Start Next.js dev server (port 3000)
npm run workers                 # Start BullMQ workers
npm run dev:all                 # Start everything (app + workers)

# Database
npm run db:migrate              # Run pending migrations
npm run db:seed                 # Seed test data
npm run db:reset                # Drop + recreate + migrate + seed

# Testing
npm run test                    # Run test suite
npm run test:watch              # Watch mode
npm run lint                    # ESLint

# Production
npm run build                   # Next.js production build
npm run start                   # Start production server
```

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://courseflow:password@localhost:5432/courseflow

# Redis
REDIS_URL=redis://localhost:6379

# Google OAuth (for Gmail connector, NOT for login)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_PUBSUB_TOPIC=projects/courseflow-ai/topics/gmail-notifications

# Transactional Email (for magic links, invites, digests)
# Use Resend, Postmark, or SES
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASSWORD=your-api-key
EMAIL_FROM=noreply@courseflow.ai

# Anthropic (LLM)
ANTHROPIC_API_KEY=your-anthropic-key

# OpenAI (Embeddings only)
OPENAI_API_KEY=your-openai-key

# Auth
JWT_SECRET=generate-with-openssl-rand-base64-32
MAGIC_LINK_EXPIRY=900              # 15 minutes in seconds
SESSION_EXPIRY=2592000             # 30 days in seconds

# App
APP_URL=http://localhost:3000
NODE_ENV=development
```

## Google Cloud Setup

1. Create project at console.cloud.google.com ("CourseFlow AI")
2. Enable APIs: Gmail API
3. Create OAuth 2.0 credentials (Web application type)
4. Set authorized redirect URI: `{APP_URL}/api/integrations/gmail/callback`
5. Required scopes (Gmail connector only, NOT for login):
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.compose`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
6. Set up Pub/Sub:
   - Create topic: `gmail-notifications`
   - Create push subscription → `{APP_URL}/api/gmail/webhook`
   - Grant Gmail service account publish access

## Core Concepts

### Magic Link Authentication

Login is completely decoupled from Gmail:
- Professor/student enters email → receives magic link → clicks to sign in
- No passwords, no OAuth consent screens on first visit
- JWT session stored in httpOnly cookie (30-day expiry)
- First-time users are auto-created on magic link verification

### Connectors (Integrations)

Gmail is a toggleable connector, not a login requirement:
- Professors can use the entire app before connecting Gmail
- Settings → Integrations page shows available connectors
- Gmail connector: Connect → OAuth flow → toggle monitoring on/off
- Tokens stored encrypted in `integrations` table
- Future connectors: Google Calendar, Canvas LMS, Outlook

### Plus-Addressing

CourseFlow uses Gmail's native plus-addressing as a zero-config routing mechanism:
- `prof@uni.edu` is the professor's real email
- `prof+cs101@uni.edu` routes to the same inbox but CourseFlow detects the `+cs101` tag
- Each course gets a unique plus-address computed from `{email_local}+{course_code}@{domain}`

### Email Processing Pipeline

1. Gmail Pub/Sub notification → webhook
2. Fetch new messages via `history.list`
3. Match to course via plus-address
4. Match sender to student roster
5. Classify (category + confidence)
6. Generate embedding + search FAQ/materials
7. Generate draft response
8. Route: auto-reply (high confidence) OR professor queue (low confidence / personal)

### Student Authentication

Students have two entry paths:
1. **Invite link** — Professor sends invite, URL contains signed JWT, student clicks and is auto-authenticated
2. **Return visits** — Student enters email on login page, gets magic link (same flow as professors)

No Google OAuth required for students. Enrollment verified via roster matching.

### FAQ Lifecycle

- **Bootstrap:** Auto-generated from syllabus upload (seed entries)
- **Reactive:** Proposed from novel student questions after professor responds
- **Batch:** Weekly clustering of recent questions for new candidates
- States: `candidate` → `approved` → `retired` (or `rejected`)

### FERPA Compliance

- Emails classified as "personal" never enter FAQ pipeline
- Anonymization: NER removal → circumstance stripping → date generalization → LLM rewrite
- Student data encrypted at rest
- Email bodies deleted after course end + 1 semester

## Database

PostgreSQL 16 with pgvector extension. Key tables:

- `users` — id, name, email, email_verified, role (professor/student), created_at
- `magic_links` — id, user_id, token_hash, expires_at, used_at
- `integrations` — id, user_id, provider, status, encrypted tokens, provider_metadata (JSONB)
- `courses` — course config, plus-address, settings (references users.id for professor)
- `course_materials` + `material_chunks` — uploaded docs + vector embeddings
- `students` + `enrollments` — roster management
- `emails` — incoming emails + classification + status
- `auto_responses` — generated drafts + approval status
- `faq_entries` — FAQ lifecycle (candidate → approved → retired)
- `feedback_signals` — reply analysis for confidence tuning
- `chat_messages` — student chatbot history

See `db/schema.sql` for the full schema.

## Key Design Decisions

1. **Magic link auth, Gmail as connector.** Login and integrations are decoupled. Professors get value before connecting Gmail.
2. **Web app first, messaging later.** Professors need dashboards; students need FAQ pages. Telegram/WhatsApp deferred.
3. **Professor's own Gmail.** No custom email infrastructure. Plus-addressing is zero-config.
4. **Replies come FROM the professor.** Auto-replies use Gmail API with the professor's OAuth token, so students see a reply from their professor's email.
5. **Mandatory disclaimer on auto-replies.** Professors can edit but not remove the AI disclaimer.
6. **Auto-reply off by default.** Professors start with draft-only mode to build trust.
7. **BullMQ for async processing.** Webhook returns 200 immediately; actual processing happens in workers.
8. **pgvector for semantic search.** FAQ matching and material retrieval use cosine similarity on OpenAI embeddings.

## Important Constraints

- Gmail Pub/Sub watches expire after 7 days → renew via cron every 6 days (only for active integrations)
- Some universities may have disabled plus-addressing → fallback to subject-line `[COURSECODE]` parsing
- LLM calls are ~2-5 seconds each → queue them, don't block webhook responses
- Student chatbot must ONLY answer from approved FAQ + course materials, never fabricate
- Personal/complaint emails always route to professor, never auto-reply
- If Gmail connector is paused/disconnected, email features are dormant but app still works (FAQ, chatbot, materials)
