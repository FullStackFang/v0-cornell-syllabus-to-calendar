# Course Assistant MCP Server - Architecture

## Overview

A **pure MCP (Model Context Protocol) server** that professors connect to via their preferred AI client (Claude Desktop, Cursor, Claude Code CLI). The server provides tools for managing course Q&A, processing student emails, and maintaining a knowledge base - all stored in the professor's Google Drive.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SYSTEM OVERVIEW                             │
│                                                                     │
│   ┌─────────────────────┐              ┌─────────────────────┐     │
│   │    MCP Client       │              │    MCP Server       │     │
│   │                     │    MCP       │    (this project)   │     │
│   │  ┌───────────────┐  │  Protocol    │                     │     │
│   │  │ Claude Desktop│  │◄────────────►│  ┌───────────────┐  │     │
│   │  │ Cursor IDE    │  │   (stdio     │  │    Tools      │  │     │
│   │  │ Claude Code   │  │    or HTTP)  │  │               │  │     │
│   │  └───────────────┘  │              │  │ - setup_course│  │     │
│   │                     │              │  │ - check_emails│  │     │
│   │  Professor types    │              │  │ - add_faq     │  │     │
│   │  natural language   │              │  │ - approve_resp│  │     │
│   │  commands here      │              │  │ - get_stats   │  │     │
│   │                     │              │  │ - ...         │  │     │
│   └─────────────────────┘              │  └───────┬───────┘  │     │
│                                        │          │          │     │
│                                        └──────────┼──────────┘     │
│                                                   │                │
│                         ┌─────────────────────────┼─────────┐      │
│                         │                         ▼         │      │
│                         │              ┌─────────────────┐  │      │
│                         │              │  Google Drive   │  │      │
│                         │              │                 │  │      │
│                         │  ┌───────────┴───────────┐     │  │      │
│                         │  │                       │     │  │      │
│                         │  ▼                       ▼     │  │      │
│                         │ Gmail API         Calendar API │  │      │
│                         │                                │  │      │
│                         │     Professor's Google Account │  │      │
│                         └────────────────────────────────┘  │      │
│                                                             │      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Why MCP Server?

| Benefit | Description |
|---------|-------------|
| **No hosting needed** | Runs locally or professor self-hosts |
| **Zero app costs** | No Vercel, no database, no infrastructure |
| **True BYOK** | Professor uses their own Claude subscription via their client |
| **Familiar interface** | Works with Claude Desktop, Cursor, any MCP client |
| **Portable** | Same tools work across all MCP-compatible AI clients |
| **Privacy** | Data stays in professor's own Google Drive |

---

## User Roles

### Professor (Primary User)

- Connects MCP server to their AI client
- Manages course via natural language conversation
- Reviews and approves student email responses
- Builds knowledge base from syllabus and interactions

### Student (Indirect User)

