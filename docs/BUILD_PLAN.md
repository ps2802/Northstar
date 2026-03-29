# Northstar Build Plan

Status date: March 28, 2026

Historical rebuild waves are complete enough for demo use. The current phase is a truth and trust pass, not a redesign pass.

## Current product truth

- strong demo
- promising internal alpha
- not yet a strong external v1
- board-first, approval-first, single-founder-first
- `blog_brief` is the only live execution path in the founder product
- other task types remain planning-only in this build
- the Connections surface now includes wrapper selection for the external agent stack categories Northstar may route through later

## Batch 1 P0 shipped

- removed build and wave scaffolding from the founder navigation and founder shell
- narrowed founder-facing execution truth to `blog_brief` only
- marked sample, cached stale, fallback understanding, and incomplete states explicitly in the founder UI
- locked risky mutations when the workspace is cached, unauthenticated, sample-only, or still using fallback understanding
- changed connection language from fake “connected” truth to saved or unverified state
- replaced local founder-session UI behavior with server-issued workspace access sessions
- founder onboarding now requires founder email and restores existing workspace access before creating a duplicate workspace
- required founder session headers on all non-health product routes, with only onboarding and access bootstrap kept public
- scoped project, approval, revision, provider, and connection access to the session workspace
- stopped returning raw provider and connection payloads from backend serialization
- added persisted wrapper preferences for the agent stack capability categories without pretending those vendors are already wired live
- made founder comments, rejection notes, and revision requests update founder planning context so Northstar adapts to user feedback over time

## External pilot blockers still open

- `blog_brief` still runs through `MockFounderExecutor`
- provider and integration validation is still not real downstream verification
- execution jobs still need stronger failure recovery than the current inline flow
- stronger verified identity flows like OAuth or magic-link email auth are still not present

## Batch 2, explicitly later

- real provider-backed execution behind the single supported live path
- stronger execution-job recovery and retry boundaries
- live CRM or research persistence
- broader execution types, analytics depth, or campaign expansion
