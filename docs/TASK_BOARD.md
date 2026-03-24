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

- Fix repo-first identity extraction so `Northstar` does not misclassify itself
- Ground company summaries in the buyer-facing product promise before deriving ICP
- Tighten task-template selection for repo-first products
- Make social and competitor-style tasks more outcome-specific
- Tighten the v1 copy pass so onboarding and board language are consistently founder-facing
- Add project reuse on re-onboarding
- Add stronger error and empty states in the web app
- Add a demo script and QA checklist

## In Progress

- No active implementation task yet

## Blocked

- Final launch ICP is not confirmed yet
- Real artifact generation provider is not chosen yet
- Deployment target is not chosen yet
- Northstar self-dogfood identity is now corrected, but live demo validation still needs to stay tight

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
- `Northstar` added as an official dogfood workspace
- Pilot calibration audits completed for:
  - `Moongate`
  - `Gridlock`
  - `Nightwatch QA`
  - `Northstar`
- Northstar dogfood findings documented in `docs/NORTHSTAR_DOGFOOD.md`
- Controller/subagent repo rule added in `AGENTS.md`

## Calibration notes

- `Moongate`
  - Stronger crypto-native understanding
  - Still needs a clearer split between trader growth and integration-led messaging
- `Gridlock`
  - Stronger consumer/F1 framing
  - Still needs more explicit activation vs retention outcomes in task wording
- `Nightwatch QA`
  - Stronger repo-first technical B2B framing
  - Still needs less generic social-task wording
- `Northstar`
  - Strongest quality gate and current miss
  - Now correctly reads as a founder operating system
  - Still needs final demo polish and ongoing validation as the product evolves
