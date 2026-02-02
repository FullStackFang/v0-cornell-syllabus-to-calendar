# CourseFlow AI - Architecture

## System Overview

CourseFlow AI is a hosted web application that helps professors manage course communications. The system monitors a professor's Gmail inbox, classifies student emails, generates AI-powered draft responses, and maintains a living FAQ.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SYSTEM ARCHITECTURE                                │
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────────┐ │
│  │   Student    │     │  Professor   │     │        CourseFlow AI         │ │
│  │              │     │              │     │                              │ │
│  │  Sends email │     │  Dashboard   │     │  ┌────────────────────────┐  │ │
│  │  to prof+cs  │     │  - Review    │     │  │     Next.js App        │  │ │
│  │  @uni.edu    │     │  - Approve   │     │  │                        │  │ │
│  │              │     │  - FAQ mgmt  │     │  │  /dashboard            │  │ │
│  │  Browses FAQ │     │              │     │  │  /api/*                │  │ │
│  │  Uses chatbot│     │              │     │  │  /faq (student)        │  │ │
│  └──────┬───────┘     └──────┬───────┘     │  └───────────┬────────────┘  │ │
│         │                    │             │              │               │ │
│         │                    │             │              ▼               │ │
│         │                    │             │  ┌────────────────────────┐  │ │
│         │                    └─────────────┼──►     PostgreSQL        │  │ │
│         │                                  │  │     + pgvector        │  │ │
│         │                                  │  │                        │  │ │
│         │                                  │  │  users, courses,       │  │ │
│         │                                  │  │  emails, faq_entries,  │  │ │
│         │                                  │  │  integrations, etc.    │  │ │
│         │                                  │  └────────────────────────┘  │ │
│         │                                  │              │               │ │
│         │                                  │              ▼               │ │
│         │                                  │  ┌────────────────────────┐  │ │
│         │                                  │  │   BullMQ Workers       │  │ │
│         │                                  │  │                        │  │ │
│         │                                  │  │  - email-processor     │  │ │
│         │                                  │  │  - faq-generator       │  │ │
│         │                                  │  │  - gmail-watcher       │  │ │
│         │                                  │  └───────────┬────────────┘  │ │
│         │                                  │              │               │ │
│         │                                  └──────────────┼───────────────┘ │
│         │                                                 │                 │
│         │         ┌───────────────────────────────────────┘                 │
│         │         │                                                         │
│         │         ▼                                                         │
│  ┌──────┴─────────────────────────────────────────────────────────────────┐ │
│  │                         External Services                               │ │
│  │                                                                         │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │ │
│  │  │   Gmail     │  │  Anthropic  │  │   OpenAI    │  │   Resend    │   │ │
│  │  │   API       │  │  Claude API │  │ Embeddings  │  │  (email)    │   │ │
│  │  │             │  │             │  │             │  │             │   │ │
│  │  │ Read/Send   │  │ Classify    │  │ Semantic    │  │ Magic links │   │ │
│  │  │ Pub/Sub     │  │ Generate    │  │ search      │  │ Invites     │   │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Authentication Architecture

### Design Principle: Decoupled Auth

Login and Gmail access are completely separate concerns:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION MODEL                                  │
│                                                                              │
│   TRADITIONAL APPROACH (rejected):                                           │
│   ┌─────────┐    ┌─────────────────┐    ┌─────────────────┐                │
│   │ User    │───►│ Google OAuth    │───►│ App + Gmail     │                │
│   │ arrives │    │ consent screen  │    │ access granted  │                │
│   └─────────┘    │ (scary, 2FA)    │    └─────────────────┘                │
│                  └─────────────────┘                                        │
│   Problem: High friction on first visit, many users bounce                  │
│                                                                              │
│   ─────────────────────────────────────────────────────────────────────────│
│                                                                              │
│   COURSEFLOW APPROACH (implemented):                                         │
│                                                                              │
│   Step 1: Frictionless Login                                                │
│   ┌─────────┐    ┌─────────────────┐    ┌─────────────────┐                │
│   │ User    │───►│ Enter email     │───►│ Click magic     │───► Logged in │
│   │ arrives │    │ (one field)     │    │ link in inbox   │                │
│   └─────────┘    └─────────────────┘    └─────────────────┘                │
│                                                                              │
│   Step 2: Gmail Connector (Optional, Later)                                 │
│   ┌─────────┐    ┌─────────────────┐    ┌─────────────────┐                │
│   │ Settings│───►│ Click "Connect  │───►│ Google OAuth    │───► Connected │
│   │ page    │    │ Gmail"          │    │ (Gmail only)    │                │
│   └─────────┘    └─────────────────┘    └─────────────────┘                │
│                                                                              │
│   Benefits:                                                                  │
│   - Zero friction on first visit (just enter email)                         │
│   - Professor gets immediate value (courses, FAQ, materials)                │
│   - Gmail OAuth only when professor is ready and understands why            │
│   - Students never need Google OAuth at all                                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Magic Link Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MAGIC LINK AUTHENTICATION                            │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      LOGIN FLOW                                      │   │
│   │                                                                      │   │
│   │   User                    CourseFlow                    Email        │   │
│   │    │                          │                           │          │   │
│   │    │  POST /api/auth/magic-link                          │          │   │
│   │    │  { email: "prof@uni.edu" }                          │          │   │
│   │    │─────────────────────────►│                           │          │   │
│   │    │                          │                           │          │   │
│   │    │                          │  Generate random token    │          │   │
│   │    │                          │  Hash token, store in DB  │          │   │
│   │    │                          │  (15 min expiry)          │          │   │
│   │    │                          │                           │          │   │
│   │    │                          │  Send email via Resend    │          │   │
│   │    │                          │──────────────────────────►│          │   │
│   │    │                          │                           │          │   │
│   │    │  200 OK                  │                           │          │   │
│   │    │  "Check your email"      │                           │          │   │
│   │    │◄─────────────────────────│                           │          │   │
│   │    │                          │                           │          │   │
│   │    │                          │          Email arrives    │          │   │
│   │    │◄─────────────────────────────────────────────────────│          │   │
│   │    │  "Click to sign in"      │                           │          │   │
│   │    │                          │                           │          │   │
│   │    │  GET /api/auth/verify?token=abc123                   │          │   │
│   │    │─────────────────────────►│                           │          │   │
│   │    │                          │                           │          │   │
│   │    │                          │  Verify token hash        │          │   │
│   │    │                          │  Check not expired        │          │   │
│   │    │                          │  Mark token as used       │          │   │
│   │    │                          │  Upsert user record       │          │   │
│   │    │                          │  Issue JWT cookie         │          │   │
│   │    │                          │                           │          │   │
│   │    │  302 Redirect /dashboard │                           │          │   │
│   │    │  Set-Cookie: session=JWT │                           │          │   │
│   │    │◄─────────────────────────│                           │          │   │
│   │    │                          │                           │          │   │
│   └────┴──────────────────────────┴───────────────────────────┴──────────┘   │
│                                                                              │
│   Security:                                                                  │
│   - Tokens are cryptographically random (32 bytes)                          │
│   - Only hash stored in DB (token never stored plaintext)                   │
│   - Single-use (marked used_at after verification)                          │
│   - Short-lived (15 minutes)                                                │
│   - Rate limited (5 requests/email/hour)                                    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Student Authentication

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      STUDENT AUTHENTICATION                                  │
│                                                                              │
│   PATH 1: Invite Link (First Visit)                                         │
│   ─────────────────────────────────                                         │
│                                                                              │
│   Professor uploads roster → CourseFlow generates signed invite URLs        │
│                                                                              │
│   URL: https://courseflow.ai/invite/cs101?token={JWT}                       │
│                                                                              │
│   JWT payload: { email: "student@uni.edu", course_id: "cs101", exp: 7d }    │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Student clicks invite link                                          │   │
│   │       │                                                              │   │
│   │       ▼                                                              │   │
│   │  Verify JWT signature                                                │   │
│   │       │                                                              │   │
│   │       ▼                                                              │   │
│   │  Upsert user (role: student)                                        │   │
│   │       │                                                              │   │
│   │       ▼                                                              │   │
│   │  Verify enrollment in course                                         │   │
│   │       │                                                              │   │
│   │       ▼                                                              │   │
│   │  Issue session JWT cookie                                            │   │
│   │       │                                                              │   │
│   │       ▼                                                              │   │
│   │  Redirect to /courses/cs101/faq                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   PATH 2: Magic Link (Return Visits)                                        │
│   ──────────────────────────────────                                        │
│                                                                              │
│   Same as professor flow. Student enters email → magic link → signed in.    │
│   App shows all courses the student is enrolled in.                         │
│                                                                              │
│   KEY: No Google OAuth required for students, ever.                         │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Integrations / Connectors

### Design Principle: Toggleable Connectors

Gmail (and future integrations) are optional capabilities, not requirements:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INTEGRATIONS ARCHITECTURE                             │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    Settings → Integrations Page                      │   │
│   │                                                                      │   │
│   │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │   │
│   │   │     Gmail       │  │ Google Calendar │  │    Canvas LMS   │    │   │
│   │   │                 │  │                 │  │                 │    │   │
│   │   │  [● Connected]  │  │  [○ Not connected]│ │  [○ Coming soon]│   │   │
│   │   │                 │  │                 │  │                 │    │   │
│   │   │  Toggle: [ON]   │  │  [Connect]      │  │  [Coming soon]  │    │   │
│   │   │  [Disconnect]   │  │                 │  │                 │    │   │
│   │   └─────────────────┘  └─────────────────┘  └─────────────────┘    │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   Database: integrations table                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  id | user_id | provider | status       | tokens (encrypted) | meta │   │
│   │  ───┼─────────┼──────────┼──────────────┼────────────────────┼──────│   │
│   │  1  │ u_123   │ gmail    │ connected    │ {access, refresh}  │ {...}│   │
│   │  2  │ u_456   │ gmail    │ paused       │ {access, refresh}  │ {...}│   │
│   │  3  │ u_789   │ gmail    │ disconnected │ NULL               │ NULL │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   Status transitions:                                                        │
│   - not connected → connected (OAuth flow completed)                        │
│   - connected ↔ paused (toggle monitoring on/off, tokens preserved)         │
│   - connected/paused → disconnected (tokens revoked and deleted)            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Gmail Connector Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GMAIL CONNECTOR FLOW                                 │
│                                                                              │
│   CONNECT:                                                                   │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                      │   │
│   │  Professor clicks "Connect Gmail"                                    │   │
│   │       │                                                              │   │
│   │       ▼                                                              │   │
│   │  POST /api/integrations/gmail/connect                                │   │
│   │       │                                                              │   │
│   │       ▼                                                              │   │
│   │  Redirect to Google OAuth                                            │   │
│   │  (login_hint = professor's email from magic link signup)             │   │
│   │  Scopes: gmail.readonly, gmail.compose, gmail.send, gmail.modify     │   │
│   │       │                                                              │   │
│   │       ▼                                                              │   │
│   │  Google consent screen                                               │   │
│   │       │                                                              │   │
│   │       ▼                                                              │   │
│   │  GET /api/integrations/gmail/callback?code=...                       │   │
│   │       │                                                              │   │
│   │       ▼                                                              │   │
│   │  Exchange code for tokens                                            │   │
│   │  Verify Gmail address matches CourseFlow email                       │   │
│   │  Encrypt and store tokens                                            │   │
│   │  Call gmail.users.watch() to start Pub/Sub                           │   │
│   │  Store history_id and watch_expiry in metadata                       │   │
│   │       │                                                              │   │
│   │       ▼                                                              │   │
│   │  Redirect to /settings/integrations with success toast               │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   TOGGLE ON/OFF:                                                            │
│   - Toggle ON: call gmail.users.watch(), set watch_active = true            │
│   - Toggle OFF: let watch expire, set watch_active = false                  │
│   - Tokens preserved in both states (no re-auth needed)                     │
│                                                                              │
│   DISCONNECT:                                                                │
│   - Revoke tokens via Google API                                            │
│   - Delete tokens from database                                             │
│   - Set status = disconnected                                               │
│   - Course features remain (FAQ, materials), email features dormant         │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Email Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       EMAIL PROCESSING PIPELINE                              │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                      │   │
│   │  Student sends email to prof+cs101@uni.edu                          │   │
│   │       │                                                              │   │
│   │       ▼                                                              │   │
│   │  Gmail delivers to professor's inbox                                 │   │
│   │       │                                                              │   │
│   │       ▼                                                              │   │
│   │  Gmail Pub/Sub → POST /api/gmail/webhook                             │   │
│   │  { emailAddress, historyId }                                         │   │
│   │       │                                                              │   │
│   │       ▼                                                              │   │
│   │  Webhook handler:                                                    │   │
│   │  - Look up user by email                                             │   │
│   │  - Check integration status = connected AND watch_active = true      │   │
│   │  - If paused/disconnected: return 200, skip processing               │   │
│   │  - Otherwise: return 200, enqueue BullMQ job                         │   │
│   │       │                                                              │   │
│   │       ▼                                                              │   │
│   │  ┌───────────────────────────────────────────────────────────────┐  │   │
│   │  │  BullMQ Worker: email-processor                               │  │   │
│   │  │                                                                │  │   │
│   │  │  1. Get OAuth tokens from integrations table                  │  │   │
│   │  │     (auto-refresh if expired)                                  │  │   │
│   │  │                                                                │  │   │
│   │  │  2. Fetch new messages via gmail.users.history.list()          │  │   │
│   │  │                                                                │  │   │
│   │  │  3. For each message:                                          │  │   │
│   │  │     - Parse headers (To, Cc, From, Subject)                    │  │   │
│   │  │     - Detect plus-address → match to course                   │  │   │
│   │  │     - Match sender to student roster                           │  │   │
│   │  │                                                                │  │   │
│   │  │  4. Classify with Claude:                                      │  │   │
│   │  │     → Category: policy, content, logistics, personal, etc.    │  │   │
│   │  │     → Confidence: 0-1                                          │  │   │
│   │  │     → Priority: critical, high, normal, low                    │  │   │
│   │  │                                                                │  │   │
│   │  │  5. Generate embedding (OpenAI text-embedding-3-small)         │  │   │
│   │  │                                                                │  │   │
│   │  │  6. Search FAQ + materials for context (cosine similarity)     │  │   │
│   │  │                                                                │  │   │
│   │  │  7. Generate draft response with Claude                        │  │   │
│   │  │     (grounded in FAQ + materials)                              │  │   │
│   │  │                                                                │  │   │
│   │  │  8. Route:                                                     │  │   │
│   │  │     IF personal/complaint → always queue for professor        │  │   │
│   │  │     ELIF auto_reply_enabled AND confidence >= threshold       │  │   │
│   │  │       → send auto-reply immediately                           │  │   │
│   │  │     ELSE                                                       │  │   │
│   │  │       → store draft, queue for professor review               │  │   │
│   │  │                                                                │  │   │
│   │  │  9. Update history_id for next poll                            │  │   │
│   │  │                                                                │  │   │
│   │  └───────────────────────────────────────────────────────────────┘  │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE SCHEMA                                     │
│                                                                              │
│   ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐  │
│   │     users       │       │   magic_links   │       │  integrations   │  │
│   │─────────────────│       │─────────────────│       │─────────────────│  │
│   │ id (PK)         │◄──────│ user_id (FK)    │       │ id (PK)         │  │
│   │ email (unique)  │       │ token_hash      │       │ user_id (FK) ───┼──┤
│   │ name            │       │ expires_at      │       │ provider        │  │
│   │ email_verified  │       │ used_at         │       │ status          │  │
│   │ role            │       └─────────────────┘       │ access_token    │  │
│   │ created_at      │                                 │ refresh_token   │  │
│   │ last_login_at   │                                 │ token_expiry    │  │
│   └────────┬────────┘                                 │ provider_meta   │  │
│            │                                          │ connected_at    │  │
│            │                                          └─────────────────┘  │
│            │                                                               │
│            ▼                                                               │
│   ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐  │
│   │    courses      │       │course_materials │       │ material_chunks │  │
│   │─────────────────│       │─────────────────│       │─────────────────│  │
│   │ id (PK)         │◄──────│ course_id (FK)  │◄──────│ material_id (FK)│  │
│   │ professor_id(FK)│       │ filename        │       │ content         │  │
│   │ name            │       │ file_path       │       │ embedding       │  │
│   │ course_code     │       │ extracted_text  │       │ chunk_index     │  │
│   │ plus_address    │       │ created_at      │       └─────────────────┘  │
│   │ auto_reply      │       └─────────────────┘                            │
│   │ threshold       │                                                      │
│   │ disclaimer      │       ┌─────────────────┐       ┌─────────────────┐  │
│   │ settings (JSON) │       │    students     │       │  enrollments    │  │
│   └────────┬────────┘       │─────────────────│       │─────────────────│  │
│            │                │ id (PK)         │◄──────│ student_id (FK) │  │
│            │                │ user_id (FK)    │       │ course_id (FK) ─┼──┤
│            │                │ email           │       │ invited_at      │  │
│            │                │ email_hash      │       │ invite_accepted │  │
│            │                │ name            │       └─────────────────┘  │
│            │                └─────────────────┘                            │
│            │                                                               │
│            ▼                                                               │
│   ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐  │
│   │     emails      │       │ auto_responses  │       │   faq_entries   │  │
│   │─────────────────│       │─────────────────│       │─────────────────│  │
│   │ id (PK)         │◄──────│ email_id (FK)   │       │ id (PK)         │  │
│   │ course_id (FK)  │       │ draft_body      │       │ course_id (FK) ─┼──┤
│   │ student_id (FK) │       │ final_body      │       │ question        │  │
│   │ gmail_msg_id    │       │ confidence      │       │ answer          │  │
│   │ subject         │       │ status          │       │ category        │  │
│   │ body (encrypted)│       │ sent_at         │       │ status          │  │
│   │ category        │       └─────────────────┘       │ embedding       │  │
│   │ confidence      │                                 │ match_count     │  │
│   │ embedding       │       ┌─────────────────┐       │ source_email_ids│  │
│   │ status          │       │feedback_signals │       └─────────────────┘  │
│   │ created_at      │       │─────────────────│                            │
│   └─────────────────┘       │ id (PK)         │       ┌─────────────────┐  │
│                             │ email_id (FK)   │       │ chat_messages   │  │
│                             │ signal_type     │       │─────────────────│  │
│                             │ detected_at     │       │ id (PK)         │  │
│                             └─────────────────┘       │ course_id (FK)  │  │
│                                                       │ student_id (FK) │  │
│                                                       │ role            │  │
│                                                       │ content         │  │
│                                                       │ created_at      │  │
│                                                       └─────────────────┘  │
│                                                                             │
│   Note: All tables use UUID primary keys. Vector columns use pgvector.     │
│   OAuth tokens are encrypted at rest using AES-256-GCM.                    │
│                                                                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## FAQ System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FAQ LIFECYCLE                                     │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                                                                      │   │
│   │   SOURCES OF FAQ ENTRIES:                                            │   │
│   │                                                                      │   │
│   │   1. SYLLABUS BOOTSTRAP                                              │   │
│   │      Professor uploads syllabus                                      │   │
│   │      → Claude extracts 10-15 Q&A pairs                              │   │
│   │      → Created as 'candidate' status                                 │   │
│   │                                                                      │   │
│   │   2. REACTIVE (from emails)                                          │   │
│   │      Student asks novel question                                     │   │
│   │      → No FAQ match above 0.82 similarity                           │   │
│   │      → Professor responds                                            │   │
│   │      → System proposes anonymized FAQ candidate                      │   │
│   │                                                                      │   │
│   │   3. BATCH (weekly job)                                              │   │
│   │      Cluster recent questions                                        │   │
│   │      → Find patterns (3+ similar unmatched questions)                │   │
│   │      → Propose new candidates                                        │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   STATE MACHINE:                                                            │
│                                                                              │
│   ┌───────────┐     approve      ┌───────────┐      retire     ┌─────────┐ │
│   │ candidate │────────────────►│  approved  │───────────────►│ retired │ │
│   └───────────┘                  └───────────┘                 └─────────┘ │
│        │                                                                    │
│        │ reject                                                             │
│        ▼                                                                    │
│   ┌───────────┐                                                            │
│   │ rejected  │                                                            │
│   └───────────┘                                                            │
│                                                                              │
│   MATCHING:                                                                  │
│   - Each FAQ entry has an embedding (1536 dim, OpenAI text-embedding-3)    │
│   - Incoming email is embedded, cosine similarity computed                  │
│   - Match threshold: 0.82 for FAQ, 0.85 for direct chatbot response        │
│   - HNSW index for fast similarity search at scale                         │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Anonymization Pipeline (FERPA Compliance)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ANONYMIZATION PIPELINE                                  │
│                                                                              │
│   Gate: Emails classified as 'personal' NEVER enter this pipeline           │
│                                                                              │
│   INPUT: "Hi Professor, I'm Alice Smith (as1234). I have a family           │
│          emergency on March 15th and can't take the midterm. Can I          │
│          reschedule? My mom is in the hospital."                            │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  STAGE 1: NER Removal                                                │   │
│   │  - Remove names: "Alice Smith" → "[STUDENT]"                        │   │
│   │  - Remove IDs: "as1234" → "[ID]"                                    │   │
│   │  - Remove emails, phone numbers                                      │   │
│   │                                                                      │   │
│   │  → "Hi Professor, I'm [STUDENT] ([ID]). I have a family             │   │
│   │     emergency on March 15th..."                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  STAGE 2: Circumstance Removal                                       │   │
│   │  - Strip personal details: family, health, financial                 │   │
│   │  - "family emergency", "mom is in the hospital" → removed           │   │
│   │                                                                      │   │
│   │  → "I can't take the midterm on March 15th. Can I reschedule?"      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  STAGE 3: Date Generalization                                        │   │
│   │  - Specific dates → relative terms                                  │   │
│   │  - "March 15th" → "the scheduled exam date"                         │   │
│   │                                                                      │   │
│   │  → "I can't take the midterm on the scheduled date. Can I           │   │
│   │     reschedule?"                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  STAGE 4: LLM Rewrite                                                │   │
│   │  - Generalize to third-person canonical question                     │   │
│   │  - Claude rewrites preserving intent, removing specifics             │   │
│   │                                                                      │   │
│   │  → "Can a student request to reschedule an exam?"                   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   OUTPUT: Generic FAQ candidate ready for professor review                  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Deployment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEPLOYMENT ARCHITECTURE                              │
│                                                                              │
│   MVP: Single DigitalOcean Droplet ($48/month)                              │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     DigitalOcean Droplet                             │   │
│   │                     (4GB RAM, 2 vCPU)                                │   │
│   │                                                                      │   │
│   │   ┌─────────────────────────────────────────────────────────────┐   │   │
│   │   │                      Docker Compose                          │   │   │
│   │   │                                                              │   │   │
│   │   │   ┌───────────┐  ┌───────────┐  ┌───────────┐              │   │   │
│   │   │   │  Next.js  │  │ PostgreSQL│  │   Redis   │              │   │   │
│   │   │   │   App     │  │ + pgvector│  │           │              │   │   │
│   │   │   │  :3000    │  │  :5432    │  │  :6379    │              │   │   │
│   │   │   └───────────┘  └───────────┘  └───────────┘              │   │   │
│   │   │                                                              │   │   │
│   │   │   ┌───────────┐                                             │   │   │
│   │   │   │  BullMQ   │                                             │   │   │
│   │   │   │  Workers  │                                             │   │   │
│   │   │   └───────────┘                                             │   │   │
│   │   │                                                              │   │   │
│   │   └─────────────────────────────────────────────────────────────┘   │   │
│   │                                                                      │   │
│   │   ┌─────────────────────────────────────────────────────────────┐   │   │
│   │   │                       Nginx                                  │   │   │
│   │   │   - SSL termination (Let's Encrypt)                         │   │   │
│   │   │   - Reverse proxy to Next.js                                │   │   │
│   │   │   - Rate limiting                                            │   │   │
│   │   └─────────────────────────────────────────────────────────────┘   │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   External Dependencies:                                                     │
│   - Google Cloud (Gmail API, Pub/Sub) - free within quotas                  │
│   - Anthropic API - ~$0.01-0.05 per email processed                         │
│   - OpenAI API - ~$0.0001 per embedding                                     │
│   - Resend/Postmark - ~$0.001 per transactional email                       │
│                                                                              │
│   Estimated monthly cost for MVP (3-5 professors, ~500 emails/month):       │
│   - Droplet: $48                                                             │
│   - APIs: ~$20-50                                                            │
│   - Total: ~$70-100/month                                                    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| OAuth tokens | AES-256-GCM encrypted at rest in database |
| Magic link tokens | Cryptographically random, hashed (never stored plaintext), single-use, 15-min expiry |
| Student invite URLs | Signed JWTs with 7-day expiry, include course_id to prevent cross-course use |
| Email bodies | Encrypted at rest, deleted after course end + 1 semester |
| API access | JWT sessions in httpOnly cookies, CSRF protection |
| Prompt injection | Email content sanitized before LLM calls |
| SQL injection | Parameterized queries everywhere |
| Rate limiting | 100 req/min per user, 5 magic links/email/hour, 50 chatbot messages/student/day |
| FERPA | Personal emails never enter FAQ pipeline, anonymization for all FAQ candidates |
