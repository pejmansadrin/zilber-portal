# Employee self-service

The `/dashboard` and `/account` routes use the connected cloud employee directory, not the separate local attendance prototype. `getCloudConfig()` keeps the project URL explicit. Only the public Supabase key and the signed-in user's session are used for reads and mutations.

## Editable account data

Employees can update their own identity, contact details, address, insurance identifiers and photo. They can add, update and remove their emergency contacts, dependents, bank accounts, education, work history, skills, languages, certifications, documents and training. Dates are entered in the Persian calendar and stored as ISO dates.

Organization-managed employment details, contracts, compensation, benefits, assigned equipment and reviews are read-only. Employees can add their own feedback to an existing review. Login passwords can be changed after verifying the current password; organizational login email changes are handled by the organization.

## Data access

`20260928105745_employee_self_service.sql` was applied to the connected cloud project. It depends on that project's existing employee tables. The older local attendance migration does not create this directory schema, so do not use a local database reset as a cloud deployment procedure.

RLS scopes every table to `employees.auth_user_id = auth.uid()`. Column grants keep ownership, organizational attributes and verification fields out of employee updates. Server Actions derive the employee ID from the session and validate a fixed list of fields. No service-role key is used by these pages.

The private `employee-files` bucket accepts PDF, JPG, PNG and WebP files up to 5 MiB. Object paths start with the authenticated user's UUID. Server-side content checks reject unsupported files. Downloads use short-lived signed URLs. File replacement, removal and record deletion remove the associated old object.

## Validation

Run from the repository root with the local dev server available on port 3000:

```sh
ZILBER_QA_CREDENTIALS=/path/to/private/employee-passwords.txt \
  node --env-file=.env.local ops/qa/employee-self-service.mjs
```

The script uses two existing non-admin accounts from the private credential file. It checks self edits, protected columns, CRUD and cross-user denial on ten related tables, private storage, authenticated routes and a real Server Action submission. Temporary records/files are deleted and the profile fields used by the check are restored in `finally`.

The build was also verified with `npm run build -- --webpack`. Turbopack's build worker could not bind a local port in the execution environment. The available browser runtime reported no browser, so interactive visual QA remains unverified.

## Compact account and organizational management (2026-10-01)

`/account` opens a compact overview with personal and employment details, section shortcuts and completion progress. Organization records are collapsed until opened. Forms keep their own save state, field validation and unsaved-change protection.

`/people` uses fresh database-backed access from `auth.users.raw_app_meta_data.portal_role`; user-editable metadata never authorizes access. Pejman Sadrinezhad's verified linked account is `super_admin`. The super-admin can read the entire directory and edit personal and organizational records through validated RPCs. File uploads keep the existing owner-only storage rules; super-admins can open employee attachments through authorized short-lived signed URLs. Account login email, Auth ownership and row IDs remain outside these RPCs.

HR admins manage employment attributes, supervisor assignment, contracts, compensation, benefits, equipment, reviews and training. A supervisor is derived from the employee's `manager_id`, can manage only direct reports, and can set team, title, work location, arrangement, hours, equipment, reviews and training. Supervisors cannot read salary, banking or personal identity details. No supervisor assignments were inferred or added to existing employees.

`20261001060218_employee_management_access.sql` was applied to cloud project `otsgzpazmmnfeacysdnl`. Existing owner RLS and column grants are preserved; all 16 directory tables explicitly retain RLS. Private authorization functions check the authenticated UID and current database metadata. Public RPC wrappers use SECURITY INVOKER; writes have explicit area and field allowlists. No service-role key is exposed or required.

Run rollback-based authorization checks against the cloud directory:

```sh
npx supabase db query --linked --project-ref otsgzpazmmnfeacysdnl --file supabase/tests/employee_management_access.sql
```

The test covers employees, direct-report supervisors, HR, super-admin, anonymous callers, ownership changes, protected fields, salary access and missing records. Temporary metadata, manager assignments and writes all roll back.

