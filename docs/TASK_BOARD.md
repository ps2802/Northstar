# Northstar Task Board

Status date: March 28, 2026

## Current truth

- Northstar is a strong demo and a promising internal alpha.
- Northstar is not yet a strong external v1.
- The founder product now tells the truth about what is live, what is cached, and what is only sample or fallback state.
- `blog_brief` is the only live execution path in the founder UI.
- All other task types remain planning-only for this build.

## Done

- founder-facing build and wave scaffolding removed from the main product shell
- founder-facing connection language changed to saved or unverified state
- non-live workspace states called out directly in the UI
- risky mutations blocked for sample, cached stale, unauthenticated, and fallback-understanding workspaces
- founder access now comes from server-issued workspace sessions tied to founder email plus workspace website
- non-health product routes now require a founder session header, with only onboarding and access bootstrap left public
- backend serialization now returns masked display fields instead of raw provider or connection payloads
- Connections now includes persisted agent-stack wrapper preferences instead of keeping external tool choices out of product truth
- founder feedback now updates stored planning context so future prioritization and revision guidance improve from comments and change requests

## Active priorities

- replace `MockFounderExecutor` behind `blog_brief` with a real provider-backed path
- validate provider and integration credentials against real downstream systems
- harden execution-job failure handling and recovery
- run deployed QA against the live session-protected stack

## Remaining or mocked

- `blog_brief` execution still uses mocked generation logic
- integrations mostly persist saved state without real delivery or validation depth
- agent-stack wrapper choices are stored as preferred vendors only; they do not yet provision or validate those external systems
- CRM contacts and research notes are still seeded/demo data in the web app
- no worker/retry daemon yet for queued execution jobs
- no team collaboration layer yet
- stronger verified identity flows like OAuth or magic-link email auth are still not present

## Test next

- Northstar-on-Northstar after trust-copy changes
- fresh load with no session should land on onboarding, not a load error
- cached stale workspace should stay read-only with explicit banners
- live `blog_brief` execution, approval, and rejection should still work end to end
- session-scoped route access should reject cross-workspace requests
