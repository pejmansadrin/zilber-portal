# App startup and menu navigation

`npm run build` produces `public/app-assets.json` in its postbuild step. It lists only
the current build's public JS/CSS/font files and the portal's shared public images.
The generated manifest is ignored by Git and packaged with the standalone release.
Packaging rejects a manifest from another build.

On startup, the PWA worker downloads those resources with four concurrent requests.
The installed app's launch screen shows download progress until preparation settles,
with a 15-second limit so a failed connection cannot trap the user behind it.
Later startups reuse the local files. Interrupted downloads are retried, and one
previous complete release is retained for existing tabs. Updates do not reload a
running form; a waiting worker activates through the browser's normal lifecycle.

After the server has authenticated the page, `AppPrefetch` warms the user's main
menus and account sections in Next's in-memory route cache. Super-admin pages are
only warmed for super-admins. Cache invalidation triggers another prefetch while
the app is visible and online. A fully prefetched page is reusable for 120 seconds;
other visited pages are reusable for 60 seconds. Existing Server Action
`revalidatePath` calls continue to refresh data after saves.

`AppLink` defaults to full prefetch and uses a non-blocking progress bar only when
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
