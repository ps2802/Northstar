# Northstar Task Board

This is the active build board for the project.

## Backlog

- Define launch ICP and sharpen product positioning
- Improve seeded demo data and homepage/demo copy
- Rework onboarding to reuse an existing project instead of always creating a new workspace
- Add persistent comments and richer task history in the UI
- Add better board ordering and explicit board-level filters
- Replace mocked blog-brief execution with provider-backed generation
- Add revision loop for rejected artifacts
- Add queueing for long-running agent execution
- Add basic auth and workspace isolation
- Prepare production deployment config and runbook

## Next Up

- Tighten the v1 copy pass so onboarding and board language are consistently founder-facing
- Calibrate onboarding and task generation against `Moongate`
- Calibrate onboarding and task generation against `Gridlock`
- Calibrate onboarding and task generation against `Nightwatch QA`
- Add project reuse on re-onboarding
- Add stronger error and empty states in the web app
- Add a demo script and QA checklist

## In Progress

- No active implementation task yet

## Blocked

- Final launch ICP is not confirmed yet
- Real artifact generation provider is not chosen yet
- Deployment target is not chosen yet
- Need live validation passes for:
  - `https://www.moongate.one/`
  - `https://joingridlock.com/`
  - `https://github.com/ps2802/nightwatch-qa`

## Done

- Monorepo scaffolded
- Shared schema and types created
- Website onboarding flow built
- Site ingestion stub built
- Company summary flow built
- Task generation and Kanban UI built
- Manual task creation, scoring, and reprioritization built
- Blog brief generation and approval flow built
- Milestones 1 to 5 polished and validated
- Repo pushed to GitHub at `ps2802/Northstar`
- Initial pilot calibration set identified:
  - `Moongate`
  - `Gridlock`
  - `Nightwatch QA`
