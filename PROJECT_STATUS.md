# Current update — 11 October 2026

## Shipped in this update
- Clear Content Type / Platform selects in simple Add Content, full content form and inline edits, preserving legacy imported values.
- Live issue diagnosis: production's Test content was assigned to Roshan (Admin), so correctly excluded from the Designer-only queue. Creator choices now show roles and each assigned row explains queue eligibility.
- Per-member section grants and all/selected company grants, editable by Admin; server-filtered data and write authorization. Designer/Staff calendar access is read-only; Admin/Manager edits remain role-controlled.
- Queue permissions separate from company calendar grants: a Designer sees their own eligible assignments plus independently granted calendars. Admin/Manager granted the queue can oversee eligible designers. Non-Designer/inactive/old-date content is rejected by design updates even for management.
- Uploaded Gemnad logo used in sidebar branding.
- User explicitly chose to retain ChatGPT sign-in. Temporary-password login and forced password change are deferred, not implemented.

## Still blocked / incomplete
Google Calendar per-member linking and automatic task-day morning notifications are NOT implemented. Google Calendar plugin is installed, but the required Sites plugin-eligibility discovery capability is unavailable in this tool session. Do not infer hosted eligibility from native plugin installation, add guessed connector IDs, or claim calendar consent/sync works. Resume with Sites eligibility support, each visitor's connected account and write consent, event idempotency, update/reassignment handling, and an agreed morning time. No external calendar events were written.
Site remains owner-private. Adding a Team row does not itself grant hosting access; owner must share with the intended teammate separately.

## Verification
TypeScript/build and 11 automated tests pass. Tests cover role/date filtering, reassignment, no duplicate content, scoped company writes, hidden sections, and future-company all-access. Local browser: created QA Designer with Design queue + Content calendar + one company; assigned existing content and observed queue count 0 to 1. Production test data was read only, never changed.

---

# Gemnad Operations — project status

Updated: 11 October 2026 (Asia/Colombo).
Site project: `appgprj_6aca73b4b28881918355848defae5731`.

## Current revision: company calendar correction

Implemented the user's corrected workflow:
- Select a company first; company calendar with Import Excel and Add Content actions.
- Direct .xlsx/CSV reader, worksheet choice, header/column matching, date/time normalization, preview and safe defaults.
- Six-field content entry; no duplicate company selection in the form.
- Complete list columns, multiline special notes, inline creator/status/priority autosave, in-row editing.
- Company-scoped atomic import with server-derived duplicate keys. No schema migration; existing records and role restrictions preserved.
- Nine tests pass, including real Excel parsing, date/time cells, defaults, duplicates, cross-company and role checks.
- Browser QA passed: XLSX upload/preview/import, inline priority save, one-by-one creation and full-detail table rendering. Local fake records only.
- Production build and typecheck passed. This source revision is being published to the existing private Site. See native deployment receipt / ignored `.sites-runtime/calendar-deployment.json` for the latest publication result.

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

**Private production deployment succeeded.**
URL: https://gemnad-operations.gemnadsolutions.chatgpt.site
Verified deployment: `appgdep_6aca77d7a5b08191acb4c0c106013d84`.
Saved version: `appgprj_6aca73b4b28881918355848defae5731~appgver_9deb84570e5481919b88ee762f2436a3`.
Verified application source commit: `027c91eb5c01b97cb68883329704bcc708437226`.

The initial migration failed due to D1 trigger parser compatibility; its failed/unapplied syntax was repaired using SELECT RAISE ... WHERE. The repaired migration and application deployed successfully. Reference: https://github.com/cloudflare/workers-sdk/issues/4727 . Do not edit the now-applied migration.

The deployed site was opened and its private ChatGPT login gate was verified. Owner sign-in/security verification requires the user's interaction; no hosted authenticated dashboard or actual teammate sessions have been tested. This documentation-only checkpoint is being synchronized after the successful application deployment; no application behavior changed.

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

## GitHub persistence — 11 October 2026

Created private repository `gemnadsolutions/gemnad-operations` and configured the local `github` remote. The initial GitHub push preserves all five existing source commits plus the repository documentation commit. GitHub is a source backup and collaboration repository; production D1 data remains on Sites and is not included in Git. GitHub pushes do not automatically deploy the live site.
