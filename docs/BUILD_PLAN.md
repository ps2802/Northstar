# Northstar Build Plan

Status date: March 27, 2026

This plan now tracks reality, not an earlier future-phase wishlist.

## Launch assumptions

- target launch is an early founder pilot with strong demo readiness
- the board stays the main product surface
- Northstar remains single-founder-first for this launch
- founder approval is required before any publish/send/finalize step
- WhatsApp/Telegram, autonomous delivery, and team collaboration stay out of scope

## Wave status

### Wave 1: audit calibration

Status: implemented

Shipped:

- Northstar self-dogfood now resolves to the founder-OS thesis instead of repo-first QA language
- pilot audits are in place for Northstar, Moongate, Gridlock, and Nightwatch QA
- task rationale structure is explicit and usable in demos

Still weak:

- site understanding is still heuristic and README-sensitive
- category language can still drift if the source website is thin or noisy

### Wave 2: founder-OS shell

Status: implemented for dogfood and pilot demos

Shipped:

- staged onboarding with founder follow-up questions
- onboarding draft persistence and dashboard re-entry
- left navigation, compact top bar, and board / Northstar / founder / approvals surfaces
- command-center overview, basic matrix, manual task intake, comments, and movement history

Still weak:

- auth is still a lightweight local session foundation
- project reuse is not yet a real account-aware onboarding flow

### Wave 3: platform foundation

Status: materially implemented, but still demo-grade in execution

Shipped:

- Postgres Prisma schema plus checked-in migrations
- persisted founder intake and planning context
- workspace session records
- persisted provider configs and integration connection records
- approval decisions, revision records, and execution-job records
- live API-backed flows for onboarding, task updates, approvals, revisions, providers, and integrations

Remaining:

- replace local session auth with real Google/email auth
- validate external credentials against real providers
- add a separate worker/retry layer for queued execution jobs
- move from mock execution to provider-backed execution for supported artifact types

### Wave 4: CRM and research expansion

Status: shell implemented, workflow still mostly mocked

Shipped:

- CRM and research sections in the command center
- CRM/research task categories and execution framing
- seeded CRM contacts and research notes for demo walkthroughs

Remaining:

- persist CRM contacts and research notes in live product flows
- support real outreach/research drafts with send-ready state tied to actual integrations
- add response tracking and follow-up loops

### Wave 5: hardening and launch pass

Status: partially implemented

Shipped:

- Vercel deployment path with hosted Postgres
- deploy and demo runbooks
- end-to-end validation for onboarding, manual task creation, asset generation, approval rejection, and comment persistence

Remaining:

- real workspace ownership and secure isolation through auth
- observability, failure recovery, and operator-facing job debugging
- final pilot QA across Northstar, Moongate, Gridlock, and Nightwatch QA on deployed infrastructure

## Current priority order

1. Keep Northstar-on-Northstar as the release gate for company understanding and task quality.
2. Replace mock execution for the current supported asset set with a real provider path.
3. Replace the local session/auth foundation with real Google or email auth.
4. Decide whether CRM/research needs live persistence for the first pilot or should stay demo-only.
5. Run the deployment + QA pass on hosted Postgres before any external pilot.

## Launch exit criteria

- Northstar still identifies itself as a founder operating system after repo and README changes
- supported artifact types generate through a real provider path
- approvals, revisions, comments, and task transitions work on deployed infrastructure
- auth and workspace ownership are real enough to protect pilot data
- docs, task board, and demo runbook all describe the same product truth
