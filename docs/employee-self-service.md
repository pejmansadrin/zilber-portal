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
