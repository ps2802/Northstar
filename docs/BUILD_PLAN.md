# Northstar Build Plan

This is the pragmatic end-to-end build plan for taking Northstar from the current v1 demo to a production-ready founder operating system.

## Working definition of "e2e"

For this project, end to end means:

1. a founder can create a workspace and connect a website
2. the platform can analyze the website and generate a useful operating backlog
3. the Kanban board is the primary control surface
4. the system can generate and route founder-facing artifacts for approval
5. the platform supports persistent projects, auth, and basic team-safe behavior
6. the app can be deployed and demoed reliably

## Timeline

### Phase 1: Stabilize v1 demo
Estimated: 4 to 6 days

Goals:
- clean up the current v1 flow
- remove weak demo edges
- make onboarding, scoring, and approval feel dependable
- tighten copy and seeded demo output

Deliverables:
- stronger onboarding summaries
- more specific task generation
- better board defaults and safer scoring
- cleaner README and demo steps
- bug pass across API and UI

### Phase 2: Productize the core workflow
Estimated: 7 to 10 days

Goals:
- make the current workflow multi-project and persistent in a more realistic way
- stop treating each onboarding run as a brand new world
- add clearer state management and board-level actions

Deliverables:
- workspace/project reuse on re-onboarding
- saved board filters and stable task ordering
- better task history and comments persistence
- clearer board actions and founder controls

### Phase 3: Make execution believable
Estimated: 10 to 14 days

Goals:
- upgrade from mocked internals toward reliable execution while keeping scope tight
- improve artifact generation quality
- add structured approval and rerun behavior

Deliverables:
- provider-backed artifact generation for blog briefs
- retry and revision flows
- better prompt and artifact templates
- queue-friendly execution layer for long-running work

### Phase 4: Platform hardening
Estimated: 7 to 10 days

Goals:
- make the app safe to run with real users
- add basic production expectations without overbuilding

Deliverables:
- simple auth
- per-workspace/project isolation
- deployment config
- environment handling
- logging and minimal observability
- error boundaries and API failure handling

### Phase 5: Launch-ready pass
Estimated: 5 to 7 days

Goals:
- make the demo investor/customer ready
- close the highest-risk UX and reliability gaps

Deliverables:
- seeded demo workspace improvements
- visual polish pass
- QA checklist
- deployment runbook
- founder demo script

## Total estimate

- Fast path: 5 to 7 weeks
- Safer path: 6 to 8 weeks

That assumes we keep scope disciplined and do not add full social publishing, full adapters, or broad multi-agent execution during this pass.

## Non-goals for this buildout

- paid ads features
- full WhatsApp/Telegram integrations right away
- enterprise auth and permissions
- autonomous publishing in early phases
- broad multi-channel campaign automation before the board workflow is solid

## What I need from you

### Must-have decisions
- the single ideal customer profile for the first launch
- the one artifact type after blog brief that should matter most
- whether the first real user is you only or a small set of external testers
- whether this should stay single-founder-first or support lightweight team collaboration in the next phase

### Brand/product inputs
- final product name confirmation: `Northstar`
- product positioning sentence
- 3 to 5 example customer websites you care about most
- 2 to 3 examples of output quality you consider "great"

### Delivery inputs
- preferred deployment target: Vercel, Render, Railway, Fly, or other
- preferred model/provider for artifact generation once we move beyond mocks
- whether you want me to optimize first for investor demos or early customer pilots

## Recommended working mode

- we keep one repo-level Kanban updated in `docs/TASK_BOARD.md`
- we work in tight milestones
- after each milestone I summarize:
  - what changed
  - what works
  - what is still stubbed
  - what you should test next
