# Gemnad Operations — project status

Updated: 10 October 2026 (Asia/Colombo).
Site project: `appgprj_6aca73b4b28881918355848defae5731`.

## Completed source milestones

- Architecture: one canonical content table, staff task table, members, companies and audit log.
- Login: managed ChatGPT sign-in; owner-private first-admin claim; invite roster tied to stable user IDs; immediate role/deactivation checks.
- Admin/Manager dashboard; company management; list/month content calendar; team management for Admin.
- Designer queue: own work, inclusive today-minus-five cutoff, active Designer role.
- Sequential design workflow; Uploaded to Drive atomically sets Ready and logs the change.
- Staff task queue with own-task edits.
- Search/company/date/status/priority/creator filters; responsive light/purple interface.
- Migration preview for original Gemnad company CSVs and STAFF WORKS; source-key deduplication; JSON snapshot export.
- README, migration guide, development guide and automated tests.

## Verification completed

- Production build passed.
- TypeScript check passed.
- Six automated tests passed, including API role/security scenarios, database integrity, source-key deduplication, date boundary and concurrency.
- Local browser: login, company creation, content saving and calendar display passed. Only local fake QA data was used.

## Deployment checkpoint

Source pushed as `1eb3226e0651c23620c87c933e0a113e65814fab`. Initial deployment failed with incomplete SQL input in the D1 trigger parser. The failed initial migration was repaired to use SELECT RAISE ... WHERE instead of unparenthesized CASE ... END (Cloudflare workers-sdk issue 4727). Local tests pass. Retry publication with the repaired archive; reuse the same Site ID. No live business records exist.

## Honest boundaries / follow-up

- Stack is Sites/Vinext + D1 + ChatGPT identity, not configured Supabase/PostgreSQL/Vercel.
- Persistent source repo is provided by Sites; no repository was created in the user's own GitHub account.
- Production starts empty. The original Google Sheet was inspected read-only; import and reconciliation remain to be performed using Migration.
- First deployment is owner-private. The owner must sign in before team sharing is broadened. Team access requires both platform sharing and an active app member entry.
- No invitations were sent. No real teammate login was tested.
- Drive upload is manual; store its HTTPS URL in the app.
- CSV importer accepts up to 300 records / 1 MB per request, uses original source row identities, and starts design status at Pending.
- Activity view/export shows the newest 250 events. Older audit events remain in SQL. Full backup/restore automation is not included.

## Resume

1. Read this file and `.openai/hosting.json`.
2. Inspect current repository, deployment and source credential state; preserve the existing Site identity and applied migrations.
3. Continue the first unfinished milestone rather than rebuilding the project.
