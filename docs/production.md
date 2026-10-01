# Production and GitLab CI/CD

Production: <https://portal.zilber.tech>. Repository: <https://git.zilber.tech/zilber/zilber-portal>.

## Release a version

Push changes to `main` first. The main pipeline checks photo processing and builds Next.js; it does not deploy. Publish a new, unique version tag on the tested commit:

```sh
git switch main
git pull --ff-only
git tag -s v0.1.1 -m 'Release v0.1.1'
git push origin v0.1.1
```

Stable tags must match `vMAJOR.MINOR.PATCH` (for example `v0.1.1`). Tags `v*` are protected and only Maintainers can create them. A protected project runner builds each version from `npm ci`, creates a standalone artifact with checksum, deploys it, checks the public HTTPS version/assets/auth redirect, then publishes a GitLab Release. The production environment and pipeline expose the deployment links. Failed builds never run deployment. Never move or reuse a version tag; job retries may reactivate only the identical artifact.

Builds run in non-privileged Docker containers with no host Docker socket, one job at a time, 3GiB memory and two CPUs. The runner manager alone mounts Docker's socket. The runner is locked to this project and protected refs, does not accept untagged jobs, and uses pinned Node 24 and Runner 19.3 images.

## Host and activation

Host: `158.255.74.30`. Root-owned deployment helper: `/usr/local/sbin/zilber-portal-activate`, sourced from `ops/deploy/activate.py`. Production releases and state are in `/opt/zilber-portal`; runtime configuration is `/opt/zilber-portal/secrets/runtime.env` (root-only). The dedicated `portal-ci` SSH key is restricted to running the helper with no arguments. Host identity is pinned from an already authenticated administrative SSH session.

The helper validates archive size, paths, file types, metadata and immutable artifact checksum. The candidate container listens only on localhost port 3301 or 3302, runs as UID 1000 with a read-only filesystem, no capabilities, resource limits, health checks and bounded logs. After candidate health/login checks, it changes only `/etc/nginx/conf.d/zilber-portal-upstream.conf`, tests Nginx, reloads it, and checks HTTPS. Failed activation restores the upstream and removes the candidate. The previous production container and release remain available. Deployments are serialized by a GitLab resource group and a host file lock.

Administrative rollback, using the existing trusted administrative SSH connection:

```sh
sudo /usr/local/sbin/zilber-portal-activate --rollback
```

Rollback also checks the candidate before switching. If the first deployment fails there is no previous version to restore. Releases and backups are retained; periodically inspect `/opt/zilber-portal/releases` and disk space before removing obsolete artifacts. Do not remove the current or previous release.

The portal Nginx configuration is `ops/deploy/portal.nginx.conf`. Let's Encrypt issues the domain certificate; `certbot.timer` renews it. The pre-setup Nginx backup is under `/opt/zilber-portal/backups`.

## Configuration and database

Protected GitLab project variables:

| Variable | Type | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Environment | Existing cloud project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Masked environment | Public application key |
| `PORTAL_DEPLOY_KEY` | File | Restricted private deployment key |
| `PORTAL_SSH_KNOWN_HOSTS` | File | Pinned host public key |

Only the two public Supabase configuration values are supplied at build time and on the runtime host. No service-role key, database password or employee credentials are included in artifacts. No database reset, local seed or automatic schema migration runs during deployment. The existing cloud schema and RLS remain authoritative; review future migrations separately before application releases.

`/api/health` returns status, deployed version and commit without user information. It checks application configuration; it does not claim database availability. Account requests retain session checks and ownership/RLS.

## GitLab email notifications

The existing verified SMTP configuration uses `mail.zilber.tech:465`, TLS with certificate verification, sender `git@zilber.tech`. All existing active human users have custom notification events and notifications for their own activity enabled. Existing project overrides are also updated. Push/tag and pipeline email integrations include all five current users in every existing project, every branch, all successful/failed pipelines, and repeated results. Release, issue, comment and merge-request notifications follow each user's project access.

GitLab users can later change their preferences. New users or projects must be added to the integration recipients/configuration; this setup is not an automatic user-provisioning hook. GitLab emits supported events, not an email for every page view or button click. SMTP acceptance confirms outbound delivery to the mail server, not Inbox/Spam placement. A root-only pre-change notification settings backup is stored in GitLab's data directory.

Relevant upstream references: [runner registration](https://docs.gitlab.com/runner/register/), [pipeline status email](https://docs.gitlab.com/user/project/integrations/pipeline_status_emails/), [push/tag email](https://docs.gitlab.com/user/project/integrations/emails_on_push/), [notification events](https://docs.gitlab.com/user/profile/notifications/).
