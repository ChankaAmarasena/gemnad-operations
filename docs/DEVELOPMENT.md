# Development and deployment

The canonical stack is the Sites Vinext starter. Keep its `sites()` integration in vite.config.ts and build/sites-worker.ts.

1. Run the Sites `install-dependencies.mjs` helper from this directory.
2. `npm run typecheck` and `npm test`.
3. Run the Sites `build-site.mjs` helper.
4. For an empty local DB only, apply `drizzle/0000_cooing_tomas.sql`:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_cooing_tomas.sql
```

5. `npm run dev`, then visit its loopback URL. Local sign-in is intentionally a fake development identity. Never deploy local DB state.
6. Obtain a Site source credential for the existing project ID; pass it to `site-workflow.mjs` via hidden stdin with ordered check/build commands and an absolute deployment archive path. It owns Git commits and pushes.
7. Publish the returned pushed commit/archive using the matching private/native Sites operation; retain saved/deployment IDs and poll only nonterminal deployments.

The current test suite exercises domain boundaries, SQL triggers, idempotent imports, and the real API handlers against an in-memory SQLite D1 adapter. It checks authentication, cross-user denial, cutoff enforcement, role changes, deactivation, CSRF origin checks and stale writes. It does not emulate the full hosted identity gateway or real teammate accounts.

If moving to Next.js + Supabase + Vercel later: replace Sites identity with Supabase server sessions; create PostgreSQL migrations with RLS and corresponding transaction/audit functions; change the D1 adapter; configure deployment secrets server-side. Do not treat the current D1 SQL or permission implementation as PostgreSQL RLS.
