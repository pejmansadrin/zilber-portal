# Portal architecture

The portal is a Next.js App Router application backed by Supabase Auth,
PostgreSQL and private Storage. It uses one deployment, a shared streaming UI
layout, server-only data access and database-enforced business rules.

## Dependency direction

`app / components -> actions / lib -> domain`

- `src/domain/attendance`: pure time-registration rules and calculations, domain
  types and validated query parameters. These modules do not import React, Next,
  database clients or UI components.
- `src/lib/auth/session.ts`: network-validated session, current access role and
  server-side guards. React `cache` deduplicates calls within a render request;
  it does not persist identities or responses across users or requests.
- `src/lib/supabase/server.ts`: a server-only, request-scoped Supabase client
  carrying the viewer's session. There is no service-role client in this runtime.
- `src/lib/attendance`: authenticated reads. Self-service reads derive the owner
  from the session, never from caller-provided user IDs. Admin reads check the
  super-admin role before requesting any directory or attendance data.
- `src/actions/attendance-review.ts`: mutation entry points reuse session guards,
  invoke checked database RPCs and invalidate affected views. PostgreSQL still
  validates timestamps, locks concurrent changes, checks permissions and applies
  approvals transactionally. Browser validation is only user feedback.
- `src/app/(portal)`: persistent shell and content loading boundaries. Layout
  visibility is not permission enforcement; every read/mutation enforces its own
  access boundary. Existing URLs are unchanged. `/admin` redirects to `/people`.

## Read budgets

The attendance administrator fetches at most 51 attendance rows and 51 requests
per page (50 visible plus one to determine whether another page exists). Both
lists have independent pagination and deterministic ordering. Name/department,
date and request-status filters are applied before pagination. The pending badge
is a database count, not the number of items on the currently displayed page.
The optional late/open table refinement explicitly applies to the current page.

Directory records used for name matching stay on the server. Only names, user IDs
and departments needed for the displayed rows reach the admin component. Attendance
and request queries run concurrently once search identities are available.

The shared shell and account-record streaming are described in
[app-navigation.md](app-navigation.md). Private HTML, RSC, images and mutation
responses must not enter the service-worker cache.

## Verification

- `npm run lint`
- `npm run test:architecture`
- `node ops/qa/pwa.mjs`
- `npm run build -- --webpack`

Architecture tests exercise actual Supabase query construction against an isolated
fetch fixture: bounded ranges, ordering, filter propagation, denied roles before
I/O, empty results, errors and minimal response fields. They also enforce import
boundaries and regression cases for registration windows and overlapping missions.
The streaming test verifies the shell precedes delayed records. CI runs lint and
both architectural suites. These tests do not establish live database policy state.

A production-preview browser check used an isolated synthetic Supabase fixture
with 61 records, a 390px mobile viewport, 4x CPU throttling and Fast 4G emulation.
The first page displayed 50 rows and the second 11; name/date filtering returned
one matching row and reset pagination. The shell header remained mounted across
navigation. No horizontal overflow or console errors were observed. This verifies
UI and query integration, not real-device latency, live RLS or deployed behavior.

## Remaining migration work

- The cloud employee schema predates the checked-in migrations. Establish a
  verified baseline and reconcile migration history before resetting or rebuilding
  a database. Existing migrations have not been rewritten or applied in this refactor.
- Personal attendance history still reads all of that user's records; it needs
  bounded period loading with independent current/open-session context and
  on-demand historical-day reads for corrections. Simply limiting its rows would
  hide pending entries, overnight work or editable old sessions.
- The directory RPC still reads the full directory on the server. A minimal,
  searchable database endpoint can remove that cost after schema verification.
- Legacy leave/prototype code remains isolated from the current attendance flow.
  The unreachable old admin dashboard and its unused approval actions/UI have
  been removed. Retire the remaining prototype tables/policies only after auditing
  the live schema and preserving any historical data.
