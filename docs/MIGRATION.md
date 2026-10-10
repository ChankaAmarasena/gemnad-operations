# Migration from Gemnad Operation

Verified source: https://docs.google.com/spreadsheets/d/1I_hXs_k-a8SAGTtlu72D4ye8ufUKlYyPH3h7fn6-Hjk/edit
Inspected read-only on 10 October 2026. No source changes or live data import have been performed.

## Original tabs

Company sources observed: ELAINE, FOURCLE, JUNIOR GEORGE, GENTRENEX, SIGNET, TABROBAN, NODE HIVE, GEMNAD SOLUTIONS, LINKEDIN.

SETUP is the reference for names, emails, roles and active state. Add those as app Team entries and companies before import. The owner remains Admin in the app; do not blindly demote the owner just because a spreadsheet role is Designer. Other people must receive an appropriate active role and separate Site access.

Do not import DASHBOARD, FOR DESIGN CONTENT, SYSTEM_SYNC, or the separate Gemnad Design Content spreadsheet. They are projections/copies and can introduce duplicates. SOCIAL NEWS, CAMPAIGN PLANNING and strategy blocks are outside this content/task MVP.

## Content mapping

ELAINE headers were verified at row 12. The parser discovers the header row in a complete CSV export and preserves original row positions.

| Sheet column | App field |
|---|---|
| Date | Publish date (ISO date) |
| Publishing Time | Publishing time (display text, Sri Lanka) |
| Content | Title / content idea |
| Content Type | Type |
| Status | Main content status |
| Notes | Notes |
| Platform | Platform |
| Assigned Creator | Active member, exact name ignoring case |
| Priority | Low / Medium / High / Urgent |

Create a company, download the **entire original company tab** using File → Download → CSV, open Migration, select its company and exact tab name, upload, preview and import. Blank content rows are ignored. Invalid dates, unknown statuses, unknown priorities or missing named staff block the import. Supported dates include ISO and day-month-year formats such as 05-Oct-2026.

Canonical content source key: `gemnad-operation:<UPPERCASE ORIGINAL TAB>:<original row number>`. Re-importing the same file skips existing keys; it does not overwrite app records. Keep the source snapshot unchanged until cutover. Row numbers are not stable across insertion/reordering: do not import a rearranged or differently sliced CSV as if it were the same snapshot. For >300 records use a reviewed migration script with explicit original source keys. The UI does not split/re-key files for you.

Designer state defaults to Pending on import. Review existing work before marking it Created or Uploaded. Uploaded changes main status to Ready, even if imported main status was Published; do not advance already published legacy work unless that reset is intended.

## Staff jobs

STAFF WORKS headers were observed in row 2. Map Job Detail → title, Complete Date (fallback Date) → due date, Employee → active member, Status → Pending/In Progress/Completed, Special Notes → notes. JOB KEY is used when available; otherwise the original row number is used. Job Number is not treated as a globally unique database ID.

## Cutover checklist

1. Save a source workbook snapshot and freeze row order.
2. Prepare companies and team; confirm emails and active roles.
3. Preview every canonical tab and resolve validation errors.
4. Import one tab at a time. Record inserted/skipped counts.
5. Reconcile titles, dates, creators and status totals against the snapshot.
6. Verify Designer and Staff logins with actual teammates after sharing authorization.
7. Stop spreadsheet automation/writes only after reconciliation and user acceptance. This app does not disable or edit the original Google Sheet.
