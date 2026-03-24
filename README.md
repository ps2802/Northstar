# Founder OS v1

Founder OS v1 is a Kanban-first operating system for non-technical founders.
The current demo flow is intentionally tight:

1. enter a website URL
2. analyze the website
3. generate a company summary and first backlog
4. review and move work in the Kanban board
5. add manual tasks
6. review a generated blog brief in the approval queue

## Repo layout

- `apps/web`: React + Vite command center
- `apps/api`: Fastify API and orchestration
- `packages/types`: shared domain models
- `packages/site-ingestion`: website ingestion and summary logic
- `packages/task-engine`: task generation, scoring, and transitions
- `packages/agent-core`: planner and mocked blog-brief execution
- `prisma/schema.prisma`: SQLite schema

## Local setup

Install dependencies:

```bash
npm install
```

Generate Prisma client:

```bash
npx prisma generate
```

Sync the SQLite schema:

```bash
npx prisma db push --accept-data-loss --skip-generate
```

Seed demo data:

```bash
npm run db:seed
```

## Important note about `.env`

Because this workspace path contains a space, `.env` currently uses an absolute SQLite path for this machine.
If you move the repo, update `DATABASE_URL` in `.env` to the new absolute `file:` path for `prisma/dev.db`.

Example format:

```env
DATABASE_URL="file:/absolute/path/to/your/repo/prisma/dev.db"
PORT=4000
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
- task rationale explains why it exists, why it has its priority, and what outcome it supports

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

## What is real in v1

- website ingestion with lightweight crawling
- company summary generation
- task generation and scoring
- Kanban board states
- manual task creation
- approval flow
- seeded blog brief artifact

## What is mocked in v1

- agent execution is mocked
- only `blog_brief` is executable
- no publishing
- no WhatsApp / Telegram / bot adapters yet
- no auth yet
- no background queue yet

## Known weaknesses in v1

- site ingestion is heuristic and can still sound generic on some websites
- company names derived from titles can still be messy on noisy homepages
- generated tasks are more specific than before but still rules-based, not model-planned
- manual task prioritization depends on user-entered scoring inputs
- approval flow is solid for the demo but only covers a single artifact type

## TODO markers

Search for `TODO(v2)` in the codebase.