The existing automatic-RLS event trigger also has API execution revoked from PUBLIC, anon and authenticated; its DDL trigger remains installed. The security advisor still reports the separate existing Auth setting for leaked-password protection being disabled. Browser discovery returned no available browser, so visual QA was unavailable; authenticated SSR and real Server Actions were verified on the local portal at port 3001.

Management UI and file access checks:

```sh
ZILBER_QA_BASE_URL=http://localhost:3001 ZILBER_QA_CREDENTIALS=/path/to/private/employee-passwords.txt node --env-file=.env.local ops/qa/employee-management.mjs
```

## Profile photos and mobile section picker

The mobile section picker uses one persistent bottom trigger. Opening the picker adds its content above that button; no duplicate button is mounted or hidden. The picker and bottom trigger are in one modal focus boundary. Backdrop blur remains disabled outside the picker.

Profile photos have a circular preview and male/female defaults based on the explicit `gender` field; unspecified gender gets a neutral default. The editor supports preview, replacement, touch/mouse drag, keyboard arrows, zoom, cropping, cancellation and deletion. Existing images can be reopened for cropping. New images are staged until the user saves. Crop dialogs render in a portal and include Escape, focus trapping and scroll locking.

Source files can be JPG, PNG or WebP up to 15 MiB, with a 40-million-pixel limit. The client crops and compresses to a 512-pixel square before upload. The server independently decodes, auto-orients, resizes, removes metadata and encodes WebP, bounded to 256 KiB. Client processing cannot bypass this server normalization. Only the active session's own private storage path is used; replacement/removal deletes the previous object.

```sh
node ops/qa/profile-photo.mjs
ZILBER_QA_BASE_URL=http://localhost:3000 ZILBER_QA_CREDENTIALS=/path/to/private/employee-passwords.txt node --env-file=.env.local ops/qa/profile-photo-cloud.mjs
```

The cloud test preserves an existing photo by skipping mutations; when the selected QA account has no photo, it tests a real Server Action upload, stored image format/dimensions/metadata, ownership and malformed-file rejection, then removes its test image. Cleanup uses storage object listing, since downloads can be served from cache after deletion. Browser discovery reported no available browser, so interactive crop gestures and the fixed bottom button still need visual QA on a device.

## Complete super-admin panel (2026-10-01)

`/people` is the super-admin panel; `/admin` directs super-admin sessions to it. The dashboard and account menu expose a direct entry. The directory supports name, email, personnel-code, department and job-title search, automatically selects the first result, and includes archived employees for super-admins.

Every stored employee field is available in the full-record view, including account linkage, notes, custom fields and timestamps. All 15 related collections show their complete saved values, including employee feedback and document links. Profile photos and documents use the existing authenticated private-file endpoint. Existing personal and organizational editing forms retain their server-side allowlists.

Migration `20261001080330_super_admin_complete_directory.sql` extends the existing guarded access predicate to archived records only for the current trusted super-admin role. HR, supervisor, owner and anonymous permissions retain their previous scope. No service-role client or public storage bucket is used. The connected cloud currently has seven Auth users and seven employee records.

Validation: production build, TypeScript and scoped lint; authenticated HTTP/SSR checks for all seven employees and every employee field, search, admin entry, private-file access, ordinary-user denial and a restored organization edit. Database rollback suites cover role boundaries and archived access with complete related-record reads. Interactive browser/mobile visual QA remains unavailable in this session.

## Named panel access (2026-10-01)

Panel visibility and entry are limited to the existing Auth accounts for Pejman Sadrinezhad and Narges Najaran. Both have trusted `portal_role=super_admin` metadata. Migration `20261001082345_named_management_panel_access.sql` constrains super-admin authorization to their fixed Auth UUIDs; display names and user-editable metadata cannot grant access. Current database metadata is checked so existing signed-in sessions do not need a JWT role refresh.

