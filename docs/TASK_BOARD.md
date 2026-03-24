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

- Tighten the generated Northstar brief further so the opening goal line reads less machine-shaped
- Push the latest hardening commits to GitHub
- Verify the Vercel deployment path and document the remaining production database gap
- Add project reuse on re-onboarding
- Add stronger error and empty states in the web app

## In Progress

- Final demo hardening for `Northstar` as the primary live demo
- Gridlock preparation as the secondary live demo case

## Blocked

- Final launch ICP is not confirmed yet
- Real artifact generation provider is not chosen yet
- Deployment path is structurally ready, but production database migration still needs to be decided
- Northstar self-dogfood identity is now corrected, and the Vercel path is ready for documentation-only readiness work

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
- Public naming standardized around `Northstar`
- Northstar homepage task wording hardened for the demo
- Northstar blog brief quality hardened for the demo
- Northstar demo runbook added in `docs/DEMO_RUNBOOK.md`
- Northstar task drawer UX hardened with board trail and clearer decision surface
- Northstar artifact review UX hardened for founder approval clarity
- Fallback board state now preserves task movement history

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
