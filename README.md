# Taflo (TaskAI) — AI task breakdown

Type a high-level goal; an AI agent breaks it into goals → projects → tasks → subtasks with priorities, due dates and time estimates, then tracks progress as you complete them.

**Why:** planning is the work nobody has time for. This puts an agent on it so you can get to doing.

## Try it in 5 minutes (no accounts)
You only need Node 20+. No Firebase, OpenAI or Postgres required.
```bash
git clone https://github.com/snahar7/TaskAI && cd TaskAI
npm ci
npm run demo        # builds and serves http://localhost:5000
```
Open http://localhost:5000, type a goal (try "Launch a newsletter in 6 weeks") and click **Break Down My Goal**.

What demo mode does:
- **Login:** you're signed in automatically as a local **Demo User**, and a yellow banner shows that demo mode is on.
- **AI:** breakdowns are realistic canned templates picked by keywords in your goal (newsletter/content, product launch, learning, fitness, job search), with a generic fallback. AI Assist is disabled.
- **Database:** with no `DATABASE_URL`, data goes into an embedded Postgres ([PGlite](https://pglite.dev)) in `./.taflo-data`. Delete that folder to reset.

Demo mode turns on automatically when `OPENAI_API_KEY` or the Firebase config is missing, or when you set `DEMO_MODE=true`. Set `DEMO_MODE=false` to require real keys. Demo login only exists while demo mode is on, so never run a public deployment in demo mode.


![Taflo dashboard after breaking down a goal (demo mode)](docs/screenshot.png)

## Features
- GPT-4o breakdown of goals/tasks into structured subtasks, with an approval step before saving
- Goal → project → task → subtask hierarchy, detail pages, calendar timeline
- Progress roll-up when subtasks complete
- AI-assist services: planning assistant, research agent, content generator, task analyzer
- Firebase auth, team assignment, file upload

## Tech stack
React 18 + TypeScript, Vite, wouter, TanStack Query, Tailwind + shadcn/ui · Express (TypeScript) · PostgreSQL (Neon or local) + Drizzle ORM · sessions in Postgres (connect-pg-simple) · OpenAI GPT-4o · Firebase (auth/Firestore)

## Run with your own accounts
You need Node 20+, an [OpenAI API key](https://platform.openai.com/api-keys), a Postgres database, and a Firebase project (see [Set up your own Firebase](#set-up-your-own-firebase)).

1. **Get a database.** Either:
   - **Neon (no install):** sign up at [neon.tech](https://neon.tech), create a project, and copy the connection string (`postgresql://…neon.tech/neondb?sslmode=require`).
   - **Local Postgres:** `docker compose up -d` starts one at `postgresql://taflo:taflo@localhost:5432/taflo`.
2. **Configure:**
   ```bash
   git clone https://github.com/snahar7/TaskAI && cd TaskAI
   npm ci
   cp .env.example .env
   ```
   In `.env`, set `DATABASE_URL`, `OPENAI_API_KEY`, `SESSION_SECRET` (`openssl rand -hex 32`) and the `VITE_FIREBASE_*` values.
3. **Create the tables:** `npm run db:push`
4. **Start:** `npm run dev`, then open http://localhost:5000 (or your `PORT`).

Production: `npm run build && npm start`. Sessions are stored in Postgres (the `session` table is created automatically).

### Session secret
`SESSION_SECRET` is required in every environment, including dev. The server refuses to start without it. Generate one with:
```bash
openssl rand -hex 32
```
and put it in `.env` as `SESSION_SECRET=<value>`.

## Set up your own Firebase
TaskAI ships with no Firebase project. Bring your own:

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication** → Get started → enable **Email/Password** and **Google**. Under Settings → Authorized domains, add your dev and production domains.
3. **Firestore Database** → Create database (production mode).
4. **Project settings → Your apps → Add app → Web**. Register the app and copy the `firebaseConfig` values into `.env` as the `VITE_FIREBASE_*` variables (see `.env.example`).
5. Optional (server-side Firestore): Project settings → Service accounts → Generate new private key. Put the JSON on one line in `FIREBASE_SERVICE_ACCOUNT_KEY` and set `FIREBASE_PROJECT_ID`.

The app fails fast with a clear error listing any missing `VITE_FIREBASE_*` variables.

**Lock it down:**
- In Google Cloud Console → APIs & Services → Credentials, restrict the browser API key to your domains (HTTP referrers) and to the Identity Toolkit, Token Service and Firestore APIs.
- Use Firestore rules so each user can only read and write their own data. Example:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{collection}/{docId} {
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
  }
}
```

## Environment variables
`DATABASE_URL` (Neon or any Postgres; optional `DATABASE_DRIVER=neon|pg`), `OPENAI_API_KEY`, `SESSION_SECRET`, `JWT_SECRET`, `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `PORT`, `NODE_ENV` (see `.env.example`).

## License
MIT
