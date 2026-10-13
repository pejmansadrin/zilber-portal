# Mobile application

The production app at https://portal.zilber.tech uses the App Router manifest,
brand icons, standalone display mode, navy theme/status-bar color and a short
theme-aware logo splash on a fresh standalone launch. It disappears after hydration
with an independent 800 ms CSS deadline, and never waits for public-asset warming.
Client-side navigation does not replay the splash. Zoom remains enabled; safe-area insets protect controls on phones.

Mobile browser tabs display an installation gate before first paint. Chromium
offers its native installation prompt when available; iPhone/iPad show Safari
home-screen instructions. After installing, users must launch the home-screen
icon. Accepting a prompt does not unlock the browser tab. Desktop browsers,
including narrow desktop windows, continue normally. The gate is a UX rule;
session authorization and database RLS remain responsible for access control.

`public/sw.js` caches allowlisted public build assets, the offline document and brand icons. Account
pages, photos, files, authentication, API responses, RSC and mutations are never
stored in its cache. Offline document navigations show a connection message.
Updates do not forcibly reload an open form. The manifest, worker and offline
assets must stay public in the auth proxy; the worker must retain no-store
headers and root scope. Release verification checks these anonymously.

Run `node ops/qa/pwa.mjs` and `npm run build`. CI runs the PWA checks on every
build and validates the manifest/worker/icons after version-tag deployment.
For visual testing, use a production build on localhost or HTTPS; service-worker
registration is intentionally disabled in development. Check Android Chrome
and iPhone Safari installation on real devices, then launch the installed app
to verify OS splash and status-bar behavior.
