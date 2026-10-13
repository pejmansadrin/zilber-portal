# Zilber Portal

Persian RTL employee portal built with Next.js, React, TypeScript and Supabase.

## Development

Install the locked dependencies with `npm ci`. Configure the approved cloud
Supabase URL and public key in an untracked `.env.local`; see
`src/lib/supabase/config.ts` for the accepted endpoint. Never commit credentials.

```bash
npm run dev
npm run lint
npm run test:architecture
node ops/qa/pwa.mjs
npm run build -- --webpack
```

Build production output before browser performance checks. Deployment uses the
standalone release bundle; see [production.md](docs/production.md).

The existing `db:start` / `db:sync` helpers rewrite `.env.local` for a local
Supabase stack, which the cloud-only application configuration does not accept.
Do not use them, or `db:reset`, as a fresh-install procedure. The database baseline
and older cloud migration history need reconciliation first.

## Architecture and workflows

- [Architecture, dependency boundaries and remaining migration work](docs/architecture.md)
- [Streaming shell and navigation](docs/app-navigation.md)
- [Attendance and approval rules](docs/attendance.md)
- [Employee self-service](docs/employee-self-service.md)
- [Mobile/PWA behavior](ops/PWA.md)

Application code lives in `src/app`, `src/components`, `src/actions`, `src/lib`
and `src/domain`. Database migrations and SQL policy tests live in `supabase`;
CI, deployment and executable checks live in `ops`.
