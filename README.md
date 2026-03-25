# Northstar

Northstar is a Kanban-first operating system for non-technical founders.

This is not a chatbot with random actions. The board is the product.

A founder enters a website URL, Northstar analyzes what the company does, generates a prioritized marketing and SEO backlog, and runs work through a visible Kanban with approvals.

## Product thesis

Northstar is built around one idea:

- founders need a system of work, not another stream of disconnected AI output

The command center should help a founder:

1. understand what their company currently communicates
2. see the highest-leverage growth work in priority order
3. add their own tasks into the same operating board
4. understand why each task exists and why it is ranked where it is
5. approve generated artifacts before anything moves forward

## Current v1

The current v1 demo flow is intentionally tight:

1. enter a website URL
2. crawl the homepage plus a few important internal pages
3. generate:
   - company summary
   - guessed ICP
   - key opportunities
   - first backlog
4. review and manage work in the Kanban board
5. add manual tasks and let the system score them
6. generate one artifact type in v1: `blog_brief`
7. approve or reject the artifact from the approval queue
8. leave founder comments directly on tasks

Kanban columns:

- `Inbox`
- `Evaluating`
- `Planned`
- `In Progress`
- `Waiting for Approval`
- `Done`
- `Blocked`

## What works today

- website onboarding
- lightweight site ingestion
- company summary generation
- ICP inference
- opportunity detection
- seed task generation
- priority scoring with `priority_score = (impact * confidence * goal_fit) / effort`
- Kanban board view
- manual task creation, including optional descriptions
- task rationale showing why the task exists, why it has its current priority, and what business outcome it supports
- task movement history
- task comments
- mocked blog brief generation from the command center
- approval flow with approve and reject actions plus revision notes

## What is intentionally mocked in v1

- agent execution is mocked
- only `blog_brief` is executable
- no publishing integrations
- no WhatsApp / Telegram adapters yet
- no auth yet
- no background queue yet
- no team collaboration features yet

## Repo layout

- `apps/web`: React + Vite founder command center
- `apps/api`: Fastify API and orchestration layer
- `packages/types`: shared domain models
- `packages/site-ingestion`: website ingestion and summary logic
- `packages/task-engine`: task generation, scoring, and Kanban transitions
- `packages/agent-core`: planner contracts and mocked blog-brief execution
- `prisma/schema.prisma`: Prisma schema targeting Postgres for real deployments

## Recommended database

Use `Vercel Postgres` for the smallest production-sensible Vercel path.

Why:
- hosted persistent Postgres instead of local SQLite
- Prisma works cleanly with pooled runtime connections plus a direct migration connection
- it keeps the demo stack simple: Vercel web, Vercel API, hosted Postgres

Northstar itself only expects these database env vars:

- `DATABASE_URL`: pooled runtime connection string
- `DIRECT_URL`: direct non-pooled migration connection string

## Local setup

Install dependencies:

```bash
npm install
```

Create `.env` from `.env.example` and point it at a Postgres database.

The simplest local path is to use the same hosted Postgres database shape as production.
For Vercel Postgres, copy:

- the Prisma/pooling URL into `DATABASE_URL`
- the non-pooling URL into `DIRECT_URL`

Generate Prisma client:

```bash
npx prisma generate
```

Apply the checked-in migration:

```bash
npx prisma migrate deploy
```

Seed demo data if you want a ready-made workspace:

```bash
npm run db:seed
```

The seed command loads `.env` directly, so it uses the same `DATABASE_URL` and `DIRECT_URL` as the rest of local development.

Example `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
PORT=4000
VITE_API_BASE_URL="http://localhost:4000"
```

## Run locally

Run the API:

```bash
npm run dev:api
```

Run the web app in a second terminal:

```bash
npm run dev:web
```

Or run both together:

```bash
npm run dev
```

Default local URLs:

- Web: `http://localhost:5173`
- API: `http://localhost:4000`

