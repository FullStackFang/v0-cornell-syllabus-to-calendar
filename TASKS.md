# TASKS.md

> Implementation task tracker for CourseFlow AI.
> Organized by phase. Check off tasks as completed.
> Each task includes context so Claude Code can pick up any task independently.

---

## Important: Database Migrations

**Supabase does not auto-sync from `db/schema.sql`.** When any task adds or modifies database tables:

1. The SQL is added to `db/schema.sql` as a reference
2. **You must manually run the SQL in Supabase SQL Editor**
3. Claude Code should explicitly tell you when SQL needs to be run and provide the exact queries

If Claude Code updates `db/schema.sql` without telling you to run SQL in Supabase, ask for the specific queries to execute.

---

## Architectural Note

> **This task list reflects a major architectural shift from the original design.**
>
> **Original approach:** Google OAuth for login (professors sign in with Google, granting Gmail access immediately).
>
> **New approach:** Magic link authentication + Gmail as a toggleable connector.
>
> Key changes:
> - **Login is decoupled from Gmail.** Users sign in via magic link (email-based, no OAuth wall).
> - **Gmail is a connector, not a requirement.** Professors can use the app (courses, FAQ, materials, roster) before ever connecting Gmail.
> - **Database schema updated:** `users` + `integrations` tables replace the old `professors` table that stored OAuth tokens directly.
> - **Students never need Google OAuth.** They use signed invite URLs or magic links.
>
> This design reduces friction (no scary OAuth consent screen on first visit) and lets professors get value immediately.
>
> See `CLAUDE.md` and `docs/ARCHITECTURE.md` for full details.

---

## Phase 1: Core Pipeline (Weeks 1-4)

**Goal:** Professor can sign up, create a course, upload syllabus, connect Gmail as a connector, and see incoming emails classified.

### 1.1 Project Scaffolding

- [ ] **Initialize Next.js project** with TypeScript, App Router, Tailwind CSS
- [ ] **Set up Docker Compose** — PostgreSQL 16 (with pgvector), Redis 7, app service
- [ ] **Create `.env.example`** with all required environment variables (see CLAUDE.md)
- [ ] **Set up ESLint + Prettier** config for consistent code style
- [ ] **Create directory structure** per CLAUDE.md target (app/, lib/, workers/, db/, docs/)
- [ ] **Install core dependencies:**
  - `googleapis` (Gmail API)
  - `@anthropic-ai/sdk` (Claude API)
  - `openai` (embeddings)
  - `bullmq` + `ioredis` (job queue)
  - `pg` + `pgvector` (database)
  - `nodemailer` (sending magic link emails)
  - `jsonwebtoken` (JWT session tokens + signed invite URLs)
  - `pdf-parse`, `mammoth` (file parsing)

### 1.2 Database

> **Note:** After updating `db/schema.sql`, you must run the SQL in **Supabase SQL Editor** manually.

- [ ] **Write `db/schema.sql`** — full schema with auth decoupled from Gmail:
  - `users` table — id, name, email, email_verified, role (professor/student), password_hash (nullable, for future), created_at, last_login_at
  - `magic_links` table — id, user_id, token_hash, expires_at, used_at
  - `sessions` table — id, user_id, token_hash, expires_at, created_at (or use JWT-only, no table)
  - `integrations` table — id, user_id, provider (gmail, google_calendar, canvas, etc.), status (connected/disconnected/paused), access_token (encrypted), refresh_token (encrypted), token_expiry, provider_metadata (JSONB — history_id, watch_expiry, etc.), connected_at, disconnected_at
  - `courses` — **unique per (professor_id, course_code, semester)**. Different professors can teach same course; same professor can teach same course in different semesters. plus_address computed from user email + course_code.
  - Remaining tables unchanged: course_materials, material_chunks, students, enrollments, emails, auto_responses, faq_entries, feedback_signals, chat_messages
- [ ] **Create migration runner** — simple script that applies `.sql` files in order
- [ ] **Create `lib/db.ts`** — PostgreSQL connection pool, typed query helpers
- [ ] **Add pgvector extension setup** to migration (CREATE EXTENSION IF NOT EXISTS vector)
- [ ] **Add seed script** (`db/seed.sql`) — test professor, test course, sample students
- [ ] **Verify HNSW indexes** work correctly for embedding search

