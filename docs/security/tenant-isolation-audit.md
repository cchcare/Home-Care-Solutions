# Multi-tenant data isolation audit — server/routes.ts

Generated from a full pass over `server/routes.ts` (~848 endpoints inspected across 5 chunks,
352 flagged). This app is multi-tenant: `req.session.user` carries `role`, `organizationId`,
`primaryOfficeId`; most tables carry an `officeId` (an office belongs to one organization).

**The correct, established pattern** (see `GET /api/clients`, `server/routes.ts`):
non-super-admins are locked server-side to their own `primaryOfficeId`, ignoring any
client-supplied `officeId` query param. Two shared helpers now live near the top of
`registerRoutes` for reuse: `resolveAllowedOfficeIds(req)` and `canAccessOffice(req, officeId)`.

Three bug shapes account for nearly everything below:
1. **Fetch/update/delete-by-id with no ownership check** — a `:id` route calls a storage
   getter/updater/deleter with only that id, never comparing the record's `officeId`/org to
   the requester.
2. **Trusting a client-supplied scope param** — `officeId`/`organizationId` read straight from
   `req.query`/`req.body` and used to filter data, without enforcing the caller's own scope.
3. **Missing role/auth check entirely** — a route that should require a specific role (or any
   auth at all) doesn't have that check.

## Fixed this session (verified: typecheck clean, schema pushes to a fresh DB, boot smoke
test passes, full test suite passes 90/90 + 5 pre-skipped)

