# Mobile loading and content architecture

## Scenarios and priority

1. **Launch / navigate:** render the shared shell and route loading state. Identity
   streams in its own boundary; dashboard service links do not await employee data.
   The header uses only name, role label, gender and photo path, not the full file.
2. **Register attendance:** read today's row, the latest open row (including an older
   overnight shift), and the pending entry needed to close unapproved attendance.
   These three reads run in parallel. Do not read the selected month's history here.
3. **Correct attendance:** keep the correction entry directly below registration.
   A selected historical day is fetched independently using the existing guarded
   correction action. Old days remain editable even when outside the visible month.
4. **Browse history:** opening the timesheet loads its code and at most 31 days.
   Opening its chart separately loads the Gantt code. A closed panel has no query,
   chart computation or mounted chart DOM. Explicit `?month=` links open the history.
5. **Read correspondence:** opening this panel loads 30 requests plus one lookahead.
   Its pagination is local and does not rebuild or reset the registration form.
6. **Open personnel file:** overview/personal fields load no record collections.
   Mount only the collections in the selected tab; each fetches 20 rows plus one
   lookahead with its own pagination and retry. Never truncate a collection without
   providing a next page. Closed record editors mount on first expansion, then stay
   mounted when collapsed to preserve drafts. Pagination is disabled while there are unsaved edits.
7. **Save:** keep database RPCs and mutation checks authoritative. Existing path
   revalidation supplies a new render revision to open content panels. They refetch
   their own data. Closed panels remain idle. Account forms remain mounted during
   revalidation to preserve unrelated unsaved edits.
8. **Failure / navigation away:** optional history failures stay inside the panel
   with a retry button; registration is unaffected. Unmounting/changing the resource
   aborts its request. Late responses cannot overwrite a different URL/revision.

## Boundaries and cache lifetime

- Proxy verifies `auth.getClaims()` and refreshes cookies. With asymmetric signing
  keys this can verify against cached public keys; symmetric projects still contact
  Auth. Do not describe the proxy as universally network-free.
- Every private page/action/API still validates the current user with `getUser()`.
  The verified session is passed to API data readers: React `cache()` deduplicates
  RSC rendering, but is not an HTTP-handler request cache.
- API reads derive the employee/user ID from that session. No caller-supplied
  identity selects someone else's data. Existing RLS remains active; there is no
  service-role client, schema change or authorization based on user metadata.
- Personal API data is `private, no-store`, component-owned memory only, and never
  persisted in localStorage/IndexedDB/service-worker caches. No cross-user cache.
- `usePrivateResource` retains same-URL data during revision refresh so editors
  are not remounted, but never displays a previous URL's result. Errors are explicit.
- Dynamic route cache stale time is zero for forward navigation. Back/forward
  restoration is still governed by Next's router; database checks remain decisive
  when a restored form submits.
- The worker registers at idle and caches public assets actually requested. There
  is no startup bulk download of all route bundles, even in standalone mode. The
  build manifest and legacy worker warming protocol remain for package compatibility.
- No timer-based polling, private-route bulk prefetch, or persistent offline writes.

## Verification and reproduction

Run `npm run test:architecture`, `npm run lint`, `node ops/qa/pwa.mjs`,
`node ops/qa/time-wheel.mjs`, and `npm run build -- --webpack`.
`mobile-data.mjs` checks query construction, budgets, owner derivation, denial before
I/O, current/overnight/pending independence, and API error/cache contracts.
`navigation-streaming.mjs` releases page content before identity to prevent a shell
waterfall regression.

The production browser suite uses synthetic data only. After building:

```sh
printf '%s' '{}' > /tmp/portal-mobile-control.json
PORTAL_QA_CONTROL=/tmp/portal-mobile-control.json PORTAL_QA_LOG=/tmp/portal-mobile-requests.jsonl node --require ./ops/qa/mobile-performance-fixture.cjs node_modules/next/dist/bin/next start -p 3124 -H 127.0.0.1
```

In a second terminal, set `PLAYWRIGHT_PATH` to an installed Playwright package and
`CHROME_PATH` to a Chromium executable, then run
`node ops/qa/mobile-performance-browser.mjs`. The fixture intercepts Supabase HTTP
and rejects unexpected service paths. Never preload it in a deployed process.
The browser runs at 390×844, 4× CPU slowdown, 150 ms latency and 200 KB/s download.
It verifies actual registration interaction before a 6.5-second identity delay,
zero initial history/collection requests, panel retry/pagination, mutation refresh,
private API denial, no bulk warming, horizontal overflow and browser exceptions.
Screenshots and a timing JSON go to `/tmp/portal-mobile-*`.

These are isolated production-build observations, not physical-device latency or
live Supabase/RLS/deployment measurements. The directory's full server RPC remains
an independently scoped database optimization; no live schema was modified here.

## Latest isolated result (2026-10-14)

Production Chromium run: registration visible in 1,459 ms and interactive in
2,585 ms, while identity had a forced 6,500 ms delay. Dashboard service links
appeared in 318 ms in the same throttled session. These are observed samples,
not a p95 or a before/after speedup claim. The suite also passed deferred-chunk
checks, draft preservation across disclosure close/reopen, pagination blocked
for dirty forms, mutation invalidation, API denial and optional-panel retry.
