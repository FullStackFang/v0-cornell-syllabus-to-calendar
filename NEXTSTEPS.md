# CourseFlow AI - Implementation Progress

> Web app for professors to manage course communications via Gmail integration.

---

## Current Status: Phase 1 In Progress

### Completed

#### 1.3 Authentication (Magic Link)
- [x] Supabase Auth integration with magic links
- [x] `POST /api/auth/magic-link` - Send login email
- [x] `GET /api/auth/callback` - Handle magic link verification
- [x] `POST /api/auth/logout` - Sign out
- [x] Session management via Supabase cookies
- [x] Auth provider with `useAuth()` hook
- [x] Landing page with email sign-in form

#### 1.4 Integrations / Connectors System
- [x] `integrations` table in Supabase (user_id, provider, status, encrypted tokens)
- [x] `GET /api/integrations` - List user's integrations
- [x] `GET /api/integrations/gmail/connect` - Initiate Gmail OAuth
- [x] `GET /api/integrations/gmail/callback` - Handle OAuth callback, store tokens
- [x] `POST /api/integrations/gmail/toggle` - Pause/resume monitoring
- [x] `POST /api/integrations/gmail/disconnect` - Revoke and remove tokens
- [x] Token encryption via `lib/encryption.ts`
- [x] Token refresh logic in `lib/integrations.ts`
- [x] Settings/Integrations page UI (`/settings/integrations`)
- [x] Email mismatch detection (Gmail account must match login email)

#### Database Schema
- [x] `profiles` table (extends auth.users)
- [x] `integrations` table (provider connections)
- [x] RLS policies for both tables
- [x] Auto-create profile trigger on signup

#### Supporting Libraries
- [x] `lib/integrations.ts` - Token management, Gmail auth URL
- [x] `lib/encryption.ts` - Encrypt/decrypt OAuth tokens
- [x] `lib/supabase/client.ts` - Browser client
- [x] `lib/supabase/server.ts` - Server client
- [x] `lib/supabase/middleware.ts` - Session refresh

---

## Next Up: Phase 1 Continued

### 1.5 Course Management (Completed)
- [x] `courses` table schema with RLS policies
- [x] `POST /api/courses` - Create course
- [x] `GET /api/courses` - List professor's courses
- [x] `GET /api/courses/:id` - Get course details
- [x] `PATCH /api/courses/:id` - Update settings
- [x] `DELETE /api/courses/:id` - Archive course (soft delete)
- [x] Plus-address generation (`{email_local}+{course_code}@{domain}`)
- [x] Course management UI (`/courses` page)
- [x] Create course dialog with form
- [x] Course cards with copy-to-clipboard plus-address
- [x] Navigation link from user dropdown menu

### 1.6 Material Upload + Processing (Completed)
- [x] `course_materials` and `material_chunks` tables with RLS policies
- [x] pgvector extension for embeddings
- [x] `POST /api/upload` - Enhanced with course detection and file hashing
- [x] `POST /api/materials` - Save materials to courses
- [x] `POST /api/courses/from-syllabus` - Create course + attach syllabus in one step
- [x] `lib/embeddings.ts` - Text chunking (~500 tokens) and embedding generation
- [x] `search_material_chunks` PostgreSQL function for semantic search
- [x] Syllabus-to-course flow in UI (dialog prompts to create course after upload)

### 1.7 Student Roster (Not Started)
- [ ] `students` and `enrollments` tables
- [ ] `POST /api/courses/:id/students` - Add students (single or CSV)
- [ ] `GET /api/courses/:id/students` - List enrolled students
- [ ] `DELETE /api/courses/:id/students/:sid` - Remove enrollment
- [ ] Student roster UI

### 1.8 Gmail Email Processing (Not Started)
- [ ] Gmail Pub/Sub watch setup
- [ ] `POST /api/gmail/webhook` - Receive notifications
- [ ] Message fetching via Gmail API
- [ ] Plus-address detection for course routing
- [ ] Store emails in database

