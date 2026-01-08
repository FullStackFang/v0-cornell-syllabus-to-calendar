# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered web application with a conversational agent that extracts course information from syllabus PDFs, syncs events directly to Google Calendar, and searches Gmail for course-related content. Built for Cornell EMBA students.

## Development Commands

```bash
npm install           # Install dependencies
npm run dev           # Start development server (port 3000)
npm run build         # Production build
npm run start         # Start production server
npm run lint          # Run ESLint
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```
ANTHROPIC_API_KEY     # Required for Claude AI
GOOGLE_CLIENT_ID      # Google OAuth client ID
GOOGLE_CLIENT_SECRET  # Google OAuth client secret
NEXTAUTH_SECRET       # Generate with: openssl rand -base64 32
NEXTAUTH_URL          # http://localhost:3000 for dev
```

## Architecture

### AI Agent

The app features a conversational AI agent (`/chat`) with four tools:

1. **parse_syllabus** - Extract structured data from syllabus text
2. **create_calendar_events** - Create events on Google Calendar
3. **search_emails** - Search Gmail with query syntax
4. **summarize_email_thread** - Fetch and summarize email threads

### Data Flow

1. User signs in via Google OAuth (grants calendar + gmail scopes)
2. Chat with agent OR upload syllabus via dashboard
3. Agent parses syllabus, creates calendar events, searches emails
4. Events sync directly to Google Calendar

### Key Files

**Authentication:**
- `lib/auth.ts` - NextAuth configuration with Google OAuth
- `middleware.ts` - Protects /dashboard, /chat, /review, /success routes

**AI Agent:**
- `lib/agent/tools.ts` - Agent tool definitions and executors
- `app/api/chat/route.ts` - Streaming chat endpoint with tool calling

**Google APIs:**
- `lib/google-calendar.ts` - Calendar event creation helpers
- `lib/gmail.ts` - Email search and thread retrieval

**API Routes:**
- `app/api/upload/route.ts` - PDF upload and text extraction
- `app/api/calendar/sync/route.ts` - Direct Google Calendar sync
- `app/api/email/search/route.ts` - Gmail search endpoint

### Page Routes

- `/` - Landing page with Google OAuth sign-in
- `/dashboard` - File upload interface, links to chat
- `/chat` - Conversational AI agent interface
- `/review` - Edit extracted course data
- `/success` - Confirmation after calendar creation

## Tech Stack

- **Framework**: Next.js 16 (React 19, App Router)
- **Auth**: NextAuth.js with Google OAuth
- **AI**: Vercel AI SDK with Anthropic Claude Sonnet 4
- **APIs**: Google Calendar API, Gmail API (via googleapis)
- **Styling**: Tailwind CSS 4, shadcn/ui
- **Validation**: Zod schemas

## Google Cloud Setup

1. Create project at console.cloud.google.com
2. Enable: Google Calendar API, Gmail API
3. Create OAuth 2.0 credentials (Web application)
4. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID and Secret to `.env.local`