Dashboard/menu links, `/people`, `/admin` and the panel's `saveOrganization` Server Action enforce super-admin access. Previous supervisor/HR database RPC scopes remain available for their original organizational workflows, but do not expose this panel. Owner self-service stays available.

`ops/qa/named-panel-access.mjs` checks all seven real accounts: exactly two authorized accounts and five denied accounts, dashboard option visibility, direct panel reads and direct action denial. `supabase/tests/named_management_panel_access.sql` uses rollback fixtures to verify Narges' full access and rejection of super-admin metadata on a third account.

## Compact management workspace (2026-10-01)

The panel opens with an employee identity header and a six-field summary, followed by quick links. Eight accessible tabs group identity, contact, family, finance, career, documents and employment around the overview. Only one panel is visible at a time; inactive panels remain mounted so tab changes preserve unsaved inputs. Related collections are collapsed rows with record counts; saved details, editing and adding records expand separately. The complete raw-field view remains available in the overview.

The user directory uses compact identity rows and a single-row search control; on narrow screens it moves above the workspace with a bounded list height. Tabs wrap to two columns on phones. Shared glass surfaces, theme colors, avatars and form primitives retain the portal design.

The authenticated SSR suite checks all eight tabs, exactly one selected tab and one initially visible panel, plus both authorized accounts and the five denied users. Production build and scoped lint pass. Browser discovery returned no available browser, so visual layout and interactive keyboard/tab behavior have not been tested in a browser.

On mobile/tablet widths up to 850px, the directory is collapsed behind an accessible user selector showing the current employee. Selecting a user closes it; filtered searches initially expand it to expose results. Desktop keeps the directory visible. At phone widths up to 600px, editor forms use one column, text inputs use 16px type to avoid automatic focus zoom, and save buttons and disclosure controls have at least 44px touch targets. Titles, record summaries and long values wrap within their panels. The narrowest layout uses a single-column overview. Mobile visual/gesture QA remains unavailable; these changes were checked through build and lint.

The mobile user selector now follows the account section-picker pattern: a fixed bottom trigger remains mounted in the same position, while a matte sheet grows above it. Shared section-picker header, close control, icon/text treatment and an unblurred backdrop match the account UI. The sheet locks background scrolling, traps keyboard focus, supports Escape/backdrop dismissal, and returns focus to the trigger without scrolling. Selecting a user closes the sheet unless the unsaved-change guard cancels navigation. Desktop retains the full sticky directory. User rows are stacked with a check on the selected person, and bottom padding keeps forms clear of the trigger. Build, lint and authenticated SSR access checks pass; interactive browser visual verification remains unavailable.

## Consistent private profile photos and account navigation (2026-10-01)

All portal avatars use the saved employee photo through `/account/photo`, including the welcome card, header, account editor and super-admin user directory. The route verifies the current session and ownership or trusted super-admin access, downloads with Storage RLS, and serves actual image bytes with private/no-store caching. It removes the previous mismatch between expiring signed URLs, private-file redirects and legacy profile metadata. Shared `ProfileImage` retries a failed internal photo once and then displays the gender-specific default; a new uploaded source resets that failure state. Authenticated images bypass the Next image optimizer so cookies reach the protected route. Saving a photo also revalidates attendance, leaves, admin and people views.

Every account section beyond the overview has a single 36px circular, icon-only RTL back button opposite the “حساب من” title, returning to the record summary. An accessible label and tooltip identify the action. It uses the existing unsaved-change guard, updates the active section and URL together, and focuses the summary without forcing a scroll jump.

Read-only QA: `ZILBER_QA_CREDENTIALS=/path/to/private/employee-passwords.txt node --env-file=.env.local ops/qa/profile-photo-display.mjs`. This checks real photo bytes for the owner and super-admin, denial to another user, anonymous and traversal requests, stable URLs across pages, default assets and back-control rendering in all nine account sections. Browser interaction and visual QA remain unavailable.
