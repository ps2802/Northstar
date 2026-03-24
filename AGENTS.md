# AGENTS.md

## Multi-Agent Operating Rule

Use a controller/subagent model for meaningful work in this repo.

### Controller
- The main Codex thread is the controller.
- The controller owns prioritization, task decomposition, conflict resolution, final integration, and final reporting.
- The controller should prefer parallel subagents for bounded work when the task is independently executable and reviewable.

### Subagents
- Spawn a dedicated subagent for a meaningful assigned task when the task is:
  - bounded
  - independently executable
  - reviewable in isolation
- Do not spawn subagents for:
  - trivial edits
  - tightly coupled dependent steps
  - overlapping tiny file changes
- Prefer parallel subagents for bounded work. Prefer a single controller for prioritization, conflict resolution, and final integration.

### Good subagent use cases
- pilot company audits
- onboarding and company summary quality review
- task generation quality review
- artifact generation for a specific task
- isolated frontend work
- isolated backend work
- docs and deployment preparation
- testing and validation

### Required subagent output
Every spawned subagent must report:
1. what it did
2. files changed
3. what is still mocked or weak
4. what should be tested next

## Product Principles
- The kanban is the main product surface.
- Every task must explain why it exists.
- Every task must explain why it has its current priority.
- Human approval exists before publishing.
- If Northstar cannot create useful growth work for Northstar itself, the feature is not ready.
