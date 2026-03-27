# Northstar

Northstar is a board-first operating system for non-technical founders.

A founder connects a website, adds business context, answers follow-up questions, and lands in a dashboard where Northstar separates agent work from founder work. The Kanban board is the main product surface.

## Current launch assumptions

- Launch target: early founder pilot with strong demo readiness
- Product shape: single-founder-first, board-first, approval-first
- Human control: nothing is sent, published, or finalized without founder review
- Non-goals for this launch: autonomous publishing, WhatsApp/Telegram adapters, team collaboration

## Wave status

### Wave 1 / 2 audit truth

- Northstar now reads itself and pilot companies correctly as a founder operating system instead of drifting into QA or generic B2B language.
- Task rationale is now explicit about why a task exists, why it has its current priority, and what business outcome it supports.
- The founder-OS shell is real: staged intake, dashboard re-entry, left nav, approvals, founder-vs-Northstar framing, and board movement history are implemented.
- Audit quality still depends on lightweight site ingestion, README/repo signal, and rules/templates, so company understanding can still drift if source inputs are weak.

Audit references:

- [`docs/audits/NORTHSTAR_SELF_AUDIT.md`](./docs/audits/NORTHSTAR_SELF_AUDIT.md)
- [`docs/audits/MOONGATE_CALIBRATION.md`](./docs/audits/MOONGATE_CALIBRATION.md)
- [`docs/audits/GRIDLOCK_CALIBRATION.md`](./docs/audits/GRIDLOCK_CALIBRATION.md)
- [`docs/audits/NIGHTWATCH_QA_CALIBRATION.md`](./docs/audits/NIGHTWATCH_QA_CALIBRATION.md)

### Wave 3: platform foundation

Implemented:

- Postgres-backed Prisma schema and checked-in migrations
- persisted founder intake and planning context
- local workspace sessions with persisted tokens
- execution provider config and active-provider switching
- integration connection records with connect, sync, and disconnect state
- approval decisions, revision requests/submissions, task comments, and execution-job records
- live API-backed onboarding, task updates, approvals, revisions, and provider/integration settings

Still remaining:

- real Google/email auth instead of the local session foundation
- provider-backed execution for the currently supported asset types
- external credential validation and real downstream delivery
- separate worker/retry daemon for queued execution jobs

### Wave 4: CRM and research

Implemented:

- CRM and research surfaces in the dashboard shell
- CRM/research task categories and seeded demo data
- research, outreach, and CRM execution direction in the command center

Still remaining:

- real CRM contact persistence in the product flow
- real research note capture and synthesis persistence
- send tracking, reply handling, and live outreach execution

### Wave 5: hardening and launch

Implemented:

- Vercel deployment path with hosted Postgres
- Prisma deploy flow for production builds
- deployment and demo runbooks
- live API validation for onboarding, manual tasks, asset generation, approvals, and comments

Still remaining:

- real workspace ownership and secure isolation through auth
- observability and failure handling beyond basic job status records
- final pilot QA pass across Northstar, Moongate, Gridlock, and Nightwatch QA

## What works today

- staged website onboarding with founder follow-up questions
- company summary, ICP inference, opportunity detection, and seed task generation
- priority scoring with rationale-rich tasks
- board, Northstar, founder, approvals, and connections surfaces
- manual task creation, task comments, and movement history
- v1 draft generation for `blog_brief`, social post sets, and founder-facing copy suggestions
- approval and rejection flow with revision notes and reruns
- provider setup, integration setup, and persisted workspace configuration
- demo CRM and research panels

## What is still mocked or weak

- execution still runs through `MockFounderExecutor`
- unsupported task types block instead of executing
- auth is not real identity yet
- many integrations persist connection state but do not deliver real downstream work
- CRM/research panels are still demo-grade rather than end-to-end live workflows

## Repo layout

- `apps/web`: React + Vite founder command center
- `apps/api`: Fastify API and orchestration layer
- `packages/types`: shared domain models
- `packages/site-ingestion`: site ingestion and summary logic
- `packages/task-engine`: task generation, scoring, and board transitions
- `packages/agent-core`: planner contracts and mocked v1 execution
- `prisma/schema.prisma`: Postgres schema for local and deployed environments

## Local setup

Install dependencies and point `.env` at Postgres:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
```

Optional demo seed:

```bash
npm run db:seed
```

Run locally:

```bash
npm run dev
```

Default local URLs:

- Web: `http://localhost:5173`
- API: `http://localhost:4000`

## Deployment

Northstar is set up for Vercel + hosted Postgres. Use:

- [`docs/DEPLOY_VERCEL.md`](./docs/DEPLOY_VERCEL.md)
- [`docs/DEMO_RUNBOOK.md`](./docs/DEMO_RUNBOOK.md)
