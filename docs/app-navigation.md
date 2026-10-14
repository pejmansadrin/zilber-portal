# App startup and menu navigation

`npm run build` produces `public/app-assets.json` in its postbuild step. It lists only
the current build's public JS/CSS/font files and the portal's shared public images.
The generated manifest is ignored by Git and packaged with the standalone release.
Packaging rejects a manifest from another build.

The launch screen disappears after hydration; a CSS deadline also hides it after
800 ms if JavaScript or data is delayed. It never waits for asset downloads, fonts,
or the complete document. The worker registers after page load and an idle delay.
Public assets are cached as they are requested. The app no longer bulk-downloads
all route bundles on launch. Updates do not reload a running form.

Dashboard, account, attendance, people and attendance administration share the
`src/app/(portal)/layout.tsx` shell. The route group preserves the existing URLs.
The header identity has its own Suspense boundary; page content does not wait for
it. A content-only `loading.tsx` keeps shared navigation mounted across routes.
Dashboard service links render independently of its personalized overview. Optional
identity/overview failures have their own error boundary. Every private data read
and mutation enforces authorization; the layout is not the authorization boundary.

There is no bulk private-route prefetch or periodic refetch loop. Account collections
load only when their tab mounts, using bounded APIs with per-collection pagination.
Personal attendance initially loads registration context only. History, requests and
the chart are opened separately. See [mobile-performance.md](mobile-performance.md).
Personal and organization edits revalidate the shared layout to update its identity.

`AppLink` enables partial prefetch on pointer/focus intent and uses a non-blocking progress bar only when
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

Production browser scenarios and their evidence boundary are documented in
[mobile-performance.md](mobile-performance.md). Authentication still validates the
current user before private reads and mutations.