### 1.9 Email Classification (Not Started)
- [ ] Classification prompt (categories: policy, content, logistics, etc.)
- [ ] Confidence scoring
- [ ] Email embedding generation
- [ ] Email list UI with filters

### 1.10 Job Queue Setup (Not Started)
- [ ] BullMQ + Redis configuration
- [ ] Email processing worker
- [ ] Worker runner script

---

## Phase 2: Intelligence + Responses

### 2.1-2.4 Response Generation & Approval
- [ ] Draft response generation with FAQ/material grounding
- [ ] Professor approval workflow (approve/edit/reply/dismiss)
- [ ] Sending replies via Gmail API
- [ ] Auto-reply system with confidence threshold

### 2.5-2.8 FAQ System
- [ ] Seed FAQ from syllabus
- [ ] Reactive FAQ generation from novel questions
- [ ] Anonymization pipeline (FERPA compliance)
- [ ] FAQ approval workflow

### 2.9-2.10 Feedback & Dashboard
- [ ] Feedback signal detection
- [ ] Professor dashboard with analytics

---

## Phase 3: Student Experience

- [ ] Student authentication (magic link + signed invite URLs)
- [ ] Student invite flow
- [ ] FAQ browser
- [ ] Student chatbot
- [ ] Email status page

---

## Phase 4: Polish + Beta

- [ ] Security hardening
- [ ] Error handling
- [ ] Monitoring
- [ ] UI polish
- [ ] Deployment

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google OAuth (Gmail connector)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Encryption (for OAuth tokens)
ENCRYPTION_SECRET=your-32-byte-base64-secret

# Anthropic (LLM)
ANTHROPIC_API_KEY=your-anthropic-key

# OpenAI (Embeddings)
OPENAI_API_KEY=your-openai-key
```

---

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Next.js dev server (port 3000)
npm run build        # Production build
npm run lint         # Run linter
```

---

## File Structure

```
app/
├── api/
│   ├── auth/
│   │   ├── magic-link/route.ts    # Send magic link
│   │   ├── callback/route.ts       # Verify magic link
│   │   └── logout/route.ts         # Sign out
│   ├── integrations/
│   │   ├── route.ts                # List integrations
│   │   └── gmail/
│   │       ├── connect/route.ts    # Start OAuth
│   │       ├── callback/route.ts   # OAuth callback
│   │       ├── toggle/route.ts     # Pause/resume
│   │       └── disconnect/route.ts # Disconnect
│   ├── email/                      # Email search (existing)
│   ├── chat/                       # Chat endpoint (existing)
│   └── calendar/                   # Calendar sync (existing)
├── settings/
│   └── integrations/page.tsx       # Integrations UI
├── page.tsx                        # Landing page
└── layout.tsx                      # Root layout

lib/
├── supabase/
│   ├── client.ts                   # Browser client
│   ├── server.ts                   # Server client
│   └── middleware.ts               # Session middleware
├── integrations.ts                 # Token management
├── encryption.ts                   # Token encryption
├── gmail.ts                        # Gmail API helpers
└── anthropic.ts                    # Claude API

components/
├── providers.tsx                   # Auth provider
└── ui/                             # shadcn components

db/
└── schema.sql                      # Supabase schema
```

---

## Changelog

### 2026-02-03
- Implemented Material Upload + Processing (Section 1.6)
- Added course_materials and material_chunks tables with pgvector
- Created syllabus-to-course detection and creation flow
- Built text chunking and embedding pipeline (lib/embeddings.ts)
- Added semantic search function for material chunks

### 2026-02-02
- Implemented Course Management (Section 1.5)
- Added `courses` table to database schema with RLS policies
- Created CRUD API routes for courses
- Built courses page UI with create dialog, course cards, plus-address copy
- Added navigation link to courses from user dropdown

### 2025-02-02
- Tested Gmail OAuth flow end-to-end
- Verified connect/toggle/disconnect all work
- Confirmed persistence across sessions

### Previous
- Implemented Supabase Auth with magic links
- Created Gmail connector system
- Built integrations settings page
- Added token encryption