### 1.3 Authentication (Magic Link — No OAuth for Login)

> **Key decision:** Login is completely decoupled from Gmail. Professors and students
> sign in via magic link (email a one-click login URL). Gmail access is a separate
> connector toggled on later from the Integrations page. This eliminates the heavy
> OAuth consent screen + 2FA wall on first visit.

- [ ] **Magic link flow for professors:**
  - `POST /api/auth/magic-link` — accept email, generate token, send login email
    - Generate cryptographically random token, hash it, store in `magic_links` table
    - Token expires in 15 minutes
    - Send email via `nodemailer` (use a transactional email service: Resend, Postmark, or SES)
    - Email contains: "Click here to sign in to CourseFlow" with `{APP_URL}/api/auth/verify?token={token}`
    - Rate limit: max 5 magic link requests per email per hour
  - `GET /api/auth/verify?token={token}` — verify magic link
    - Look up token hash in `magic_links`, check not expired, not already used
    - Mark token as used
    - Upsert user in `users` table (create on first login, set email_verified = true)
    - Parse `email_local_part` and `email_domain` from email (needed later for plus-address computation)
    - Issue JWT session token (httpOnly cookie, 30-day expiry)
    - Redirect to `/dashboard` (professor) or `/courses` (student)
  - First-time professors: auto-assign role = 'professor' (MVP: anyone who signs up is a professor; role gating comes later)
- [ ] **Session management:**
  - JWT in httpOnly secure cookie
  - `lib/auth.ts`: middleware to verify JWT on protected routes
  - Include user_id, email, role in JWT payload
  - Auto-refresh: issue new JWT on each request if >50% through expiry
- [ ] **`GET /api/auth/me`** — return current user info
- [ ] **`POST /api/auth/logout`** — clear session cookie
- [ ] **Login page UI:**
  - Clean single-field form: "Enter your email to sign in"
  - Submit → "Check your email for a login link"
  - No password, no Google button, no 2FA wall
  - Branding: CourseFlow logo, minimal design

### 1.4 Integrations / Connectors System

> **Key decision:** Gmail (and future integrations) are toggleable connectors, inspired
> by Claude.ai's Connectors Directory and OpenClaw's skill toggles. Login and integrations
> are fully decoupled. Professors can use the entire app (create courses, upload materials,
> manage roster) before ever connecting Gmail.

- [ ] **`integrations` table** (defined in 1.2 schema):
  - Tracks per-user, per-provider connection state
  - Status enum: `connected`, `disconnected`, `paused`
  - Stores encrypted OAuth tokens + provider-specific metadata as JSONB
  - `provider_metadata` for Gmail: `{ history_id, watch_expiry, watch_active }`
- [ ] **`GET /api/integrations`** — list all integrations for current user
  - Returns available providers (hardcoded for MVP: just Gmail) with connection status
  - For each: provider name, description, icon, status, connected_at
- [ ] **`POST /api/integrations/gmail/connect`** — initiate Gmail OAuth
  - Redirect to Google consent screen requesting ONLY Gmail scopes:
    - `https://www.googleapis.com/auth/gmail.readonly`
    - `https://www.googleapis.com/auth/gmail.compose`
    - `https://www.googleapis.com/auth/gmail.send`
    - `https://www.googleapis.com/auth/gmail.modify`
  - Use `login_hint` parameter with professor's email (skip account picker since we know their email from magic link sign-up)
  - Callback: `GET /api/integrations/gmail/callback`
- [ ] **`GET /api/integrations/gmail/callback`** — handle OAuth code exchange
  - Exchange code for access + refresh tokens
  - Verify the authenticated Gmail address matches the user's CourseFlow email
    - If mismatch: show error "Please connect the Gmail account matching {user_email}"
  - Encrypt tokens, store in `integrations` table
  - Set status = 'connected'
  - Call `gmail.users.watch()` to start Pub/Sub monitoring
  - Store `history_id` and `watch_expiry` in `provider_metadata`
  - Redirect back to Integrations page with success toast