- Emails professor as normal
- Receives AI-assisted responses (may not know it's AI)
- No login, no app interaction required

---

## Data Flow

### Professor Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PROFESSOR WORKFLOW                              │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │                    INITIAL SETUP (One Time)                  │  │
│   │                                                              │  │
│   │  1. Professor installs/connects MCP server                  │  │
│   │  2. Authenticates with Google (grants Gmail, Drive access)  │  │
│   │  3. Says: "Set up a new course called CS 101"               │  │
│   │                         │                                    │  │
│   │                         ▼                                    │  │
│   │     ┌─────────────────────────────────────────┐             │  │
│   │     │  MCP Tool: setup_course                 │             │  │
│   │     │                                          │             │  │
│   │     │  → Creates CourseAssistant/cs-101/      │             │  │
│   │     │    folder in professor's Google Drive   │             │  │
│   │     │  → Initializes config.json              │             │  │
│   │     │  → Initializes knowledge-base.json      │             │  │
│   │     │  → Returns confirmation                 │             │  │
│   │     └─────────────────────────────────────────┘             │  │
│   │                         │                                    │  │
│   │                         ▼                                    │  │
│   │  4. Professor: "Here's my syllabus: [pastes text or file]"  │  │
│   │                         │                                    │  │
│   │                         ▼                                    │  │
│   │     ┌─────────────────────────────────────────┐             │  │
│   │     │  MCP Tool: sync_syllabus                │             │  │
│   │     │                                          │             │  │
│   │     │  → Parses syllabus content              │             │  │
│   │     │  → Extracts key dates, policies, FAQs   │             │  │
│   │     │  → Updates knowledge-base.json          │             │  │
│   │     │  → Returns: "Found 12 dates, 5 policies"│             │  │
│   │     └─────────────────────────────────────────┘             │  │
│   │                                                              │  │
│   │  Setup complete! Professor can now manage course.           │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │                   ONGOING MANAGEMENT                         │  │
│   │                                                              │  │
│   │  Professor: "Check my inbox for student questions"          │  │
│   │                         │                                    │  │
│   │                         ▼                                    │  │
│   │     ┌─────────────────────────────────────────┐             │  │
│   │     │  MCP Tool: check_emails                 │             │  │
│   │     │                                          │             │  │
│   │     │  → Searches Gmail for unprocessed emails│             │  │
│   │     │  → Analyzes each against knowledge base │             │  │
│   │     │  → Calculates confidence scores         │             │  │
│   │     │  → Returns summary:                     │             │  │
│   │     │    "3 new questions:                    │             │  │
│   │     │     1. Alice: midterm (95% - auto-reply)│             │  │
│   │     │     2. Bob: extension (40% - needs you) │             │  │
│   │     │     3. Carol: grade (20% - needs you)"  │             │  │
│   │     └─────────────────────────────────────────┘             │  │
│   │                         │                                    │  │
│   │                         ▼                                    │  │
│   │  Professor: "Auto-reply to Alice, tell Bob yes until Friday"│  │
│   │                         │                                    │  │
│   │              ┌──────────┴──────────┐                        │  │
│   │              ▼                     ▼                         │  │
│   │  ┌─────────────────┐    ┌─────────────────┐                 │  │
│   │  │ approve_response│    │ draft_response  │                 │  │
│   │  │                 │    │                 │                 │  │
│   │  │ → Sends email   │    │ → Creates draft │                 │  │
│   │  │   to Alice      │    │   for Bob       │                 │  │
│   │  │ → Logs to       │    │ → Professor can │                 │  │
│   │  │   history       │    │   review/send   │                 │  │
│   │  └─────────────────┘    └─────────────────┘                 │  │
│   │                         │                                    │  │
│   │                         ▼                                    │  │
│   │  Professor: "Add FAQ: extension requests need 48hr notice"  │  │
│   │                         │                                    │  │
│   │                         ▼                                    │  │
│   │     ┌─────────────────────────────────────────┐             │  │
│   │     │  MCP Tool: add_faq                      │             │  │
│   │     │                                          │             │  │
│   │     │  → Adds Q&A to knowledge-base.json      │             │  │
│   │     │  → Future questions will match this     │             │  │
│   │     │  → Returns confirmation                 │             │  │
│   │     └─────────────────────────────────────────┘             │  │
│   │                                                              │  │
│   └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Student Workflow (Email-Based)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      STUDENT WORKFLOW                               │
│                                                                     │
│   Student has a question                                            │
│           │                                                         │
│           ▼                                                         │
│   ┌───────────────────────────────────┐                            │
│   │  Student sends email to professor │                            │
│   │  "When is the midterm exam?"      │                            │
│   │  → professor@university.edu       │                            │
│   └───────────────────────────────────┘                            │
│           │                                                         │
│           │  Email sits in professor's inbox                       │
│           │                                                         │
│           ▼                                                         │
│   ┌───────────────────────────────────┐                            │
│   │  Professor (at their convenience) │                            │
│   │  "Check for new student questions"│                            │
│   └───────────────────────────────────┘                            │
│           │                                                         │
│           ▼                                                         │
│   ┌───────────────────────────────────┐                            │
│   │  MCP Server processes email:      │                            │
│   │  - Matches against knowledge base │                            │
│   │  - Generates suggested response   │                            │
│   │  - Calculates confidence          │                            │
│   └───────────────────────────────────┘                            │
│           │                                                         │
│           ├──── HIGH confidence (≥85%) ────┐                       │
│           │                                 ▼                       │
│           │                    ┌───────────────────────┐           │
│           │                    │ Professor: "Approve"  │           │
│           │                    │ → Email sent to student│          │
│           │                    └───────────────────────┘           │
│           │                                                         │
│           └──── LOW confidence (<85%) ─────┐                       │
│                                             ▼                       │
│                                ┌───────────────────────┐           │
│                                │ Professor reviews,    │           │
│                                │ edits, then approves  │           │
│                                │ → Custom email sent   │           │
│                                └───────────────────────┘           │
│                                             │                       │
│                                             ▼                       │
│                                ┌───────────────────────┐           │
│                                │  Student receives     │           │
│                                │  response in inbox    │           │
│                                └───────────────────────┘           │
│                                                                     │
│   Note: Student never interacts with the app directly.             │
│   They just email and receive replies as normal.                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## MCP Tools Reference

### Course Management

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `setup_course` | Create new course in Drive | "Set up a course called CS 101" |
| `list_courses` | Show all courses | "What courses do I have?" |
| `get_course_info` | Get course details | "Show me CS 101 settings" |
| `update_course_settings` | Modify settings | "Set auto-reply threshold to 90%" |
| `delete_course` | Remove a course | "Delete the test course" |

### Knowledge Base

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `sync_syllabus` | Parse syllabus, extract info | "Here's my syllabus: [content]" |
| `add_faq` | Add Q&A pair | "Add FAQ: office hours are Tues 3-5" |
| `list_faqs` | View all FAQs | "Show me all FAQs" |
| `update_faq` | Modify existing FAQ | "Change the midterm date to March 20" |
| `remove_faq` | Delete an FAQ | "Remove the FAQ about parking" |
| `search_faqs` | Find matching FAQs | "Do I have an FAQ about extensions?" |
| `add_key_date` | Add important date | "Add key date: Final exam May 15" |
| `add_policy` | Add course policy | "Add policy: No laptops during exams" |

### Email Processing

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `check_emails` | Poll for new student questions | "Check my inbox for questions" |
| `get_pending` | View questions awaiting action | "Show pending questions" |
| `get_question_details` | See full email content | "What exactly did Alice ask?" |
| `approve_response` | Send AI-suggested response | "Approve response to Alice" |
| `draft_response` | Create custom draft | "Tell Bob the deadline is Friday" |
| `send_response` | Send custom response directly | "Reply to Carol: Yes, approved" |
| `ignore_question` | Mark as handled (no response) | "Ignore the spam message" |
| `search_emails` | General Gmail search | "Find emails about grade disputes" |

### Calendar

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `create_event` | Create calendar event | "Add office hours Tuesday 3-5pm" |
| `list_events` | View upcoming events | "What's on my calendar this week?" |
| `update_event` | Modify an event | "Move office hours to Thursday" |

### Analytics

| Tool | Description | Example Prompt |
|------|-------------|----------------|
| `get_stats` | Course statistics | "How many questions this week?" |
| `get_response_history` | View past responses | "Show last 10 answered questions" |
| `get_common_questions` | Most frequent topics | "What do students ask about most?" |

---

## Data Storage (Google Drive)

All data persists in the professor's own Google Drive:

```
Professor's Google Drive
│
└── CourseAssistant/                    ← App folder
    │
    ├── cs-101/                         ← Course folder
    │   │
    │   ├── config.json                 ← Course settings
    │   │   {
    │   │     "courseId": "cs-101",
    │   │     "courseName": "Intro to Computer Science",
    │   │     "professorEmail": "prof@university.edu",
    │   │     "settings": {
    │   │       "autoReplyThreshold": 0.85,
    │   │       "emailFilter": "subject:CS101 OR from:*@university.edu"
    │   │     },
    │   │     "createdAt": "2025-01-12T..."
    │   │   }
    │   │
    │   ├── knowledge-base.json         ← FAQs, policies, dates
    │   │   {
    │   │     "courseId": "cs-101",
    │   │     "syllabusSummary": "Intro course covering...",
    │   │     "keyDates": [
    │   │       { "date": "2025-03-15", "description": "Midterm" },
    │   │       { "date": "2025-05-10", "description": "Final" }
    │   │     ],
    │   │     "policies": [
    │   │       "Late homework: -10% per day, max 3 days",
    │   │       "No laptops during exams"
    │   │     ],
    │   │     "faqs": [
    │   │       {
    │   │         "id": "uuid-1",
    │   │         "question": "When is the midterm?",
    │   │         "answer": "March 15th at 2pm in Room 301",
    │   │         "source": "syllabus",
    │   │         "created": "2025-01-12T..."
    │   │       }
    │   │     ]
    │   │   }
    │   │
    │   ├── pending-queue.json          ← Questions awaiting action
    │   │   {
    │   │     "questions": [
    │   │       {
    │   │         "id": "q-123",
    │   │         "emailId": "gmail-msg-id",
    │   │         "from": "student@university.edu",
    │   │         "subject": "Extension request",
    │   │         "body": "Can I get an extension on HW3?",
    │   │         "receivedAt": "2025-01-12T...",
    │   │         "suggestedResponse": "I can grant...",
    │   │         "confidence": 0.45,
    │   │         "matchedFaqs": ["uuid-2"]
    │   │       }
    │   │     ]
    │   │   }
    │   │
    │   └── history.json                ← Answered questions log
    │       {
    │         "questions": [
    │           {
    │             "id": "q-100",
    │             "from": "alice@university.edu",
    │             "question": "When is the midterm?",
    │             "response": "March 15th at 2pm...",
    │             "answeredAt": "2025-01-11T...",
    │             "wasAutoApproved": true,
    │             "confidence": 0.95
    │           }
    │         ]
    │       }
    │
    └── data-science-200/               ← Another course
        ├── config.json
        ├── knowledge-base.json
        ├── pending-queue.json
        └── history.json
```

---

## MCP Server Transports

The server supports two transport modes:

### 1. stdio (Local - Recommended)

For Claude Desktop, local development:

```
┌──────────────┐     stdin/stdout     ┌──────────────┐
│Claude Desktop│◄────────────────────►│  MCP Server  │
│  (or Cursor) │                      │   (local)    │
└──────────────┘                      └──────────────┘
```

**Setup in Claude Desktop:**
```json
{
  "mcpServers": {
    "course-assistant": {
      "command": "node",
      "args": ["/path/to/course-assistant/dist/mcp-server.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "...",
        "GOOGLE_CLIENT_SECRET": "..."
      }
    }
  }
}
```

### 2. HTTP (Remote)

For hosted deployments, remote access:

```
┌──────────────┐       HTTPS        ┌──────────────┐
│  MCP Client  │◄──────────────────►│  MCP Server  │
│  (anywhere)  │                    │  (hosted)    │
└──────────────┘                    └──────────────┘
```

**Endpoint:** `POST /api/mcp/http`

---

## Authentication

### Google OAuth Flow

Since there's no web UI, authentication works via:

1. **First run**: Server opens browser for Google OAuth
2. **Token storage**: Refresh token saved locally (encrypted)
3. **Subsequent runs**: Uses stored refresh token
4. **Token refresh**: Automatic when access token expires

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                              │
│                                                                     │
│   First Time:                                                       │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐        │
│   │ MCP Server   │───►│ Opens browser│───►│ Google OAuth │        │
│   │ starts       │    │ localhost:X  │    │ consent      │        │
│   └──────────────┘    └──────────────┘    └──────┬───────┘        │
│                                                   │                 │
│                                                   ▼                 │
│                       ┌──────────────────────────────────┐         │
│                       │ User grants: Gmail, Calendar,    │         │
│                       │ Drive access                     │         │
│                       └──────────────────────────────────┘         │
│                                                   │                 │
│                                                   ▼                 │
│   ┌──────────────────────────────────────────────────────┐         │
│   │ Refresh token stored locally (encrypted)             │         │
│   │ ~/.course-assistant/credentials.json                 │         │
│   └──────────────────────────────────────────────────────┘         │
│                                                                     │
│   Subsequent Runs:                                                  │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐        │
│   │ MCP Server   │───►│ Load stored  │───►│ Use/refresh  │        │
│   │ starts       │    │ credentials  │    │ access token │        │
│   └──────────────┘    └──────────────┘    └──────────────┘        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Required Google Scopes

```
https://www.googleapis.com/auth/gmail.readonly    ← Read emails
https://www.googleapis.com/auth/gmail.send        ← Send responses
https://www.googleapis.com/auth/gmail.modify      ← Mark as read
https://www.googleapis.com/auth/calendar          ← Calendar access
https://www.googleapis.com/auth/drive.file        ← Drive storage
```

---

## Cost Structure

| Who | Pays For | Amount |
|-----|----------|--------|
| **Professor** | Claude AI usage | Their Claude subscription (via Claude Desktop, etc.) |
| **Professor** | Google APIs | Free (within quotas) |
| **App Developer** | Nothing | Just code distribution |
| **Students** | Nothing | Just email normally |

**This is true zero-cost hosting** - the MCP server runs locally on the professor's machine using their own Claude subscription.

---

## Configuration

### Environment Variables

```bash
# Required: Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Optional: Custom storage location
COURSE_ASSISTANT_DATA_DIR=~/.course-assistant

# Optional: Default settings
DEFAULT_AUTO_REPLY_THRESHOLD=0.85
DEFAULT_EMAIL_FILTER="is:unread"
```

### Course Settings

Each course can customize:

| Setting | Default | Description |
|---------|---------|-------------|
| `autoReplyThreshold` | 0.85 | Confidence needed for auto-approve |
| `emailFilter` | `is:unread` | Gmail search filter for questions |
| `maxPendingDays` | 7 | Auto-archive old pending questions |
| `notifyOnLowConfidence` | false | Alert for uncertain responses |

---

## Example Conversation

```
Professor: Set up a new course for my Data Science class

MCP Server: [calls setup_course tool]
→ Created course "data-science" in your Google Drive.
  Folder: CourseAssistant/data-science/
  Ready for syllabus upload.

Professor: Here's my syllabus for the course:
[pastes syllabus text or attaches PDF]

MCP Server: [calls sync_syllabus tool]
→ Parsed your syllabus. Found:
  - 8 key dates (midterm, final, project deadlines)
  - 4 policies (late work, attendance, academic integrity, grading)
  - Course description added to knowledge base

  Would you like me to show what I extracted?

Professor: Yes, show the key dates

MCP Server: [calls get_course_info tool]
→ Key dates for Data Science:
  1. Feb 15 - Problem Set 1 due
  2. Mar 1 - Problem Set 2 due
  3. Mar 15 - Midterm Exam
  4. Apr 1 - Project Proposal due
  5. Apr 15 - Problem Set 3 due
  6. May 1 - Final Project due
  7. May 10 - Final Exam
  8. May 15 - Grades posted

Professor: Add an FAQ that office hours are Wednesdays 2-4pm in Room 301

MCP Server: [calls add_faq tool]
→ Added FAQ:
  Q: When are office hours?
  A: Office hours are Wednesdays 2-4pm in Room 301.

Professor: Check my inbox for student questions about the course

MCP Server: [calls check_emails tool]
→ Found 4 new course-related emails:

  1. alice@university.edu - "Midterm date?"
     Confidence: 95% ✓
     Suggested: "The midterm is March 15th..."

  2. bob@university.edu - "Extension for PS2?"
     Confidence: 35% ⚠
     Suggested: "I'd need to know more about..."

  3. carol@university.edu - "Office hours this week?"
     Confidence: 92% ✓
     Suggested: "Office hours are Wednesdays 2-4pm..."

  4. dave@university.edu - "Grade dispute"
     Confidence: 15% ⚠
     Suggested: "I'll need to review your specific situation..."

Professor: Approve responses to Alice and Carol. For Bob, tell him yes
he can have until Friday. Ignore Dave for now, I'll handle that myself.

MCP Server: [calls approve_response x2, draft_response, ignore_question]
→ Done!
  ✓ Sent response to Alice about midterm date
  ✓ Sent response to Carol about office hours
  ✓ Created draft for Bob (extension until Friday) - review in Gmail
  ✓ Marked Dave's email as handled (no auto-response)

Professor: How many questions have I handled this week?

MCP Server: [calls get_stats tool]
→ This week's stats for Data Science:
  - 12 questions received
  - 8 auto-approved (high confidence)
  - 3 manually approved
  - 1 ignored
  - Average response time: 2.3 hours
  - Most common topic: Assignment deadlines (5 questions)
```

---

## Files Reference

### Core Library Functions

| File | Purpose |
|------|---------|
| `lib/gmail.ts` | Gmail API: search, send, draft, thread |
| `lib/google-calendar.ts` | Calendar API: create, list, update events |
| `lib/drive.ts` | Drive API: read/write JSON, manage folders |
| `lib/knowledge-base.ts` | Knowledge base CRUD operations |
| `lib/course-config.ts` | Course settings management |
| `lib/agent-decision.ts` | Confidence scoring for responses |

### MCP Server

| File | Purpose |
|------|---------|
| `mcp/server.ts` | MCP server entry point |
| `mcp/tools/course.ts` | Course management tools |
| `mcp/tools/knowledge-base.ts` | KB management tools |
| `mcp/tools/email.ts` | Email processing tools |
| `mcp/tools/calendar.ts` | Calendar tools |
| `mcp/auth/google.ts` | Google OAuth for MCP context |

### Configuration

| File | Purpose |
|------|---------|
| `.env` | Environment variables |
| `~/.course-assistant/credentials.json` | Stored OAuth tokens |
| `~/.course-assistant/config.json` | Local MCP server config |

---

## Implementation Status

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Done | Core lib functions (Gmail, Calendar, Drive) |
| 2 | ✅ Done | Knowledge base, agent decision engine |
| 3 | ✅ Done | Google Drive storage integration |
| 4 | 🔲 Next | **MCP Server Refactor** - Convert to pure MCP |
| 5 | 🔲 | Course management tools |
| 6 | 🔲 | Email processing tools (check_emails, approve) |
| 7 | 🔲 | stdio transport for Claude Desktop |
| 8 | 🔲 | Local OAuth flow (browser popup) |
| 9 | 🔲 | Documentation & distribution |

---

## Next Steps (Phase 4: MCP Server Refactor)

1. **Create standalone MCP server** (`mcp/server.ts`)
   - stdio transport for Claude Desktop
   - HTTP transport for remote access

2. **Implement course tools**
   - `setup_course`, `list_courses`, `get_course_info`

3. **Implement knowledge base tools**
   - `sync_syllabus`, `add_faq`, `list_faqs`, etc.

4. **Implement email tools**
   - `check_emails`, `approve_response`, `draft_response`

5. **Local OAuth flow**
   - Browser popup for initial auth
   - Secure token storage

6. **Remove web app** (optional)
   - Strip Next.js pages if going pure MCP
   - Or keep as optional web interface

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| OAuth tokens | Encrypted storage in `~/.course-assistant/` |
| API access | Uses user's own Google account |
| Data privacy | All data in user's own Drive |
| MCP transport | stdio is local-only; HTTP should use HTTPS |
| Email access | Scoped to read/send only (no delete) |

---

## Comparison: Web App vs MCP Server

| Aspect | Web App (Old) | MCP Server (New) |
|--------|---------------|------------------|
| Interface | Custom chat UI | Claude Desktop, Cursor |
| Hosting | Vercel (~$0-20/mo) | Local (free) |
| AI Costs | BYOK via stored key | User's Claude subscription |
| Auth | NextAuth sessions | Local OAuth tokens |
| Complexity | Full Next.js app | Lightweight MCP server |
| Portability | Web only | Any MCP client |
| Privacy | App sees all data | Data stays local |