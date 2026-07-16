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

## Fixed in a third pass (credential exposure + the DOH/quality-compliance cluster) — same verification as above

- [x] `GET /api/users/:id` — was returning the raw user row **including `passwordHash`**; now strips it from the response and adds a self-or-same-office check
- [x] `GET/POST /api/doh-audits`, `GET/PATCH/DELETE /api/doh-audits/:id`, `/responses`, `/documents/upload`, `GET /documents`, `GET/DELETE /documents/:docId`, `GET/POST/DELETE /custom-items[/:itemId]` — applied the existing `authorizeAuditAccess()` helper (it already existed, correctly used only on the corrective-action sub-routes — this was a clear oversight, not a design gap) plus `canAccessOffice` on the two officeId-driven list/create routes
- [x] `GET/POST/PATCH/DELETE /api/supervisory-visits[/:id]` — added `canAccessOffice` throughout; PATCH/DELETE previously didn't even fetch the record before mutating it
- [x] `GET/POST/PATCH/DELETE /api/policy-documents[/:id]`, `/acknowledgments`, `/acknowledge` — same treatment; the acknowledge routes didn't check the policy's office at all before
- [x] `GET/POST/PATCH/DELETE /api/qapi-meetings[/:id]` — same treatment
- [x] `GET/POST/PATCH/DELETE /api/infection-control[/:id]` — same treatment (PHI-adjacent: affected clients/staff)
- [x] `GET/PUT /api/clients/:clientId/emergency-plan`, `GET /api/emergency-plans` — added `getClientInScope`/`canAccessOffice` checks
- [x] `GET/POST/PATCH/DELETE /api/client-surveys[/:id]` — same treatment. **Not touched**: `POST /api/client-surveys/:id/responses` is intentionally unauthenticated (family/client respondents with no account) — it needs an unguessable token added to the schema, not a scope check; that's a small design decision, not a quick fix, so it's left for a deliberate follow-up rather than rushed here.

## Fixed in a fourth pass (admin config with zero role check + payroll/billing financials) — same verification as above