## Vercel deployment path

Northstar is set up for a simple Vercel deployment:

- the Vite web app builds to `apps/web/dist`
- production web requests call the API at `/api`
- the Fastify app is shared between local dev and the serverless entrypoint
- Prisma migrations run during Vercel builds
- Prisma targets hosted Postgres instead of local SQLite

Deployment files in place:

- `vercel.json`
- `api/[...path].ts`
- `apps/api/src/app.ts`
- `docs/DEPLOY_VERCEL.md`
- `prisma/migrations/0001_init/migration.sql`

Exact Vercel env vars:

- `DATABASE_URL`
- `DIRECT_URL`

Optional local-only env vars:

- `PORT`
- `VITE_API_BASE_URL`

Exact deployment steps live in [`docs/DEPLOY_VERCEL.md`](./docs/DEPLOY_VERCEL.md).

The current Vercel build command is:

```bash
npx prisma migrate deploy && npx prisma generate && npm run build
```

This means each deploy will:
- apply checked-in migrations
- generate Prisma client
- build the API and web app

## Exact test flow

### 1. Health check

```bash
curl -s http://localhost:4000/health
```

Expected:

```json
{"ok":true}
```

### 2. Confirm seeded project exists

```bash
curl -s http://localhost:4000/projects
```

Expected:

- one seeded project using `https://linear.app`

### 3. Inspect seeded dashboard

```bash
PROJECT_ID=$(curl -s http://localhost:4000/projects | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).projects[0].id))')
curl -s http://localhost:4000/projects/$PROJECT_ID/dashboard
```

Expected:

- company summary exists
- tasks exist
- one approval item exists
- one blog brief artifact exists
- comments are included in the dashboard payload

### 4. Create a manual task

```bash
curl -s -X POST http://localhost:4000/projects/$PROJECT_ID/tasks \
  -H 'Content-Type: application/json' \
  -d '{
    "title":"Refine homepage CTA for demo requests",
    "description":"Tighten the CTA language and placement so qualified visitors understand the next step faster.",
    "type":"HOMEPAGE_COPY_SUGGESTION",
    "impact":7,
    "effort":4,
    "confidence":6,
    "goal_fit":8
  }'
```

Expected:

- task is created
- task receives a score
- task rationale explains why it exists, why it has its priority, and what business outcome it supports

### 5. Move a task between Kanban states

```bash
TASK_ID=$(curl -s http://localhost:4000/projects/$PROJECT_ID/dashboard | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).dashboard.tasks[0].id))')
curl -s -X POST http://localhost:4000/projects/$PROJECT_ID/tasks/$TASK_ID/status \
  -H 'Content-Type: application/json' \
  -d '{"status":"IN_PROGRESS"}'
```

Expected:

- task status changes
- movement history is recorded

### 6. Approve the seeded blog brief

```bash
APPROVAL_ID=$(curl -s http://localhost:4000/projects/$PROJECT_ID/dashboard | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).dashboard.approvals[0].id))')
curl -s -X POST http://localhost:4000/approvals/$APPROVAL_ID/decision \
  -H 'Content-Type: application/json' \
  -d '{"decision":"APPROVED"}'
```

Expected:

- approval moves to approved
- linked artifact becomes approved
- linked task moves to `DONE`

## Pilot calibration set

Northstar is currently being calibrated against:

- `Moongate`
- `Gridlock`
- `Nightwatch QA`
- `Northstar` itself

Product principle:

- if Northstar cannot create useful growth work for Northstar itself, the feature is not ready

## Known weaknesses in v1

- site ingestion is heuristic and can still sound generic on some websites
- repo-first understanding depends heavily on README wording
- generated tasks are more specific than before but still rules-based, not model-planned
- blog brief generation is useful but still template-based
- manual task prioritization depends on user-entered scoring inputs

## TODO markers

Search for `TODO(v2)` in the codebase.
