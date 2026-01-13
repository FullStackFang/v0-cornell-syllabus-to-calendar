# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Course Assistant MCP Server** - A pure MCP (Model Context Protocol) server for managing course Q&A. Professors connect via Claude Desktop, Cursor, or any MCP client to manage student email responses using their own Claude subscription.

The project also includes an optional Next.js web app for individual users.

## Two Modes

### 1. MCP Server (Primary)
Professors use Claude Desktop to manage courses via natural language:
- "Set up a course called CS 101"
- "Check my inbox for student questions"
- "Approve the response to Alice"
- "Add FAQ: office hours are Tuesdays 3-5pm"

### 2. Web App (Optional)
Individual users can use the web interface for personal syllabus/calendar management.

## Development Commands

```bash
# Web App
npm install           # Install dependencies
npm run dev           # Start development server (port 3000)
npm run build         # Production build

# MCP Server
npm run mcp           # Start MCP server (stdio mode)
npm run mcp:setup     # Run Google OAuth setup
npm run mcp:status    # Check authentication status
```

## Environment Variables

```bash
# Required for MCP Server
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Required for Web App (additional)
ANTHROPIC_API_KEY=your-anthropic-key
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
```

## Architecture

See `docs/ARCHITECTURE.md` for full details.

### MCP Server Flow
```
Professor (Claude Desktop) → MCP Protocol → mcp/server.ts → lib/ functions → Google APIs
```

### Key Directories

```
mcp/                    # MCP Server
├── server.ts           # Main entry point (stdio transport)
├── auth/google.ts      # Local OAuth handler
└── tools/index.ts      # Tool definitions (20+ tools)

lib/                    # Core functions (shared)
├── gmail.ts            # Gmail API
├── google-calendar.ts  # Calendar API
├── drive.ts            # Drive storage
├── knowledge-base.ts   # FAQ management
├── course-config.ts    # Course settings
└── encryption.ts       # Token encryption

app/                    # Next.js web app (optional)
└── api/
    ├── mcp/http/       # HTTP MCP endpoint
    └── test/           # Test endpoints
```

### MCP Tools Available

**Course Management:**
- `setup_course`, `list_courses`, `get_course_info`, `update_settings`

**Knowledge Base:**
- `sync_syllabus`, `add_faq`, `list_faqs`, `update_faq`, `remove_faq`
- `search_faqs`, `add_key_date`, `add_policy`

**Email Processing:**
- `check_emails`, `get_pending`, `approve_response`, `draft_response`
- `ignore_question`, `search_emails`, `get_email_thread`, `send_email`

**Calendar:**
- `create_event`, `list_events`

**Analytics:**
- `get_stats`

## Data Storage

All data stored in professor's Google Drive:
```
CourseAssistant/
└── [course-id]/
    ├── config.json           # Course settings
    ├── knowledge-base.json   # FAQs, policies
    ├── pending-queue.json    # Questions awaiting action
    └── history.json          # Answered questions
```

## Testing the MCP Server

1. **Check status:**
   ```bash
   npm run mcp:status
   ```

2. **Set up authentication:**
   ```bash
   export GOOGLE_CLIENT_ID="your-id"
   export GOOGLE_CLIENT_SECRET="your-secret"
   npm run mcp:setup
   ```

3. **Configure Claude Desktop** (`~/.config/claude/claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "course-assistant": {
         "command": "npx",
         "args": ["tsx", "/path/to/mcp/server.ts"],
         "env": {
           "GOOGLE_CLIENT_ID": "...",
           "GOOGLE_CLIENT_SECRET": "..."
         }
       }
     }
   }
   ```

## Key Files Reference

| File | Purpose |
|------|---------|
| `mcp/server.ts` | MCP server entry point |
| `mcp/auth/google.ts` | Local OAuth flow |
| `mcp/tools/index.ts` | Tool definitions |
| `lib/gmail.ts` | Gmail API functions |
| `lib/drive.ts` | Drive storage |
| `lib/knowledge-base.ts` | FAQ management |
| `lib/course-config.ts` | Course settings |
| `docs/ARCHITECTURE.md` | Full architecture docs |
| `NEXTSTEPS.md` | Implementation log |

## Google Cloud Setup

1. Create project at console.cloud.google.com
2. Enable APIs: Gmail, Calendar, Drive
3. Create OAuth 2.0 credentials (Desktop app for MCP, Web app for Next.js)
4. Add scopes: gmail.readonly, gmail.send, gmail.modify, calendar, drive.file

## Tech Stack

- **MCP SDK**: @modelcontextprotocol/sdk
- **Runtime**: Node.js with tsx (TypeScript execution)
- **Google APIs**: googleapis
- **Framework**: Next.js 16 (optional web app)
- **Storage**: Google Drive (no database)