- [ ] **`POST /api/integrations/gmail/toggle`** — pause/resume Gmail monitoring
  - Body: `{ active: boolean }`
  - **Toggle ON:** call `gmail.users.watch()`, set `watch_active = true` in metadata
  - **Toggle OFF:** let watch expire naturally (or call `gmail.users.stop()`), set `watch_active = false`
  - Tokens stay saved — no re-auth needed to toggle back on
  - Courses keep working (students can still browse FAQ, use chatbot), just no new email processing
- [ ] **`POST /api/integrations/gmail/disconnect`** — full disconnect (destructive)
  - Require confirmation ("Are you sure? This will stop all email monitoring.")
  - Revoke OAuth tokens via Google API
  - Delete tokens from `integrations` table
  - Set status = 'disconnected'
  - Stop all active Pub/Sub watches
  - Courses remain intact but email features become dormant
- [ ] **Token refresh logic in `lib/integrations.ts`:**
  - Before any Gmail API call: check if access token is expired
  - If expired: use refresh token to get new access token
  - If refresh fails: set integration status = 'disconnected', notify professor
- [ ] **Integrations page UI:**
  - Card-based grid (like Claude.ai Connectors Directory)
  - Gmail card:
    - Gmail icon + "Gmail" title
    - Description: "Monitor your inbox for student emails and send replies"
    - Status indicator: green dot (Connected), yellow dot (Paused), gray dot (Not connected)
    - **Not connected:** "Connect" button → starts OAuth flow
    - **Connected:** toggle switch (on/off for active monitoring) + "Disconnect" link (with confirmation modal)
    - Shows connected email address when connected
  - Future connector placeholders (grayed out, "Coming soon"):
    - Google Calendar — "Sync office hours and key dates"
    - Canvas LMS — "Import roster and assignments"
    - Outlook — "For universities on Microsoft 365"

### 1.5 Course Management ✅ COMPLETED

> **Manual step required:** Run the `courses` table SQL in Supabase SQL Editor (see `db/schema.sql`).

- [x] **`courses` table schema** — added to `db/schema.sql` with RLS policies
- [x] **`POST /api/courses`** — create course
  - Input: name, course_code, semester
  - Compute plus_address: `{email_local}+{course_code}@{domain}` (from user record)
  - Validate course_code uniqueness per professor
  - Return course with plus_address for professor to share
- [x] **`GET /api/courses`** — list professor's courses
- [x] **`GET /api/courses/:id`** — get course details
- [x] **`PATCH /api/courses/:id`** — update settings (name, semester, course_code, settings)
- [x] **`DELETE /api/courses/:id`** — soft archive (set status = 'archived')
- [x] **Course management UI** (`/courses` page)
  - Create course dialog with form validation
  - Course cards with plus-address copy button
  - Archive confirmation dialog
  - Navigation from user dropdown menu
  - Show plus-address prominently with copy button
  - If Gmail not connected: contextual nudge to connect (not blocking)

### 1.6 Material Upload + Processing

- [ ] **`POST /api/courses/:id/materials`** — upload endpoint
  - Accept: PDF, DOCX, plain text (paste)
  - Extract text: `pdf-parse` for PDF, `mammoth` for DOCX
  - Store in `course_materials` table
  - Save file to disk (MVP) at configurable path
- [ ] **Chunking in `lib/embeddings.ts`:**
  - Split extracted text into ~500 token chunks with 50 token overlap
  - Store chunks in `material_chunks` table
- [ ] **Embedding generation:**
  - Call OpenAI `text-embedding-3-small` for each chunk
  - Store 1536-dim vectors in `material_chunks.embedding`
  - Batch embedding calls (max 20 chunks per request)
- [ ] **`GET /api/courses/:id/materials`** — list uploaded materials
- [ ] **`DELETE /api/courses/:id/materials/:mid`** — remove material + its chunks
- [ ] **Material upload UI** — drag-and-drop, progress indicator, material list

### 1.7 Student Roster

