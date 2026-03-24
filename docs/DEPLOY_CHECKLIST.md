# Northstar Live Deployment Checklist

## Before Vercel

- Branch to deploy: `codex/northstar`
- Repo is pushed to GitHub
- Prisma is Postgres-first
- Checked-in migration exists in `prisma/migrations/0001_init/migration.sql`
- Vercel build command is already defined in `vercel.json`

## Manual Vercel setup

1. Open Vercel.
2. Click `Add New...` -> `Project`.
3. Import `ps2802/Northstar`.
4. Select branch `codex/northstar` for the first live demo deploy.
5. Keep the root directory at the repo root.
6. Create `Vercel Postgres` from the project or attach one if already created.
7. In project environment variables, set:
   - `DATABASE_URL`
   - `DIRECT_URL`
8. Use the pooled Prisma/Postgres URL for `DATABASE_URL`.
9. Use the direct non-pooled Postgres URL for `DIRECT_URL`.
10. Deploy.

## Deployment should run

```bash
npx prisma migrate deploy && npx prisma generate && npm run build
```

## Immediate post-deploy checks

1. Open `https://<your-domain>/api/health`
2. Confirm `{"ok":true}`
3. Open the app root
4. Confirm onboarding page loads

## Northstar smoke test

1. Onboard `https://github.com/ps2802/Northstar`
2. Confirm the summary reads Northstar as a Kanban-first operating system for non-technical founders
3. Confirm ICP is founder-facing, not QA-facing
4. Confirm opportunities mention trust, proof, board-first positioning, or founder operating model
5. Confirm top backlog includes the homepage narrative task and the blog brief task
6. Open the top task drawer
7. Confirm rationale reads cleanly and the board trail renders
8. Open the generated brief
9. Confirm the brief reads opinionated and board-first
10. Approve the brief
11. Confirm the linked task moves to `Done`

## Gridlock smoke test

1. Onboard `https://joingridlock.com/`
2. Confirm the summary reads as an F1 prediction / consumer sports product
3. Confirm ICP sounds like F1 fans, not generic B2B buyers
4. Confirm opportunities reflect race-weekend, activation, or season-loop thinking
5. Confirm top backlog feels consumer/event-driven
6. Open one top task
7. Confirm rationale is specific to Gridlock rather than generic SEO language

## If something fails

- `Build fails before deploy finishes`
  - re-check `DATABASE_URL` and `DIRECT_URL`
- `/api/health` fails
  - confirm the API serverless route is deployed and migrations succeeded
- onboarding works but data does not persist
  - confirm Vercel Postgres is attached and env vars point to the hosted database, not a local or expired value
- summaries or tasks feel off
  - still demo Northstar first, then Gridlock as backup
