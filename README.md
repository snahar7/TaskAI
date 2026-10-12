# Taflo (TaskAI) — AI task breakdown

Type a high-level goal; an AI agent breaks it into goals → projects → tasks → subtasks with priorities, due dates and time estimates, then tracks progress as you complete them.

**Why:** planning is the work nobody has time for. This puts an agent on it so you can get to doing.

![Screenshot](docs/screenshot.png) <!-- TODO: add screenshot/GIF -->

## Features
- GPT-4o breakdown of goals/tasks into structured subtasks, with an approval step before saving
- Goal → project → task → subtask hierarchy, detail pages, calendar timeline
- Progress roll-up when subtasks complete
- AI-assist services: planning assistant, research agent, content generator, task analyzer
- Firebase auth, team assignment, file upload

## Tech stack
React 18 + TypeScript, Vite, wouter, TanStack Query, Tailwind + shadcn/ui · Express (TypeScript) · PostgreSQL (Neon) + Drizzle ORM · OpenAI GPT-4o · Firebase (auth/Firestore)

## Setup
```bash
npm install
cp .env.example .env   # fill in values
npm run db:push        # drizzle-kit push: create/sync DB schema
npm run dev            # dev server on PORT (default 5000)
# production: npm run build && npm start
```

## Environment variables
`DATABASE_URL`, `OPENAI_API_KEY`, `SESSION_SECRET`, `JWT_SECRET`, `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `PORT`, `NODE_ENV` (see `.env.example`).

## License
MIT
