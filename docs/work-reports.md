# Daily work reports

`/work-reports` embeds `src/templates/work-report-v1.html`, adapted from the
provided printable form. The original local file is unchanged. The form keeps
its suggestions, editable lists, daily/weekly/monthly period options, A4 print
rules, optional blank printed rows and standalone HTML export.

Entering the module invokes an authenticated Server Action. PostgreSQL reserves
one report per authenticated user and Tehran calendar day, under an advisory
transaction lock and a unique constraint. A database identity provides its unique
number. Employee name/department and the Auth login email are snapshotted at
creation. Missing employee details fall back to the login email; no caller can
choose the owner, date or report number. The default period is daily.

Content and print preferences are stored in `portal_work_reports` with an immutable
template version. Reopening or downloading regenerates the same HTML format from
that version and its saved content; arbitrary client HTML is never served. Keep
the version-1 template available for existing records when adding later versions.
Report identity and daily dates are locked; recipient, department, period coverage
and report contents remain editable. Saving checks revisions and rejects stale
tabs. Printing from the form first saves successfully, then prints only its iframe.

The form's regular Save button writes to the database. Embedded drafts are not
stored in localStorage or the service-worker cache. Unsaved changes are marked;
failed saves preserve typed text. Exports can be used to retain unsaved text when
resolving a conflict. Downloaded files have separate draft slots per report and
revision. The list shows 30 reports per page and only the current user's reports.

Security: private HTML uses no-store, same-origin framing and a restrictive CSP;
input is bounded and escaped into JSON and inserted as textContent. POST checks
Origin and the network-validated session. RLS permits owner-only reads; writes are
available only through authenticated, validated private functions and public
security-invoker wrappers. Direct table insert/update/delete are denied.

Migration: `20261013114725_daily_work_reports.sql` was applied to the configured
cloud project with its migration-history entry in the same transaction. Earlier
pending migrations were not applied. Ownership, invalid inputs, duplicate opens,
stale revisions and anonymous denial were verified against PostgreSQL 16 in an
isolated container and against the cloud schema in rolled-back test transactions.
The security advisor reported no findings for this module (an existing Auth
password-protection warning remains unrelated).

Checks:

- `node ops/qa/work-reports.mjs`
- `npm run lint && npm run test:architecture`
- `node ops/qa/pwa.mjs`
- `npm run build -- --webpack`
- `supabase/tests/daily_work_reports.sql` inside a rollback transaction
- Production-preview browser fixture: launch Next with
  `node --require ./ops/qa/work-reports-fixture.cjs node_modules/next/dist/bin/next start -p 3118`,
  launch a private Chrome on localhost port 9238, then run
  `node ops/qa/work-reports-browser.mjs`. Never load the fixture in production.

Browser QA uses synthetic users, verifies desktop/mobile, save/reopen, identity,
CSRF/stale-save denial, script injection prevention, HTML export and A4 rendering.
It does not establish live-user end-to-end sessions, physical printing or deployed
frontend behavior. The module is included in release v0.1.5; release completion is
verified through the production pipeline and `/api/health`.
