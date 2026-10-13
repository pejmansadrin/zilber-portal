# App startup and menu navigation

`npm run build` produces `public/app-assets.json` in its postbuild step. It lists only
the current build's public JS/CSS/font files and the portal's shared public images.
The generated manifest is ignored by Git and packaged with the standalone release.
Packaging rejects a manifest from another build.

The launch screen disappears after hydration; a CSS deadline also hides it after
800 ms if JavaScript or data is delayed. It never waits for asset downloads, fonts,
or the complete document. Public asset warming starts after window load, a two-second
delay and an idle callback. It is skipped on reported 2G/3G, data-saving, hidden and
offline connections. Later startups reuse the local files. Interrupted downloads are retried, and one
previous complete release is retained for existing tabs. Updates do not reload a
running form; a waiting worker activates through the browser's normal lifecycle.

Dashboard, account, attendance, people and attendance administration share the
`src/app/(portal)/layout.tsx` shell. The route group preserves the existing URLs.
Its Suspense boundary streams a neutral shell while account data resolves, without
revealing identity or admin controls. The authenticated shell stays mounted during
navigation. A content-only `loading.tsx` keeps the header and navigation interactive
while each page loads. Page/action authorization and database RLS remain in place;
the persistent layout is not the authorization boundary.

There is no bulk private-route prefetch or automatic invalidation/refetch loop.
Visible links use Next's automatic partial prefetch to the loading boundary.
Account identity and access-role queries run concurrently after authentication.
Account records stream through a promise: the overview, tabs and personal fields
do not wait for the collection queries; only collection panels suspend.
Personal and organization edits revalidate the shared layout to update its identity.

`AppLink` defaults to automatic prefetch and uses a non-blocking progress bar only when
a transition exceeds 180 ms. Account tab buttons already switch locally using
native history, without waiting for a server request. Logout opens a new document
to discard in-memory personal page payloads.

Private HTML/RSC payloads, employee photos, API responses, and POST requests are
never stored in the worker cache. Viewing prepared menus is faster; authentication,
submitting forms, recording attendance, and fetching new data still need a network
connection. A full refresh without a network shows the public offline screen.

Verification: `node ops/qa/pwa.mjs` includes worker tests for public-only caching,
auth isolation, partial downloads, version upgrades and rollback. Prefetching is
production-only; use a production build to measure actual navigation latency.

Local production-browser check (390x844, 4x CPU slowdown, Fast 4G emulation):
with synthetic account responses delayed 900 ms and attendance/record responses
delayed 6000 ms, the attendance loading shell appeared about 65 ms after navigation,
and content arrived about 7.76 s later. The same header DOM node survived dashboard,
attendance and account navigation. Account overview appeared around 1.11 s without
waiting for the record collections. These are isolated fixture observations, not
production Supabase or physical-device benchmarks. No horizontal overflow or browser
console errors were observed. Authentication remains network-validated before routing.
