# Northstar Vercel Deployment

This is the smallest production-sensible deployment path for Northstar.

## Recommended database

Use **Vercel Postgres**.

Why this path:
- persistent hosted Postgres instead of local SQLite
- works cleanly with Prisma
- keeps web, API, and database in the same Vercel-centered demo setup
- lowest-friction path for a real demo environment

If you prefer, the same setup also works with Neon. The app itself expects only `DATABASE_URL` and `DIRECT_URL`.

## Required environment variables

Set these in Vercel for `Preview` and `Production`:

- `DATABASE_URL`
  - pooled Postgres connection string used by the running app
  - for Vercel Postgres, use the Prisma/pooling connection string
- `DIRECT_URL`
  - direct non-pooled Postgres connection string used by Prisma migrations
  - for Vercel Postgres, use the non-pooling connection string

Optional local-only variables:

- `PORT`
  - defaults to `4000`
- `VITE_API_BASE_URL`
  - local web override for `http://localhost:4000`
  - not needed on Vercel because the web app already uses `/api` in production

## Exact Vercel steps

1. Create a Vercel Postgres database.
2. Copy the pooled Prisma connection string into `DATABASE_URL`.
3. Copy the non-pooled direct connection string into `DIRECT_URL`.
4. Import the `ps2802/Northstar` repo into Vercel.
5. Keep the root directory at the repo root.
6. Let Vercel use the repo `vercel.json`.
7. Deploy.

The Vercel build now runs:

```bash
npx prisma migrate deploy && npx prisma generate && npm run build
```

That means each deploy will:
- apply checked-in Prisma migrations
- generate the Prisma client
- build the API and web app

## First deploy smoke test

After the first successful deploy:

1. Open `https://<your-vercel-domain>/api/health`
2. Confirm it returns:

```json
{"ok":true}
```

3. Open the web app.
4. Onboard `https://github.com/ps2802/Northstar`.
5. Confirm:
- company summary loads
- backlog renders
- task drawer opens
- artifact review works
- approval moves the linked task to `Done`

## Seeding a demo database

If you want a pre-seeded remote demo environment, run this locally against the hosted database:

```bash
DATABASE_URL="<pooled-url>" DIRECT_URL="<direct-url>" npm run db:seed
```

That will clear the current demo data and seed the default workspace.

## Production notes

- SQLite is no longer the production path.
- Prisma migrations now assume Postgres.
- For a small live demo, this is production-sensible.
- For heavier usage later, the next hardening step would be background jobs plus a more durable execution model.