- [ ] **`POST /api/courses/:id/students`** — add students
  - Accept: single student (name, email) OR CSV upload
  - CSV parsing: expect columns `name, email` (flexible column detection)
  - Upsert into `students` table (email is unique key)
  - Create `enrollments` records linking to course
  - Compute `email_hash` (SHA-256) for fast sender matching
- [ ] **`GET /api/courses/:id/students`** — list enrolled students
- [ ] **`DELETE /api/courses/:id/students/:sid`** — remove enrollment
- [ ] **Student roster UI** — CSV upload, manual add form, student list table

### 1.8 Gmail Email Processing (Requires Gmail Connector Active)

> This section only fires when the Gmail integration is connected AND the toggle is ON.
> All Gmail API calls go through `lib/integrations.ts` which handles token lookup,
> refresh, and graceful failure if disconnected.

- [ ] **Gmail Pub/Sub watch setup (`lib/gmail.ts`):**
  - Triggered when Gmail connector is toggled ON (not at login)
  - Call `gmail.users.watch()` using tokens from `integrations` table
  - Store `history_id` and `watch_expiry` in integration's `provider_metadata`
  - Cron job to renew watches every 6 days — but only for integrations where `watch_active = true`
- [ ] **Webhook handler (`POST /api/gmail/webhook`):**
  - Receive Pub/Sub push notification `{ emailAddress, historyId }`
  - Look up user by email → look up their Gmail integration → check status is `connected` and `watch_active`
  - If integration paused/disconnected: acknowledge webhook (200) but skip processing
  - Otherwise: return 200 immediately, enqueue `email-processing` job in BullMQ
- [ ] **Message fetching:**
  - Get OAuth tokens from `integrations` table (auto-refresh if expired)
  - Call `gmail.users.history.list()` to get messages since last `historyId`
  - For each new message: `gmail.users.messages.get()` for full content
  - Parse headers (To, Cc, Delivered-To, Subject, From, Date)
  - Extract plain text body (handle multipart MIME)
  - Update `history_id` in integration's `provider_metadata`
- [ ] **Plus-address detection (`lib/gmail.ts`):**
  - Check To/Cc/Delivered-To headers against course plus-addresses
  - Fallback: check subject for `[COURSECODE]` pattern
  - Return matched course or null

### 1.9 Email Classification

- [ ] **Classification prompt in `lib/classifier.ts`:**
  - Categories: policy, content, logistics, personal, admin, complaint, feedback
  - Output: category, confidence_score (0-1), priority (critical/high/normal/low)
  - Use Claude Sonnet 4.5
  - Include course context (course name, syllabus summary) in prompt
- [ ] **Embedding generation for emails:**
  - Embed email body using OpenAI text-embedding-3-small
  - Store in `emails.embedding`
- [ ] **Email record creation:**
  - Match sender to student roster via email_hash
  - Store full email in `emails` table (encrypted body)
  - Set initial status: 'pending' → 'classified' after classification
- [ ] **Email list UI:**
  - Professor sees classified emails with category, confidence, priority badges
  - Filterable by status, classification, date range
  - Color-coded priority indicators
  - **If Gmail not connected:** show empty state with "Connect Gmail to start processing student emails" CTA

### 1.10 Job Queue Setup

- [ ] **BullMQ configuration:**
  - Redis connection via `REDIS_URL`
  - Define queues: `email-processing`, `faq-generation`, `feedback-processing`, `notifications`, `gmail-watch-renewal`, `invite-emails`
  - Worker concurrency: 5 for email processing, 1 for FAQ generation
- [ ] **Email processing worker (`workers/email-processor.ts`):**
  - Dequeue job → fetch Gmail message (via integration tokens) → detect course → classify → store
  - Retry logic: 3 retries with exponential backoff
  - Error handling: log failures, don't lose emails
  - If integration tokens expired mid-job: attempt refresh, if fails → mark integration as disconnected, skip job
- [ ] **Worker runner script** — `npm run workers` starts all workers

---

## Phase 2: Intelligence + Responses (Weeks 5-8)

**Goal:** System generates draft responses, professor can approve/send, FAQ auto-generates.

