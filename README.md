# Gemnad Operations

A hosted, database-backed operations workspace replacing spreadsheet copy/sync workflows. The owner’s first sign-in initializes their Admin membership. No demo business data is inserted into production.

## Stack and hosting decision

React 19, the Next.js App Router API on Vinext, Cloudflare Workers, managed D1 SQL, Drizzle migrations, and Sites-managed ChatGPT authentication. Sites provisions hosting, identity and database together and maintains a remote Git repository. This avoids separate Supabase and Vercel account setup. D1 is SQLite, not PostgreSQL; authentication is ChatGPT sign-in, not Supabase password auth. This is an intentional MVP equivalent, not a claim that Supabase/Vercel were configured. The repository is Sites-managed Git, not a repository created in the owner's GitHub account.

Source is local in this directory and synchronized to the Site's remote Git repository by the Sites workflow. `.openai/hosting.json` is the persistent hosting identity. NEVER create another Site on resume.

## Access and initial setup

1. Open the deployed private Site and sign in. While the Site is owner-private, the first authenticated visitor (the owner) atomically becomes Admin. **Do not broaden Site sharing before the owner has completed this initial sign-in.**
2. Add companies and team members. Use the email attached to each teammate's ChatGPT sign-in. The invite roster binds to their stable Site user ID on first login.
3. Grant those people Site sharing access separately. Adding a team entry does not send an invitation or change the Site audience. The first deployment remains owner-private.
4. Review and import source company CSV tabs through Migration, then switch operations to the app after reconciling source counts.

No passwords or credentials live in the application database. Role and active-state checks run on every API request. Unknown/inactive accounts are denied even when allowed through Site sharing. Each person has one active role.

| Role | Read and work access | Administration |
|---|---|---|
| Admin | All content, tasks, companies, recent activity | Companies, assignments, users/roles, imports, exports |
| Manager | All content, tasks, companies, recent activity | Companies, content and task assignments; no team changes/import |
| Designer | Own qualifying design content | Only sequential design status and asset-link updates |
| Staff | Own assigned content and tasks, own recent activity | Status updates to own staff tasks |

## Single-record model

- `members`: stable app member UUID, optional bound Site identity, normalized email, role, active flag.
- `companies`: one row per company, active flag, colour, Drive folder link.
- `content`: one canonical row for each content item. All calendar, dashboard and design queue views query these same records.
- `tasks`: separate staff jobs (matching STAFF WORKS), not duplicate content rows.
- `activity`: append-only through app operations; database triggers record content and task changes in the same transaction. Company/member changes and their audit entries use atomic batches.

The designer queue requires `publish_date >= today(Asia/Colombo) - 5 days`, an assigned creator whose role is Designer, and an active creator. Designers see only their own qualifying records. Admin and Manager see the aggregate queue.

Design advances Pending → Created → Uploaded to Drive. The last transition updates main status to Ready in the **same SQL update**. Database guards reject skipped/reversed transitions and any Uploaded transition without Ready. Later publishing can change the main status to Published. A version integer detects stale edits; conflicts return 409 instead of overwriting another person's changes.

The MVP stores Drive URLs and upload status; it does not upload files into Google Drive. Upload the asset in Drive, paste its URL, and mark it Uploaded to Drive.

## Migration

See [docs/MIGRATION.md](docs/MIGRATION.md). Imports validate all rows before an atomic write, use unique source keys, skip previously imported keys, and never overwrite existing app edits. Main statuses are preserved; design status starts Pending because the generated queue is not a trusted standalone source. Reconcile existing design status against canonical content after import.

The JSON export includes currently loaded records and the latest 250 activity events; it is a convenient snapshot, not a full database backup/restore system.

## Development and verification

Node >=22.13 (tests use built-in SQLite; Node 24 recommended). Install dependencies with the Sites plugin installer; the package lock is committed. Standard commands after installation:

```sh
npm run typecheck
npm test
npm run db:generate
npm run dev
```

The portable local preview simulates ChatGPT sign-in as `seedy@sites.test`; this is local-only and excluded from production. Local D1 state lives in ignored `.wrangler/state`. Test fixtures are never deployed.

Use the Sites build helper for production. Generate SQL before the first build. Apply local migrations using Wrangler with `dist/server/wrangler.json`; see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md). Never change an applied migration. Future schema changes get a new migration.

## Persistence and deployment

Use `site-workflow.mjs` from the Sites plugin to commit, push and package the exact source. Credentials go through hidden stdin only. Save/deploy that archive and commit together. The project is private by default; deployment does not change sharing. Keep credentials out of files, logs, Git and the browser bundle.

`PROJECT_STATUS.md` records scope, verification, limitations and resumption steps. The project mirror's `sources/` is read-only and has not been changed.
