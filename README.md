# Northstar

Northstar is a board-first operating system for non-technical founders.

A founder connects a website, adds business context, answers follow-up questions, and lands in a dashboard where Northstar separates agent work from founder work. The Kanban board is the main product surface.

## Current product truth

- Northstar is a strong demo and a promising internal alpha. It is not yet a strong external v1.
- The board is the main product surface. Founder review stays in the loop before anything moves forward.
- `blog_brief` is the only live generation path exposed in the founder product. Other task types are planning-only in this build.
- Founder access now uses server-issued workspace sessions tied to founder email plus workspace website, not a local founder-session toggle.
- Execution-provider state is validated on save for the supported OpenRouter/OpenAI-compatible path. Supported API-key integrations now return explicit `connected`, `pending`, `error`, or `not set up` truth instead of implying success from saved credentials alone.
- Sample, cached stale, fallback understanding, and incomplete context states are explicitly marked in the UI.
- All non-health product routes require a founder session header. Public bootstrap is limited to onboarding.

Audit references:

- [`docs/audits/NORTHSTAR_SELF_AUDIT.md`](./docs/audits/NORTHSTAR_SELF_AUDIT.md)
- [`docs/audits/MOONGATE_CALIBRATION.md`](./docs/audits/MOONGATE_CALIBRATION.md)
- [`docs/audits/GRIDLOCK_CALIBRATION.md`](./docs/audits/GRIDLOCK_CALIBRATION.md)
- [`docs/audits/NIGHTWATCH_QA_CALIBRATION.md`](./docs/audits/NIGHTWATCH_QA_CALIBRATION.md)

## What works today

- staged website onboarding with founder follow-up questions
- company summary, ICP inference, opportunity detection, and seed task generation
- priority scoring with rationale-rich tasks
- board, approvals, connections, analytics summary, and settings surfaces
- manual task creation, task comments, and movement history
- live draft generation for `blog_brief`
- provider-backed `blog_brief` generation through a validated OpenRouter/OpenAI-compatible path
- approval and rejection flow with revision notes and reruns
- founder comments, rejection notes, and revision requests now feed back into Northstar's planning context so future prioritization and revisions adapt
- onboarding can restore an existing workspace session before creating a duplicate workspace
- provider setup, provider validation, integration setup, and persisted workspace configuration with masked display fields
- protected-stack QA coverage for authenticated board, approvals, campaigns, analytics, settings, and live `blog_brief` execution
- agent-stack wrapper selection for identity, execution, browser, search, memory, payments, SaaS access, and voice
- demo CRM and research panels

## What is still mocked or weak

- every task type except `blog_brief` is planning-only
- stronger verified identity flows like OAuth or magic-link email auth are still not present
- only the currently supported integration checks validate live downstream truth; broader delivery and validation depth are still incomplete
- agent-stack wrappers are preference selections only, not live vendor integrations or validated capability rails
- CRM/research panels are still demo-grade rather than end-to-end live workflows

## Repo layout

- `apps/web`: React + Vite founder command center
- `apps/api`: Fastify API and orchestration layer
- `packages/types`: shared domain models
- `packages/site-ingestion`: site ingestion and summary logic
- `packages/task-engine`: task generation, scoring, and board transitions
- `packages/agent-core`: planner contracts and provider-backed `blog_brief` execution
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
