# Northstar Task Board

Status date: March 27, 2026

## Current truth

- Wave 1 and Wave 2 are no longer backlog items. Audit calibration and the founder-OS shell are implemented enough for dogfood and pilot demos.
- Wave 3 is partly real: persistence, approvals, revisions, providers, integrations, and execution-job records are shipped, but execution is still mock-driven.
- Wave 4 is partly real: CRM and research exist as product surfaces and seeded demo flows, not as live end-to-end systems.
- Wave 5 is partly real: deployment path and runbooks exist, but real auth, secure ownership, and production-grade execution reliability are still open.

## Done

- Northstar self-audit corrected the product thesis from QA drift to founder-OS positioning
- pilot calibration audits completed for Northstar, Moongate, Gridlock, and Nightwatch QA
- staged onboarding, founder follow-up capture, dashboard re-entry, and board-first shell shipped
- task rationale, comments, movement history, approvals, rejection notes, and revision queue shipped
- provider setup, integration setup, and persisted workspace configuration shipped
- Postgres Prisma schema, checked-in migrations, Vercel deploy path, and runbooks shipped
- live API validation completed for onboarding, manual task creation, v1 asset generation, approvals, and comments

## Active priorities

- replace `MockFounderExecutor` with a real provider-backed path for supported v1 asset types
- replace the local session foundation with real Google/email auth
- validate provider/integration credentials against real downstream systems
- decide whether CRM and research need live persistence for the first external pilot
- run the full deployed QA pass on hosted Postgres using Northstar as the first workspace

## Remaining or mocked

- execution still uses mocked generation logic
- unsupported task types still block instead of executing
- integrations mostly persist state without real delivery or syncing depth
- CRM contacts and research notes are still seeded/demo data in the web app
- no worker/retry daemon yet for queued execution jobs
- no team collaboration layer yet

## Decisions still needed

- which generation provider is the default live path
- which auth path ships first: Google or email magic link
- whether first pilot scope includes live CRM/research records or keeps those surfaces demo-only

## Test next

- Northstar-on-Northstar after any README or positioning changes
- provider-backed generation, approval, rejection, and revision resubmission on deployed infrastructure
- hosted Postgres deploy + migrate + seed + dashboard re-entry flow
- provider/integration connect, disconnect, and sync behavior with real credentials