- [x] `POST/PUT/DELETE /api/admin/mco-types[/:id]` — added `requireAdminRole` (previously any authenticated user)
- [x] `GET/POST/PUT/DELETE /api/admin/mcos[/:id]` — added `requireAdminRole` + `canAccessOffice` (previously fully unscoped and ungated — mirrors the already-correct `GET /api/mcos` pattern)
- [x] `POST/PUT/DELETE /api/admin/settings[/:key]`, `/api/admin/field-configs[/:id]` — added `requireAdminRole` (previously any authenticated user could write global platform config)
- [x] `GET/POST/PUT/DELETE /api/billing[/:id]` — added `canAccessOffice`/office-scoped list, matching the `GET /api/clients` reference pattern
- [x] `GET/POST/PUT/DELETE /api/payroll[/:id]`, `/api/payroll-line-items/:id`, `POST /:runId/line-items`, `/import-hours`, `/calculate-overtime`, `GET /:runId/export-hours[/pdf]`, `/time-entries` — added `canAccessOffice` throughout; added `getPayrollLineItem()` to storage.ts since no single-item fetcher existed for the line-item ownership check
- [x] `GET/POST/PUT/DELETE /api/payroll-holidays[/:id]` — added `canAccessOffice`; added `getPayrollHoliday()` to storage.ts (PUT/DELETE didn't fetch the record before mutating it)

## Fixed in a fifth pass (the full caregiver profile sub-resource cluster) — same verification as above

Added a `getCaregiverInScope(req, caregiverId)` helper (mirrors `getClientInScope`) and applied it
across every caregiver profile sub-resource. Most of these tables had no single-record fetcher at
all, since nothing had ever needed to check ownership on them — added one for each in storage.ts:
`getCaregiverNote`, `getCaregiverPreference`, `getCaregiverAbsence`, `getCaregiverAvailabilityById`,
`getCaregiverExpense`, `getCaregiverPaycheck`, `getCaregiverRate`, `getCaregiverInService`,
`getCaregiverOfficeMove` (schedules already had one).

- [x] `GET/POST /api/caregivers/:caregiverId/notes`, `PUT/DELETE /api/caregiver-notes/:id`
- [x] `GET/POST /api/caregivers/:caregiverId/preferences`, `PUT/DELETE /api/caregiver-preferences/:id`
- [x] `GET/POST /api/caregivers/:caregiverId/absences`, `PUT/DELETE /api/caregiver-absences/:id`
- [x] `GET/POST/PUT/DELETE /api/caregivers/:caregiverId/availability[/:id]`, `GET/PUT /api/caregivers/:id/weekly-availability`
- [x] `GET/POST/DELETE /api/caregivers/:id/availability-exceptions[/:exceptionId]`
- [x] `GET/POST /api/caregivers/:caregiverId/payroll-info` (bank/tax data)
- [x] `GET/POST /api/caregivers/:caregiverId/expenses`, `PUT/DELETE /api/caregiver-expenses/:id`
- [x] `GET/POST /api/caregivers/:caregiverId/paychecks`, `PUT /api/caregiver-paychecks/:id` (financial data)
- [x] `GET/POST /api/caregivers/:caregiverId/rates`, `PUT/DELETE /api/caregiver-rates/:id`
- [x] `GET/POST /api/caregivers/:caregiverId/in-services`, `PUT/DELETE /api/caregiver-in-services/:id`
- [x] `GET/POST /api/caregivers/:caregiverId/office-moves`, `PUT /api/caregiver-office-moves/:id` (could previously move a caregiver between offices with no check at all)
- [x] `GET/POST /api/caregivers/:caregiverId/schedules`, `PUT/DELETE /api/caregiver-schedules/:id`
- [x] `POST /api/schedules/:id/clock-in`, `/clock-out` — these needed different logic from the rest of the cluster: clock-in is a **self-service** action a caregiver performs on their own schedule from the field (`evv-clock.tsx`), so a flat office-staff-only check would have broken it. Fixed with "requester is either the caregiver themselves (`caregiver.userId === session.user.id`) or office staff in scope."

## Fixed in a sixth pass (kiosk PIN, staff time-tracking, e-signature, QuickBooks export, shift-swap) — same verification as above

- [x] `POST/DELETE /api/kiosk/setup/:userId/pin` — added a target-user office check (**was cross-tenant kiosk PIN takeover**: a manager in one org could set/wipe the kiosk PIN of a user in another org, and since kiosk verify only checks username+PIN, effectively clock in as them)
- [x] `GET /api/staff/time-records` — manager branch now scoped to the caller's allowed offices (was ALL time records system-wide: GPS, clock-in photos, IPs)
- [x] `PATCH /api/staff/time-records/:id`, `/approve`, `/flag` — added `canAccessOffice` on the record before mutating
- [x] `POST /api/staff/time-records/lock-payroll` — restricted the bulk update to the caller's offices
- [x] `GET /api/staff/audit-logs` — joined through `staff_time_records` and scoped by office (plus an ownership check when a specific `timeRecordId` is requested)
- [x] `GET /api/staff/ot-report` — manager branch scoped to the caller's offices
- [x] `GET /api/admin/export/quickbooks/billing`, `/payroll` — added `canAccessOffice` on the client-supplied `officeId`
- [x] `GET/PUT/DELETE /api/esignature/templates/:id` — added `canAccessOffice` (templates carry officeId; leaked document content otherwise)
- [x] `GET /api/esignature/requests/:id` — scoped by sender-or-linked-template-office (requests carry no officeId; leaked recipientEmail/documentContent/signatureData)
- [x] `GET /api/payroll-runs/:id` — added `canAccessOffice` (was no role check and no ownership check)
- [x] `GET /api/shift-swap-requests` — non-super-admins now locked to their own office; `GET /api/shift-swap-requests/:id` — added `canAccessOffice` (by-id leaked linked client PHI)

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
- [x] ~~`GET /api/users/:id`~~ — fixed, see above
- [ ] `GET/PUT /api/documents/:id`, `/download`, `/view` — no tenant check except a special case for one document type; any other document (medical records, IDs) fetchable/downloadable cross-org by id

### Office config, EVV, medications, vitals, applicants, background checks (lines ~4500–9300)
- [ ] `GET/POST/PUT/DELETE /api/offices/:officeId/mcos`, `/licenses`, `/expenses`, `/dashboard-links`, `/payroll-config`, `/mco-rates` — officeId trusted from URL/query with no `canAccessOffice`-style check (contrast with `/api/offices/:officeId/staff`, which does this correctly a few dozen lines away — this is the reference to copy)
- [ ] `GET/PUT/DELETE /api/eligibility-checks/:id`, `/api/caregiver-compliance/:id`, `/api/evv-data/:id` (+ `GET /api/evv-data` officeId-trust)
- [ ] `PUT /api/admin/family-updates/:id/review`, `GET /api/admin/family-updates` — role-gated but no org check on the target record
- [ ] `GET/PUT/DELETE /api/authorizations/:id` — raw query, no clientId/office check; `POST /api/authorizations/bulk-import` — no role check at all
- [x] ~~`GET/PUT/DELETE /api/billing/:id`, `/api/payroll/:id` (+ `/line-items`)~~ — fixed, see above
- [x] ~~`GET/PUT/DELETE /api/admin/mcos[/:id]`~~ — fixed, see above
- [x] ~~`GET/POST/PUT/DELETE /api/admin/settings[/:key]`, `/api/admin/field-configs`, `/api/admin/mco-types[/:id]`~~ — fixed, see above
- [ ] `GET /api/admin/financial-reports` — role-gated but `officeId` not enforced for non-super-admins, leaks cross-org billing/AR data when omitted
- [x] ~~Every caregiver profile sub-resource: notes, preferences, absences, availability(+exceptions), payroll-info, expenses, paychecks, rates, in-services, office-moves, schedules~~ — fixed, see above
- [x] ~~`POST /api/schedules/:id/clock-in`, `/clock-out`~~ — fixed, see above (note: the "emails PHI in-flow" behavior on clock-out is by design — an EVV confirmation email — not a bug)
- [x] ~~`GET /api/clients/:id/medications`, `GET/PATCH/DELETE /api/medications/:id`, `/log`, `/adherence`, `/logs`~~ — fixed, see above
- [x] ~~`GET/POST /api/clients/:id/vitals`, `/history`, `/trends`~~ — fixed, see above
- [ ] `GET /api/notifications/history` — `recipientId` trusted from query
- [ ] `GET/POST /api/applicants*`, `/interviews`, `/notes` — no ownership check (the `background-checks` family under applicants/caregivers is fixed, see above)
- [ ] `GET /api/mileage/pending` — returns all pending mileage system-wide; `/approve` — no org check on target log

### Payroll runs, PTO, performance reviews, shift matching (lines ~9100–13900)
- [x] ~~`GET/PUT/DELETE /api/payroll/:id`, `/api/payroll-line-items/:id`, `POST /api/payroll/:runId/import-hours`, `/calculate-overtime`, `GET .../export-hours[/pdf]`, `/time-entries`~~ — fixed, see above
- [x] ~~`GET/POST/PUT/DELETE /api/payroll-holidays`~~ — fixed, see above
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
- [x] ~~`GET /api/payroll-runs/:id`~~ — fixed, see above
- [x] ~~`GET /api/shift-swap-requests[/:id]`~~ — fixed, see above
- [x] ~~`GET/PUT/DELETE /api/esignature/templates/:id`, `GET /api/esignature/requests/:id`~~ — fixed, see above
- [x] ~~`GET /api/admin/export/quickbooks/billing`, `/payroll`~~ — fixed, see above
- [x] ~~`GET /api/staff/time-records`~~ — fixed, see above
- [x] ~~`PATCH /api/staff/time-records/:id`, `/approve`, `/flag`, `POST /lock-payroll`~~ — fixed, see above
- [x] ~~`GET /api/staff/audit-logs`, `/ot-report`~~ — fixed, see above
- [x] ~~`POST/DELETE /api/kiosk/setup/:userId/pin`~~ — fixed, see above (**was cross-tenant kiosk PIN takeover**)
- [x] ~~`GET /api/doh-audits`, `GET/PATCH/DELETE /api/doh-audits/:id`, `/responses`, `/documents*`, `/custom-items*`~~ — fixed, see above
- [x] ~~`GET /api/supervisory-visits[/:id]`, `/api/policy-documents[/:id][/acknowledgments]`, `/api/qapi-meetings[/:id]`, `/api/infection-control[/:id]`~~ — fixed, see above
- [x] ~~`GET/PUT /api/clients/:clientId/emergency-plan`, `GET /api/emergency-plans`~~ — fixed, see above
- [x] ~~`GET/PATCH/DELETE /api/client-surveys[/:id]`~~ — fixed, see above. `POST /api/client-surveys/:id/responses` still needs a token redesign (tracked above, not a quick fix)
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