- [x] `GET /api/clients/:id` — added `canAccessOffice` check (was the original reference bug)
- [x] `PUT /api/clients/:id` — added `canAccessOffice` check (zero check of any kind before)
- [x] `DELETE /api/clients/:id` — added `canAccessOffice` check (had role check, no office check)
- [x] `GET /api/caregivers/:id` — added `canAccessOffice` check
- [x] `PUT /api/caregivers/:id` — added `canAccessOffice` check (zero check of any kind before)
- [x] `DELETE /api/caregivers/:id` — added `canAccessOffice` check (had role check, no office check)
- [x] `GET /api/users` — added role gate + office-scoped filtering (was a full cross-org user directory dump, no check at all)
- [x] `GET/POST/PUT/DELETE /api/custom-roles`, `/api/custom-roles/:id` — added `requireAdminRole` (no check at all before — any authenticated user could create/edit/delete custom roles)
- [x] `GET/POST/DELETE /api/custom-roles/:roleId/permissions[/:permissionId]` — added `requireAdminRole`
- [x] `GET/POST/DELETE /api/users/:userId/custom-roles[/:roleId]` — added `requireAdminRole` (**privilege escalation**: any authenticated user could assign any role, including elevated ones, to any user)
- [x] `GET /api/users/:userId/permissions` — added `requireAdminRole`
- [x] `POST /api/custom-roles/bulk` — added `requireAdminRole`
- [x] `POST /api/permissions` and `POST /api/permissions/seed` — added `requireAdminRole`
- [x] `POST /api/time-off-requests/:id/approve` — added role gate (super_admin/admin/office_admin/supervisor) + office check via the request's caregiver (was zero role check — any authenticated user, including a caregiver account, could approve any org's time-off and trigger a PTO ledger debit)
- [x] `POST /api/time-off-requests/:id/deny` — same fix
- [x] `POST /api/caregivers/:id/pto-balance` — added role gate + office check (was zero role check — any authenticated user could write PTO balances for any caregiver)
- [x] `GET /api/staff/live-dashboard` — added role gate + office-scoped filtering (was zero role check — any authenticated user could see who's currently clocked in, with live GPS coordinates, across every organization)

That's 18 of the most severe findings — chosen because each one required either literally no
authentication-level check at all, or wrote money/PHI/permissions data with zero ownership
check.

## Fixed in a second pass (write-path IDOR on PHI/financial data) — same verification as above

- [x] `GET/PATCH /api/claims/:id`, `/submit`, `/void`, `/resubmit` — added `canAccessOffice` check
- [x] `GET/POST /api/claims/:id/line-items`, `DELETE /api/claims/:claimId/line-items/:id` — added `canAccessOffice` check (the DELETE didn't even fetch the parent claim before)
- [x] `GET /api/claims`, `/aging`, `/summary` — non-super-admins now locked to their own `primaryOfficeId`, matching the reference pattern (was fully client-supplied)
- [x] `GET /api/claims/by-client/:clientId` — added a client-ownership check before returning claims
- [x] Added `getClientInScope(req, clientId)` helper (client sub-resources key off `clientId`, not their own `officeId`)
- [x] `GET/POST /api/clients/:id/medications`, `GET/PATCH/DELETE /api/medications/:id`, `/log`, `/adherence`, `/logs` — added `getClientInScope` check throughout (8 endpoints)
- [x] `GET/POST /api/clients/:id/vitals`, `/history`, `/trends` — added `getClientInScope` check (4 endpoints)
- [x] Added `getBackgroundCheckOfficeId(check)` helper (a background check belongs to an applicant or a caregiver, not an office directly)
- [x] `GET/POST /api/applicants/:id/background-checks`, `GET/POST /api/caregivers/:id/background-checks` — added ownership check on the parent
- [x] `PATCH /api/background-checks/:id` — added ownership check via the resolved parent
- [x] `GET /api/background-checks/pending`, `/expiring`, `/by-status/:status` — added `scopeBackgroundChecks` in-process filter (no officeId column exists to filter by in SQL for this table)
- [x] `POST /api/background-checks/bulk` — added ownership check on the target applicant/caregiver

Everything below this line is **not yet fixed** and needs the same treatment:
read the actual route, apply `canAccessOffice`/`resolveAllowedOfficeIds` (or a role gate, or
both), verify against a real Postgres instance, and check off the line.

---

## Remaining — grouped by module, in file order

### Users, messages, compliance, incidents (lines ~1–4700)
- [ ] `PATCH /api/messages/:id` (~4919) — update-by-id, no ownership check
- [ ] `PUT /api/compliance/:id` — update-by-id, no ownership check
- [ ] `PUT /api/trainings/:id` — update-by-id, no ownership check
- [ ] `GET /api/incident-reports/:id`, `PUT /api/incident-reports/:id` — fetch/update-by-id, no ownership check
- [ ] `PATCH /api/follow-ups/:id` — no ownership check
- [ ] `GET /api/dashboard/metrics`, `/api/dashboard/monthly-stats`, `/api/admin/care-quality-metrics`, `/api/reports/schedule-overlaps`, `/api/incident-reports`, `/api/compliance`, `/api/trainings`, `/api/tasks` — all trust a client-supplied `officeId`/`userId` with no enforcement for non-super-admins
- [ ] `POST/PUT/DELETE /api/offices`, `/api/coordinators/*`, `DELETE /api/communications/:id` — only `isAuthenticated`, no role check
- [ ] Nested resources never checking the parent id's office/org: `care-plans`, `progress-notes`, `master-week`, `billing-rates`, `documents-by-client/caregiver`, `certifications`, `compliance` (client/caregiver sub-resources)
- [ ] `GET /api/users/:id` — returns raw user row **including `passwordHash`**, no scope check at all — fix this one first if picking up here, it's a credential-exposure bug, not just tenant leakage
- [ ] `GET/PUT /api/documents/:id`, `/download`, `/view` — no tenant check except a special case for one document type; any other document (medical records, IDs) fetchable/downloadable cross-org by id

### Office config, EVV, medications, vitals, applicants, background checks (lines ~4500–9300)
- [ ] `GET/POST/PUT/DELETE /api/offices/:officeId/mcos`, `/licenses`, `/expenses`, `/dashboard-links`, `/payroll-config`, `/mco-rates` — officeId trusted from URL/query with no `canAccessOffice`-style check (contrast with `/api/offices/:officeId/staff`, which does this correctly a few dozen lines away — this is the reference to copy)
- [ ] `GET/PUT/DELETE /api/eligibility-checks/:id`, `/api/caregiver-compliance/:id`, `/api/evv-data/:id` (+ `GET /api/evv-data` officeId-trust)
- [ ] `PUT /api/admin/family-updates/:id/review`, `GET /api/admin/family-updates` — role-gated but no org check on the target record
- [ ] `GET/PUT/DELETE /api/authorizations/:id` — raw query, no clientId/office check; `POST /api/authorizations/bulk-import` — no role check at all
- [ ] `GET/PUT/DELETE /api/custom-roles/:id`-adjacent: `GET/PUT/DELETE /api/billing/:id`, `/api/payroll/:id` (+ `/line-items`) — financial data, no ownership check
- [ ] `GET/PUT/DELETE /api/admin/mcos[/:id]` — **no role check at all** despite `/admin/` prefix
- [ ] `GET/POST/PUT/DELETE /api/admin/settings[/:key]`, `/api/admin/field-configs`, `/api/admin/mco-types[/:id]` — **no role check at all** despite `/admin/` prefix
- [ ] `GET /api/admin/financial-reports` — role-gated but `officeId` not enforced for non-super-admins, leaks cross-org billing/AR data when omitted
- [ ] `POST /api/permissions/seed`-adjacent — already fixed above
- [ ] Every caregiver profile sub-resource never checks `:caregiverId` belongs to caller's office: notes, preferences, absences, availability(+exceptions), payroll-info (bank/tax data — high), expenses, paychecks (financial — high), rates, in-services, office-moves (can move a caregiver between offices with no check — high), schedules
- [ ] `POST /api/schedules/:id/clock-in`, `/clock-out` — no ownership check on the schedule; also emails PHI in-flow
- [x] ~~`GET /api/clients/:id/medications`, `GET/PATCH/DELETE /api/medications/:id`, `/log`, `/adherence`, `/logs`~~ — fixed, see above
- [x] ~~`GET/POST /api/clients/:id/vitals`, `/history`, `/trends`~~ — fixed, see above
- [ ] `GET /api/notifications/history` — `recipientId` trusted from query
- [ ] `GET/POST /api/applicants*`, `/interviews`, `/notes` — no ownership check (the `background-checks` family under applicants/caregivers is fixed, see above)
- [ ] `GET /api/mileage/pending` — returns all pending mileage system-wide; `/approve` — no org check on target log

### Payroll runs, PTO, performance reviews, shift matching (lines ~9100–13900)
- [ ] `GET/PUT/DELETE /api/payroll/:id`, `/api/payroll-line-items/:id`, `POST /api/payroll/:runId/import-hours`, `/calculate-overtime`, `GET .../export-hours[/pdf]`, `/time-entries` — no ownership check; export endpoints leak caregiver names/wages/ADP codes cross-org
- [ ] `GET/POST/PUT/DELETE /api/payroll-holidays` — officeId trusted, unenforced
- [ ] `GET /api/time-off-requests`, `/pending` — **zero scoping at all**, any role sees every org's requests
- [ ] `PATCH /api/time-off-requests/:id` — no ownership/role check, any authenticated user can edit any request
- [ ] `POST /api/time-off-requests/:id/cancel` — no role/ownership check (note: needs "owner OR admin" logic, not a flat role gate, since requesters cancel their own)
- [ ] `GET /api/caregivers/:id/time-off-requests`, `/pto-balance` — no ownership check
- [ ] `GET /api/pto-policies`, `/api/pto-balances[/export.csv]` — officeId trusted/no role check
- [ ] `GET /api/performance-reviews/:id/metrics`, `/calculate-rating` — no access check (sibling POST uses `assertReviewMutationAllowed` — reuse it)
- [ ] `POST /api/performance-reviews/:id/acknowledge` — no permission check, caller can override `caregiverId` in body
- [ ] `GET /api/shift-matching/suggest`, `calculate-score`, `check-conflict` — clientId/caregiverId unchecked
- [ ] `GET/POST /api/caregivers/:id/mileage`, `PATCH /api/mileage/:id` — no ownership check

### Claims, surveys, analytics, referrals, letter templates, coordinator pay (lines ~13700–18500)
- [x] ~~`GET/PATCH /api/claims/:id`, `DELETE /api/claims/:claimId/line-items/:id`, `/submit`, `/void`, `/resubmit`, `/line-items`~~ — fixed, see above
- [x] ~~`GET /api/claims`, `/aging`, `/summary`, `/by-client/:clientId`~~ — fixed, see above
- [ ] `GET /api/surveys/by-client/:clientId`, `/by-caregiver/:caregiverId`, `GET /api/surveys`, `/stats`, `PATCH /api/surveys/:id`, `POST /api/surveys/send-bulk` — PHI/no ownership check
- [ ] `GET /api/analytics/*` (kpis, operational, financial, compliance, staffing, dashboard, trends, forecast) — all trust client-supplied `officeId` (`parseOfficeId` helper), leaking org-wide financial/compliance aggregates
- [ ] `GET /api/pto-balances[/export.csv]` — officeId trusted (see also PTO section above)
- [ ] `POST /api/letter-templates/:id/generate` — no office/org check on template OR on the arbitrary `targetId` body param before rendering PHI into a PDF; only `isAuthenticated`, no role gate either
- [ ] `GET/PUT/DELETE /api/letter-templates/:id`, `/versions` — no ownership check
- [ ] `GET /api/coordinator-pay-records[/coordinator/:id][/:id]` — **no role check at all** on the GETs (siblings require admin/supervisor) — salary data
- [ ] `GET/PATCH/DELETE /api/referral-sources[/:id][/top][/:id/referrals]`, `GET/PATCH/POST /api/client-referrals[/:id][/convert]`, `GET /api/referral-stats` — officeId trusted / no ownership check throughout
- [ ] `POST /api/caregivers/:id/exclusion-check`, `GET /api/exclusions/caregiver/:caregiverId`, `GET /api/exclusions/checks`, `PATCH /api/exclusions/checks/:checkId` — admin-gated but no org/office check tying target back to caller's org
- [ ] `POST /api/admin/visit-log/upload` — matches against org-unscoped global client/caregiver lookups instead of the uploading admin's own org

### Payroll runs (dup group), shift-swap, e-signature, staff time tracking, DOH audits/QAPI/quality (lines ~18300–end)
- [ ] `GET /api/payroll-runs/:id` — no role check at all, no ownership check
- [ ] `GET /api/shift-swap-requests[/:id]` — officeId/caregiverId trusted; by-id route has zero ownership check and leaks linked client PHI
- [ ] `GET/PUT/DELETE /api/esignature/templates/:id`, `GET /api/esignature/requests/:id` — role-gated but no org check; request object leaks `recipientEmail`/`documentContent`/`signatureData`
- [ ] `GET /api/admin/export/quickbooks/billing`, `/payroll` — admin-gated but officeId trusted from query
- [ ] `GET /api/staff/time-records` — any manager role sees ALL time records system-wide (GPS, clock-in photos, IPs) — no officeId scoping
- [ ] `PATCH /api/staff/time-records/:id`, `/approve`, `/flag`, `POST /lock-payroll` — manager-gated but no officeId scoping, cross-org edit/approve/flag by guessable id
- [ ] `GET /api/staff/audit-logs`, `/ot-report` — manager-gated, no officeId scoping
- [ ] `POST/DELETE /api/kiosk/setup/:userId/pin` — manager-gated but never verifies `:userId` belongs to caller's org (**cross-tenant kiosk PIN takeover** — high)
- [ ] `GET /api/doh-audits`, `GET/PATCH/DELETE /api/doh-audits/:id`, `/responses`, `/documents*`, `/custom-items*` — zero ownership check; note `authorizeAuditAccess` (line ~21342 pre-edit) already exists and is correctly used for corrective-action sub-routes — **apply that same helper here**, it's a clear oversight, not a design gap
- [ ] `GET /api/supervisory-visits[/:id]`, `/api/policy-documents[/:id][/acknowledgments]`, `/api/qapi-meetings[/:id]`, `/api/infection-control[/:id]` — same pattern throughout: list trusts officeId, by-id has zero check
- [ ] `GET/PUT /api/clients/:clientId/emergency-plan`, `GET /api/emergency-plans` — no ownership check on a client's medical emergency plan
- [ ] `GET/PATCH/DELETE /api/client-surveys[/:id]`, `POST /api/client-surveys/:id/responses` — the POST has **no `isAuthenticated` at all** and uses a plain id rather than an unguessable token (contrast with the properly-tokened `/api/esign/:token` pattern)
- [ ] Quality-management family — `GET/POST /api/quality-management-plans`, `/qmp-measurable-outcomes`, `/qmp-quarterly-reviews`, `/qmp-oadri-cycles`, `/patient-complaints[-stats]`, `/quality-management-logs` — officeId trusted with zero enforcement (note: the single-record `GET/PATCH/DELETE .../:id` routes in this family compare against `user?.officeId`, which **does not exist on the session object** — it's always `undefined`, so those currently fail closed / block everyone; that's a separate functional bug worth fixing at the same time, not a leak)

### Lower priority / lower sensitivity (reference data, not PHI)
- [ ] `GET /api/offices/:officeId/pa-survey`, `PUT .../pa-survey/:checklistItemId` — officeId unchecked
- [ ] `GET/POST/PATCH/DELETE /api/shift-differentials*`, `/api/holidays*` — officeId/id unchecked, low-sensitivity rate/reference config
- [ ] `GET /api/birthday-notifications*` — officeId trusted, low sensitivity
- [ ] `GET /api/email-templates/type/:type` — no role check, but not tenant/PHI data (system templates)

---

## Notes for whoever picks this up next

- Reuse `resolveAllowedOfficeIds(req)` / `canAccessOffice(req, officeId)` (top of `registerRoutes`
  in `server/routes.ts`) — don't reinvent scoping per-route, that's exactly how this gap happened.
- For "no role check at all" findings, match the role list already used by the resource's sibling
  mutation routes where one exists (e.g. `["super_admin", "admin", "office_admin", "supervisor"]`)
  rather than inventing a new list per-endpoint.
- A few "list" endpoints only have a role check but not an office check on the *specific record* a
  sibling by-id route serves — fix both halves together (see the clients/caregivers fixes in this
  commit as the template: check on GET, PUT, and DELETE, not just one verb).
- Before merging any batch of fixes: run `npx tsc --noEmit`, push the schema to a fresh local
  Postgres (`npx drizzle-kit push --force`), boot the server against it and confirm `/health`
  responds, then run `npm test`. The CI workflow added in `.github/workflows/ci.yml` does the
  first three automatically on every PR.
- Some "cancel/self-service" endpoints (e.g. time-off cancel) need "owner OR admin" logic rather
  than a flat admin-only gate — read the intended UX before applying a blanket role check.