### 2.1 Draft Response Generation

- [ ] **Response generation in `lib/email-pipeline.ts`:**
  - Search FAQ entries for semantic matches (cosine similarity > 0.82)
  - Search material chunks for relevant context (top 5 chunks)
  - Generate draft using Claude with grounding context
  - Include citations: which FAQ/material informed the response
  - Store draft in `auto_responses` table
- [ ] **Confidence scoring:**
  - Composite score: FAQ match strength + material coverage + category certainty + LLM self-reported confidence
  - Store on both `emails.confidence_score` and `auto_responses.confidence_score`

### 2.2 Professor Approval Workflow

- [ ] **`POST /api/courses/:id/emails/:eid/approve`** — approve draft, send as-is
- [ ] **`POST /api/courses/:id/emails/:eid/edit`** — edit draft body, then send
- [ ] **`POST /api/courses/:id/emails/:eid/reply`** — write custom reply, send
- [ ] **`POST /api/courses/:id/emails/:eid/dismiss`** — dismiss without response
- [ ] **`POST /api/courses/:id/emails/bulk-approve`** — approve multiple high-confidence drafts
- [ ] **Approval queue UI:**
  - Priority-sorted list of emails needing action
  - Each item: student pseudonym, classification, confidence, draft preview
  - Action buttons: Approve, Edit & Send, Reply Manually, Dismiss
  - Inline draft editor with course material references

### 2.3 Sending Replies via Gmail

> Requires Gmail connector to be connected AND active. If professor disconnected
> Gmail after drafts were generated, show message: "Reconnect Gmail to send replies."

- [ ] **Reply sending in `lib/gmail.ts`:**
  - Get tokens from `integrations` table (not from a `professors` table anymore)
  - Use `gmail.users.messages.send()` with professor's OAuth token
  - Set `In-Reply-To` and `References` headers for threading
  - Set `threadId` to keep in same Gmail conversation
  - Reply appears FROM professor's email (authentic)
- [ ] **Disclaimer injection:**
  - Append course disclaimer text to every auto-reply
  - Include link to course FAQ page
  - Professor can customize but not remove disclaimer
- [ ] **Graceful degradation:** if Gmail integration is paused/disconnected when professor tries to send:
  - Show clear error: "Gmail is not connected. Go to Settings → Integrations to reconnect."
  - Don't lose the draft — keep it in queue for when connection is restored

### 2.4 Auto-Reply System

- [ ] **Auto-reply routing logic:**
  - Pre-check: is Gmail integration connected AND active? If not, skip auto-reply, store as draft
  - If `auto_reply_enabled` AND confidence >= `confidence_threshold`:
    - Send auto-reply immediately
    - Update email status: `auto_replied`
    - Start feedback monitoring window (48 hours)
  - If personal/complaint category: always queue for professor
  - Otherwise: store draft, queue for professor review
- [ ] **Auto-reply toggle** in course settings UI

### 2.5 FAQ Bootstrap (Syllabus)

- [ ] **Seed FAQ generation in `lib/faq-engine.ts`:**
  - On syllabus upload: prompt Claude to extract 10-15 likely questions + answers
  - Categories: key dates, grading, office hours, materials, policies, communication
  - Create as `candidate` FAQ entries
  - Generate embeddings for each
  - **Note:** This works even without Gmail connected — FAQ generation is driven by materials, not emails
- [ ] **FAQ candidate review UI:**
  - List pending candidates with question + answer preview
  - Actions: Approve, Edit & Approve, Reject

### 2.6 FAQ Reactive Generation

- [ ] **Novel question detection:**
  - After classification, if no FAQ match above 0.82 similarity → flag as novel
  - After professor responds: propose FAQ candidate
  - Anonymize the original question (run through anonymization pipeline)
  - Use professor's response as answer basis
- [ ] **FAQ proposal logic:**
  - Only for policy/content/logistics/admin categories (never personal/complaint)
  - Create candidate with `source_email_ids` reference

### 2.7 Anonymization Pipeline

