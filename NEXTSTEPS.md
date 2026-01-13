# Course Assistant MCP Server - Implementation Log

## Current Status: Phase 4 Complete

The project has been refactored from a web app to a **pure MCP server** that professors can connect to via Claude Desktop, Cursor, or any MCP client.

---

## What's Been Implemented

### Phase 1-3: Foundation (Complete)
- [x] Core lib functions (Gmail, Calendar, Drive APIs)
- [x] Knowledge base management with FAQ matching
- [x] Agent decision engine with confidence scoring
- [x] Google Drive storage for persistent state
- [x] Model selection for cost control (Haiku/Sonnet/Opus)
- [x] API key encryption for secure storage

### Phase 4: MCP Server (Complete)
- [x] **`mcp/server.ts`** - Main MCP server entry point
  - stdio transport for Claude Desktop
  - CLI commands: `--setup`, `--status`, `--logout`, `--help`
  - Tool execution handler with 20+ tools

- [x] **`mcp/auth/google.ts`** - Local OAuth authentication
  - Browser-based OAuth flow (opens Google consent page)
  - Encrypted token storage at `~/.course-assistant/credentials.json`
  - Automatic token refresh

- [x] **`mcp/tools/index.ts`** - Tool definitions and registry
  - Course management tools
  - Knowledge base tools
  - Email processing tools
  - Calendar tools
  - Analytics tools

- [x] **Package.json updates**
  - `npm run mcp` - Start MCP server
  - `npm run mcp:setup` - Run Google OAuth setup
  - `npm run mcp:status` - Check authentication status

---

## Available MCP Tools

### Course Management
| Tool | Status | Description |
|------|--------|-------------|
| `setup_course` | ✅ | Create new course in Drive |
| `list_courses` | ✅ | Show all courses |
| `get_course_info` | ✅ | Get course details + stats |
| `update_settings` | ✅ | Modify course settings |

### Knowledge Base
| Tool | Status | Description |
|------|--------|-------------|
| `sync_syllabus` | ✅ | Store syllabus text |
| `add_faq` | ✅ | Add Q&A pair |
| `list_faqs` | ✅ | View all FAQs |
| `update_faq` | ✅ | Modify existing FAQ |
| `remove_faq` | ✅ | Delete an FAQ |
| `search_faqs` | ✅ | Find matching FAQs |
| `add_key_date` | ✅ | Add important date |
| `add_policy` | ✅ | Add course policy |

### Email Processing
| Tool | Status | Description |
|------|--------|-------------|
| `check_emails` | ✅ | Poll for student questions |
| `get_pending` | ✅ | View pending queue |
| `approve_response` | ✅ | Send AI suggestion |
| `draft_response` | ✅ | Create email draft |
| `ignore_question` | ✅ | Remove from queue |
| `search_emails` | ✅ | General Gmail search |
| `get_email_thread` | ✅ | Get full thread |
| `send_email` | ✅ | Send email |

### Calendar
| Tool | Status | Description |
|------|--------|-------------|
| `create_event` | ✅ | Add calendar event |
| `list_events` | ✅ | View events in range |

### Analytics
| Tool | Status | Description |
|------|--------|-------------|
| `get_stats` | ✅ | Course statistics |

---

## What's Left To Do

### Phase 5: Testing & Refinement
- [ ] Test full OAuth flow with real Google credentials
- [ ] Test all tools end-to-end
- [ ] Add better error handling and user feedback
- [ ] Test with Claude Desktop

### Phase 6: Enhanced Email Processing
- [ ] Add smarter FAQ matching (embeddings?)
- [ ] Implement batch approve/reject
- [ ] Add email templates
- [ ] Track processed email IDs to avoid duplicates

### Phase 7: Distribution
- [ ] Create npm package for easy installation
- [ ] Add Claude Desktop config generator
- [ ] Create first-run setup wizard
- [ ] Write user documentation

### Phase 8: Optional Enhancements
- [ ] Multiple courses per professor
- [ ] Export Q&A history
- [ ] Course statistics dashboard
- [ ] Email notifications for low-confidence questions

---

## How to Test

### 1. Check Status
```bash
npm run mcp:status
```

### 2. Set Up Authentication
```bash
# Set environment variables first
export GOOGLE_CLIENT_ID="your-client-id"
export GOOGLE_CLIENT_SECRET="your-client-secret"

# Run setup (opens browser)
npm run mcp:setup
```

### 3. Configure Claude Desktop

Add to `~/.config/claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "course-assistant": {
      "command": "npx",
      "args": ["tsx", "/full/path/to/mcp/server.ts"],
      "env": {
        "GOOGLE_CLIENT_ID": "your-client-id",
        "GOOGLE_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

### 4. Test in Claude Desktop
```
"Set up a course called CS 101"
"Add FAQ: office hours are Tuesdays 3-5pm in Room 205"
"Check my inbox for student questions"
"Approve the response to the first question"
```

---

## File Structure

```
project/
├── mcp/                          # MCP Server (NEW)
│   ├── server.ts                 # Main entry point
│   ├── auth/
│   │   └── google.ts             # Local OAuth handler
│   └── tools/
│       └── index.ts              # Tool definitions
│
├── lib/                          # Core library functions
│   ├── gmail.ts                  # Gmail API
│   ├── google-calendar.ts        # Calendar API
│   ├── drive.ts                  # Drive API
│   ├── knowledge-base.ts         # KB management
│   ├── course-config.ts          # Course settings
│   ├── encryption.ts             # API key encryption
│   └── agent-decision.ts         # Confidence scoring
│
├── app/                          # Next.js web app (optional)
│   └── api/
│       ├── mcp/http/             # HTTP MCP endpoint
│       └── test/                 # Test endpoints
│
├── docs/
│   └── ARCHITECTURE.md           # System architecture
│
├── NEXTSTEPS.md                  # This file
└── CLAUDE.md                     # Claude Code instructions
```

---

## Key Decisions Made

1. **Pure MCP Server** - No web app required. Professors use Claude Desktop.

2. **BYOK (Bring Your Own Key)** - Professors use their own Claude subscription via their MCP client.

3. **Google Drive Storage** - No database needed. All data in professor's Drive.

4. **Pull Model for Email** - Professor asks "check my inbox" instead of webhooks.

5. **Local OAuth** - Browser popup for auth, tokens stored locally encrypted.

6. **tsx for Development** - Run TypeScript directly without compilation.

---

## Dependencies

Key packages used:
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `googleapis` - Google APIs (Gmail, Calendar, Drive)
- `tsx` - TypeScript execution
- `zod` - Schema validation
- `uuid` - Unique IDs

---

## Environment Variables

Required:
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Optional:
```bash
COURSE_ASSISTANT_DATA_DIR=~/.course-assistant  # Default location
```

---

## Changelog

### 2025-01-13
- Created MCP server with stdio transport
- Implemented local OAuth flow with browser popup
- Added 20+ tools for course management
- Updated package.json with MCP scripts
- Verified server runs with `npm run mcp:status`

### Previous
- Implemented core lib functions
- Added Google Drive storage
- Added model selection for cost control
- Created knowledge base with FAQ matching
