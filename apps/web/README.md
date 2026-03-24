# Northstar Web

Frontend command center for the non-technical founder platform.

## What is in v1
- Website onboarding
- Company summary extracted from a website URL
- Kanban-first backlog
- Task detail drawer
- Add-task form
- Approval queue
- Generated blog brief viewer
- Mocked API/data layer with localStorage persistence

## Run

```bash
cd apps/web
npm install
npm run dev
```

## Build

```bash
cd apps/web
npm run build
```

## Notes
- The UI is intentionally organized around the Kanban board rather than a generic dashboard.
- The data layer lives in `src/lib/api.ts` so it can be swapped with backend endpoints later.
- TODO: wire the app to the real API, add drag-and-drop board movement, and replace the mocked ingestion with live crawling.