- [ ] **`lib/anonymizer.ts`:**
  - Stage 1: NER — remove names, emails, student IDs (regex + LLM)
  - Stage 2: Circumstance removal — strip personal details (health, family, etc.)
  - Stage 3: Date generalization — replace specific dates with relative terms
  - Stage 4: LLM rewrite — generalize to third-person canonical question
- [ ] **Test with diverse email samples** — ensure FERPA compliance
- [ ] **Gate: emails classified as 'personal' never enter this pipeline**

### 2.8 FAQ Approval Workflow

- [ ] **`POST /api/courses/:id/faq/:fid/approve`** — approve candidate
- [ ] **`POST /api/courses/:id/faq/:fid/edit`** — edit question/answer, then approve
- [ ] **`POST /api/courses/:id/faq/:fid/reject`** — reject with optional reason
- [ ] **`POST /api/courses/:id/faq/:fid/retire`** — retire active entry
- [ ] **FAQ management UI:**
  - Tabs: Candidates, Active, Retired
  - Each entry: question, answer, match count, feedback score, category
  - Inline editing

### 2.9 Feedback Detection

- [ ] **Feedback signal detection in `workers/feedback-processor.ts`:**
  - Monitor replies to auto-responses within 48-hour window
  - Detect signals: `thanks` (positive), `disagreement` (negative), `followup_same_topic`, `no_reply` (neutral/positive after 48h), `professor_override`
  - Use Claude to classify reply sentiment
  - Store in `feedback_signals` table
  - Update FAQ entry confidence: positive → boost, negative → reduce
- [ ] **Negative feedback routing:**
  - If student replies negatively to auto-response → queue original + reply for professor

### 2.10 Professor Dashboard

- [ ] **Inbox summary bar** — counts: pending, auto-replied, drafts ready, resolved this week
  - If Gmail not connected: show "Connect Gmail to see your inbox" banner instead of empty counts
- [ ] **Needs-attention queue** — priority-sorted, color-coded, with action buttons
- [ ] **FAQ management tab** — candidates + active entries
- [ ] **Basic analytics** — email volume, classification distribution, auto-reply rate
- [ ] **Settings tab** — auto-reply toggle, confidence slider, disclaimer editor, notification prefs
  - Link to Integrations page from settings

---

## Phase 3: Student Experience (Weeks 9-12)

**Goal:** Students can log in, see FAQ, use chatbot, check email status.

### 3.1 Student Authentication (Magic Link + Signed Invite URLs)

> **Key decision:** Students never need Google OAuth. Two entry paths:
> 1. **Invite link** — professor sends invite, URL contains signed token, student clicks and is auto-authenticated
> 2. **Return visits** — student enters email on login page, gets magic link (same flow as professors)

- [ ] **Signed invite URL generation:**
  - When professor invites students, generate per-student signed URL:
    `{APP_URL}/invite/{courseId}?token={JWT_signed_with_student_email_and_course_id}`
  - JWT contains: student_email, course_id, expires_in (7 days)
  - Student clicks link → backend verifies JWT signature → upserts user with role 'student' → creates session → redirect to course page
  - No email/password/OAuth needed on first visit
- [ ] **Student magic link (return visits):**
  - Same `POST /api/auth/magic-link` endpoint as professors
  - Student enters their roster email → gets magic link → signs in
  - Session shows all courses they're enrolled in
- [ ] **Enrollment verification middleware:**
  - Student API routes check that the authenticated user is enrolled in the requested course
  - If not enrolled: 403 with "You're not enrolled in this course"
- [ ] **Student session** — JWT with role = 'student', knows enrolled courses

### 3.2 Student Invite Flow

- [ ] **`POST /api/courses/:id/students/invite`** — send invite emails
  - Generate signed invite URL per student (see 3.1)
  - Send via transactional email service (same as magic links — NOT via professor's Gmail)
  - Email content: "Prof. X is using CourseFlow for [COURSE]. Click here to access your course FAQ and ask questions."
  - Track `invited_at` and `invite_accepted` on enrollment
- [ ] **Bulk invite** — invite all un-invited students at once
- [ ] **Invite landing page:**
  - Verify signed token → auto-authenticate → show course FAQ page
  - If token expired: "This invite link has expired. Enter your email to get a new login link."

### 3.3 FAQ Browser

- [ ] **`GET /api/student/courses/:id/faq`** — list approved FAQ entries
- [ ] **`GET /api/student/courses/:id/faq/search`** — semantic search
  - Embed query, cosine similarity against FAQ embeddings
  - Return top 5 matches with relevance scores
- [ ] **FAQ page UI:**
  - Category tabs/filters
  - Search bar with instant results
  - Clean card layout: question, answer, category, last updated
  - **Works regardless of Gmail integration status** — FAQ is generated from materials + past emails

### 3.4 Student Chatbot

- [ ] **`POST /api/student/courses/:id/chat`** — send message
- [ ] **`GET /api/student/courses/:id/chat`** — chat history
- [ ] **Chatbot logic in `lib/chatbot.ts`:**
  1. Search FAQ (cosine similarity, top 3)
  2. If top match > 0.85 → return FAQ answer directly
  3. If no FAQ match → search material chunks (top 5)
  4. If chunks have answer → generate response from chunks + disclaimer
  5. If nothing → "I don't have info on that. Email your professor at {plus_address}."
- [ ] **Guardrails:**
  - Never fabricate (only answer from FAQ + materials)
  - Never reveal other students' info or email content
  - Always offer escalation to professor
  - Rate limit: 50 messages/student/day/course
- [ ] **Chat UI** — clean conversation interface, typing indicator, FAQ references

### 3.5 Email Status Page

- [ ] **`GET /api/student/courses/:id/emails`** — student's own email statuses
- [ ] **Status page UI:**
  - List of emails student has sent to course address
  - Status badges: Pending, In Queue, Responded
  - Informational only (actual responses go to email)
  - **If Gmail not connected by professor:** show message "Email tracking is not yet active for this course"

### 3.6 Professor Analytics

- [ ] **`GET /api/courses/:id/analytics`** — dashboard data
  - Top topics (category breakdown)
  - Auto-reply success rate
  - Average response time
  - FAQ coverage percentage
  - New FAQ candidates count
- [ ] **`GET /api/courses/:id/analytics/trends`** — time-series data
- [ ] **Charts UI:**
  - Email volume over time (bar chart by day)
  - Classification distribution (pie chart)
  - Auto-reply success trend (line chart)
  - Top question clusters

### 3.7 Cron Jobs

- [ ] **Weekly FAQ regeneration** (`workers/faq-generator.ts`):
  - Re-cluster questions from past week
  - Identify patterns (3+ similar unmatched questions)
  - Propose new candidates
  - Flag low-confidence entries
  - Retire unmatched entries (30+ days)
- [ ] **Daily professor digest** (`workers/notification-sender.ts`):
  - Summary: emails received, auto-replied, needing attention
  - Top new questions
  - FAQ candidate suggestions
  - Sent via transactional email (not Gmail integration)
- [ ] **Gmail watch renewal** every 6 days — only for integrations where `watch_active = true`
- [ ] **Feedback processing** — batch process unprocessed signals

---

## Phase 4: Polish + Beta (Weeks 13-16)

**Goal:** 3-5 professors piloting with real courses.

### 4.1 Security

- [ ] **Prompt injection defenses** — sanitize email content before LLM calls
- [ ] **Input validation** — all API endpoints, file uploads, CSV parsing
- [ ] **SQL injection prevention** — parameterized queries everywhere
- [ ] **CSRF protection** on state-changing endpoints
- [ ] **Rate limiting:**
  - API: 100 req/min per user
  - Magic links: 5 per email per hour
  - Chatbot: 50 messages/day per student per course
  - LLM calls: 5 concurrent max via BullMQ
- [ ] **Token encryption** — Gmail OAuth tokens encrypted at rest in `integrations` table
- [ ] **Magic link security** — tokens are single-use, hashed in DB (never stored plaintext), short-lived (15 min)
- [ ] **Signed invite URL security** — JWTs signed with app secret, short expiry (7 days), include course_id to prevent cross-course use
- [ ] **FERPA audit** — verify no PII leaks in FAQ, chatbot, or logs

### 4.2 Error Handling + Resilience

- [ ] **Graceful Gmail API failures** — retry with backoff, don't lose messages
- [ ] **Gmail integration state transitions:**
  - If token refresh fails: auto-set integration to `disconnected`, notify professor via transactional email
  - If Pub/Sub watch renewal fails: retry 3x, then pause integration and notify
  - If professor revokes access in Google Account settings: detect on next API call, set to `disconnected`
- [ ] **LLM API failures** — retry 3x, fall back to "manual review needed"
- [ ] **Webhook idempotency** — handle duplicate Pub/Sub notifications
- [ ] **Database connection recovery** — pool reconnection logic
- [ ] **User-facing error messages** — friendly, actionable

### 4.3 Monitoring

- [ ] **Health check endpoint** — `GET /api/health` (DB, Redis, transactional email, Gmail Pub/Sub)
- [ ] **Integration health dashboard** — admin view of all connected integrations and their status
- [ ] **Error tracking** — Sentry or similar
- [ ] **Uptime monitoring** — external ping service
- [ ] **Queue depth monitoring** — alert if email backlog > 100
- [ ] **Log structured JSON** — searchable, filterable

### 4.4 UI Polish

- [ ] **Mobile responsiveness** — student UI must work on phones
- [ ] **Loading states** — skeletons, spinners for async operations
- [ ] **Empty states** — helpful messages when no data yet:
  - Dashboard with no Gmail: "Connect Gmail to start processing emails" card
  - Email list with no emails: "No emails yet. Share your course address with students."
  - FAQ with no entries: "Upload a syllabus to auto-generate FAQ entries"
- [ ] **Bulk operations** — bulk approve drafts, bulk invite students
- [ ] **Settings UI** — all professor-configurable options, with Integrations as a prominent tab
- [ ] **Onboarding flow** — guided setup, Gmail is optional not blocking:
  1. Sign up (magic link) → land on dashboard
  2. Create course → get plus-address
  3. Upload syllabus → auto-generate FAQ candidates
  4. Add student roster
  5. **Optional:** Connect Gmail (nudge, not gate) → start monitoring emails
  - Each step has a checklist indicator on the dashboard
  - Professor can skip Gmail and still get value from FAQ + chatbot + materials

### 4.5 Beta Launch

- [ ] **Deploy to DigitalOcean** — single droplet, Docker Compose, Nginx + SSL
- [ ] **Domain setup** — courseflow.ai (or similar), DNS + Let's Encrypt
- [ ] **Transactional email setup** — configure Resend/Postmark/SES for magic links + invites + digests
- [ ] **Recruit 3-5 beta professors**
- [ ] **Create onboarding docs** — professor quick-start guide
- [ ] **Feedback mechanism** — in-app feedback button, weekly check-in calls
- [ ] **Monitor costs** — track Anthropic + OpenAI + transactional email API usage
- [ ] **Iterate based on feedback** — 2-week sprint cycles during beta

---

## Phase 5: Messaging Channels + Additional Connectors (Post-Launch)

> Deferred. Not needed for beta. The connector architecture makes these straightforward to add.

- [ ] **Google Calendar connector** — sync office hours, key dates to course
- [ ] **Canvas LMS connector** — import roster and assignments
- [ ] **Outlook connector** — for universities on Microsoft 365 (same plus-addressing pattern, different API)
- [ ] Telegram bot integration (student FAQ access)
- [ ] WhatsApp Business API integration
- [ ] Professor mobile notifications via messaging
- [ ] Cross-channel context sync

---

## Future Backlog

> Not scoped. Capture ideas here.

- [ ] Password-based login option (in addition to magic link)
- [ ] SSO/SAML for university-wide deployment
- [ ] Office hours scheduling (Google Calendar connector)
- [ ] LMS integration (Canvas API, Blackboard)
- [ ] Cross-semester FAQ persistence
- [ ] TA role with separate permissions
- [ ] Multi-language support
- [ ] Analytics export (semester-end PDF reports)
- [ ] University-wide admin dashboard
- [ ] Billing / subscription management
