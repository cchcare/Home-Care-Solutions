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

## Fixed in a seventh pass (the office-config cluster + financial reports) — same verification as above

- [x] `GET/POST/PUT/DELETE /api/offices/:officeId/mcos[/:id]` — added `canAccessOffice(req.params.officeId)` guard
- [x] `GET/POST/PUT/DELETE /api/offices/:officeId/licenses[/:id]` — same
- [x] `GET/POST/PUT/DELETE /api/offices/:officeId/expenses[/:id]` — same
- [x] `GET/POST /api/offices/:officeId/dashboard-links` + `PATCH/DELETE /api/dashboard-links/:id` — path-office guard on the office routes; the by-id routes fetch the link and check its office (they take no officeId in the path)
- [x] `GET/POST /api/offices/:officeId/payroll-config` — added path-office guard
- [x] `GET/POST/PUT/DELETE /api/offices/:officeId/mco-rates[/:id]` — added path-office guard
- [x] `GET/PUT /api/offices/:officeId/pa-survey[/:checklistItemId]` — added path-office guard
- [x] `GET /api/admin/financial-reports` — non-super-admins now locked to their own office (was leaking cross-org billing/AR aggregates when `officeId` was omitted)

## Fixed in an eighth pass (analytics, surveys, referrals, coordinator pay, letter templates) — same verification as above

- [x] Made the shared `parseOfficeId(req)` helper scope-aware: super_admin may query any office (or all when omitted), everyone else is forced to their own `primaryOfficeId`, and a non-super-admin with no office gets a sentinel matching no rows. This fixes all 8 `/api/analytics/*` endpoints (kpis, operational, financial, compliance, staffing, trends, forecast, dashboard) at once — they leaked org-wide financial/compliance/staffing aggregates before.
- [x] `GET /api/surveys`, `/stats` — now use scope-aware `parseOfficeId`; `GET /api/surveys/by-client/:clientId`, `/by-caregiver/:caregiverId` — added `getClientInScope`/`getCaregiverInScope`; `PATCH /api/surveys/:id` — added `canAccessOffice`; `POST /api/surveys/send-bulk` — per-client lookup now uses `getClientInScope` (was blasting surveys to any org's clients by id)
- [x] Referral sources (`GET` list/top/:id/:id-referrals, `PATCH`, `DELETE`) and referral stats — scoped by office; client referrals (`GET` list/:id, `PATCH`, `POST /:id/convert`) — added a `getClientReferralInScope` helper that resolves office through the linked referral source
- [x] `GET /api/coordinator-pay-records`, `/coordinator/:coordinatorId`, `/:id` — added the manager-role gate the create/update/delete siblings already had (salary data was readable by any authenticated user), plus office scoping; `PATCH`/`DELETE` — added an office-ownership check on the record
- [x] Letter templates: added a `canAccessLetterTemplate` helper (allows shared null-office library templates, else checks office). Applied to `GET /:id`, `/:id/versions`, `PATCH`, `DELETE`, and the list. `POST /:id/generate` was the worst — only `isAuthenticated`, no role gate, and it rendered any caregiver/client/staff's PHI into a PDF from an arbitrary `targetId`. Now role-gated, template-scoped, and each `targetId` is resolved through `getCaregiverInScope`/`getClientInScope`/office-checked staff lookup.

## Fixed in a ninth pass (time-off, PTO, mileage, performance reviews) — same verification as above

- [x] Added `allowedCaregiverIds(req)` helper (resolves the set of caregiver IDs in the caller's offices) for scoping lists that key off caregiverId but carry no officeId.
- [x] `GET /api/time-off-requests`, `/pending` — were `getAllTimeOffRequests()`/`ByStatus` with **zero scoping**; now filtered to the caller's caregivers. Added `canAccessTimeOffRequest` (own caregiver or office staff in scope) applied to `GET /:id`, `PATCH /:id`, `POST /:id/cancel`.
- [x] `GET /api/caregivers/:id/time-off-requests`, `/pto-balance` — added `getCaregiverInScope`
- [x] `GET /api/pto-policies` — added the admin-role gate its mutation siblings had, plus scope-aware `parseOfficeId`; `GET /api/pto-balances`, `/export.csv` — officeId now forced via `parseOfficeId` (was admin-gated but trusted the query param)
- [x] `GET/POST /api/caregivers/:id/mileage` — added `getCaregiverInScope`; `PATCH /api/mileage/:id`, `POST /:id/approve` — resolve the log's caregiver and check scope; `GET /api/mileage/pending` — filtered to the caller's caregivers (was all pending system-wide)
- [x] `GET /api/performance-reviews/:id/metrics`, `/calculate-rating` — added a `canReadPerformanceReview` scope check (reviewer, in-office staff, or the caregiver themselves); `POST /:id/acknowledge` — was letting a caller acknowledge as anyone via a body `caregiverId`; now only the reviewed caregiver may acknowledge, using the review's own caregiverId

## Fixed in a tenth pass (documents, messages/compliance/incidents, office-config, eligibility/EVV/authorizations, applicants, shift-matching, exclusions, reference data) — same verification as above

- [x] **Systemic bug found and fixed: `req.user` was never populated.** This app authenticates via `server/localAuth.ts` (session-based — `isAuthenticated` only checks `req.session.user`). A separate, unused `server/replitAuth.ts` (old Replit OIDC flow, not wired into `registerRoutes`) is the only place that ever sets `req.user` via passport. Because `@types/passport` is still an installed dependency, `req.user` type-checked fine everywhere it was used, but at runtime it was **always `undefined`** — so every `if (!user || !allowedRoles.includes(user.role))` gate built on `req.user` threw on `user.role` and 500'd, or fell through `!user` and always returned 403. Net effect: roughly **47 call sites** across email-templates (super-admin-only template management), help-articles, e-signature templates/requests, custom-integrations, and others were **completely non-functional for every user, including super_admin** — not a security leak (fail-closed via exception/403), but a total feature outage. Fixed by replacing every `req.user` reference with `(req.session as any)?.user` (verified via full-file grep that no `req.user =` assignment exists in `routes.ts`, so a blanket replace was safe).
- [x] Documents cluster (`GET/PUT /api/documents/:id`, `/download`, `/view`, `GET /api/documents`, `/caregivers/:id/documents`, `/clients/:id/documents`) — added `getDocumentOfficeId`/`canAccessDocument` helpers (resolves office via the document's own `officeId` or, failing that, its linked client/caregiver/user). Also fixed `POST /api/documents/upload`: it trusted a client-supplied `officeId` outright and read `session.user.officeId` (a property that doesn't exist — should be `primaryOfficeId`, the same recurring bug pattern as the quality-management fix); now validates the linked client/caregiver/office are all in the uploader's scope.
- [x] `GET/POST /api/clients/:clientId/progress-notes` — added `getClientInScope`
- [x] `PATCH /api/messages/:id` — had **zero ownership check**, any authenticated user could rewrite any other user's message; added a sender-or-recipient check (mirrors the already-correct logic in `storage.updateMessageStatus`)
- [x] `GET/POST/PUT /api/caregivers/:caregiverId/certifications`, `/compliance` — added `getCaregiverInScope`; `GET/PUT /api/compliance[/:id]` — scope-aware `parseOfficeId` + `canAccessOffice`; `GET/PUT /api/trainings[/:id]` — same (null `officeId` treated as a shared/global training, like the letter-templates library pattern)
- [x] Master Week Templates/Slots (`/api/clients/:clientId/master-week`, `/api/master-week/:templateId/slots[/...]`) — added a `getMasterWeekTemplateInScope` helper (resolves office via the template's client) applied throughout, including the slot delete route
- [x] `GET/PUT /api/incident-reports/:id`, incident follow-ups (`/api/incidents/:id/follow-ups`, `PATCH /api/follow-ups/:id`, `/complete`, `GET /overdue`) — added a `getIncidentInScope` helper; `GET /api/incident-reports` list — officeId now forced via `parseOfficeId`
- [x] `GET /api/dashboard/metrics`, `/monthly-stats`, `/api/reports/schedule-overlaps` — officeId now forced via `parseOfficeId`; `GET /api/admin/care-quality-metrics` — was **fail-closed for everyone** (`req.user` bug) and also trusted a client-supplied officeId; fixed both
- [x] `GET/PUT/DELETE /api/tasks[/:id]` — `?userId=` let any user read another user's tasks; added a `canAccessTask` helper (assignee/creator or office-scope) and an ownership check on PUT/DELETE (neither existed before)
- [x] `POST/PUT/DELETE /api/offices[/:id]` — had **zero role check**, any authenticated user (including a caregiver) could create/edit/delete an office; added `requireAdminRole` + `canAccessOffice`, and non-super-admins can no longer set/move an office's `organizationId`. `GET /api/offices/:id` — added `canAccessOffice` (was fetchable cross-org by id)
- [x] `GET/POST /api/clients/:clientId/communications`, `DELETE /api/communications/:id` — added `getClientInScope`; added a `getClientCommunication` single-record getter (didn't exist) for the delete route's ownership check
- [x] `GET/POST /api/offices/:officeId/billing-rates`, `PUT/DELETE /api/billing-rates/:id` — added `canAccessOffice`/office-check throughout (the by-id routes didn't fetch the record before mutating)
- [x] Care plans cluster (`/api/clients/:clientId/care-plans`, `/api/care-plans/:id/goals[/:goalId]`, `/interventions[/:interventionId]`) — added `getCarePlanInScope` (resolves office via the plan's client) and per-child ownership checks (a goal/intervention id had to belong to the care plan id in the URL, not just exist)
- [x] `GET/PUT /api/admin/family-updates[/:id/review]` — added `getClientInScope` on the linked client (was admin-role-gated only, no check that the client belonged to the admin's own org)
- [x] Client authorizations (`/api/clients/:clientId/authorizations`, `/api/authorizations/:id`, `/bulk-import`) — added `getClientInScope`/`getAuthorizationInScope`; bulk-import now requires admin role and validates each row's resolved client against the caller's scope (was a global `memberId` lookup with a client-supplied `officeId` — cross-org data injection)
- [x] Eligibility checks (`/api/clients/:clientId/eligibility-checks`, `/api/eligibility-checks/:id`, `/eligibility`, `/eligibility/latest`, `/eligibility/check`, `/eligibility/schedule`, `PUT /eligibility/status`) — added `getClientInScope`/`getEligibilityCheckInScope` throughout; every one of these had no ownership check at all before
- [x] Caregiver compliance (`/api/caregivers/:caregiverId/compliance`, `/api/caregiver-compliance/:id`) — added `getCaregiverComplianceInScope`
- [x] EVV data (`/api/evv-data[/:id]`) — officeId now forced via `parseOfficeId`/`canAccessOffice` on list, by-id, create, update, delete (previously fully client-supplied with no check)
- [x] `GET /api/notifications/history` — `recipientId`/`recipientType` now validated against the caller's scope (client/caregiver/user); the unscoped "all history" view (no recipient given) is now super_admin-only, since notification bodies can carry PHI and there's no officeId column to filter on
- [x] Applicants cluster (`/api/applicants[...]`, notes, interviews, by-status, pipeline) — added a `getApplicantInScope` helper applied throughout; list/pipeline/by-status now use scope-aware `parseOfficeId`
- [x] `GET/POST /api/shift-matching/suggest`, `/calculate-score`, `/check-conflict` — added `getClientInScope`/`getCaregiverInScope` (previously any authenticated user could probe schedule conflicts/match scores for any org's caregiver or client by id)
- [x] Exclusion checks (`/api/caregivers/:id/exclusion-check`, `/api/exclusions/checks`, `/caregiver/:caregiverId`, `PATCH /checks/:checkId`, false-positives) — added `getCaregiverInScope` throughout (was admin-gated but had no org check tying the target caregiver back to the caller's org); added `getCaregiverExclusionCheck`/`getCaregiverFalsePositive` single-record getters (didn't exist)
- [x] `POST /api/admin/visit-log/upload` — was matching admission/assignment IDs against **every org's** clients/caregivers; now scoped to the uploader's own office(s) via `resolveAllowedOfficeIds`
- [x] Reference-data cluster (`/api/shift-differentials[/:id]`, `/calculate`, `/api/holidays[/:id]`, `/check`, `/api/birthday-notifications[...]`) — added `requireAdminRole`/`canAccessOffice`/`parseOfficeId` throughout, treating a null `officeId` as a shared/library row (consistent with the letter-templates and trainings pattern). `birthday-notifications/send`, `/settings`, `/preview` were also hit by the `req.user` bug above (fail-closed for everyone) — fixed as part of the same pass.

Everything below this line is **not yet fixed** and needs the same treatment:
read the actual route, apply `canAccessOffice`/`resolveAllowedOfficeIds` (or a role gate, or
both), verify against a real Postgres instance, and check off the line.

---

## Remaining — grouped by module, in file order

### Users, messages, compliance, incidents (lines ~1–4700)
- [x] ~~`PATCH /api/messages/:id`~~ — fixed, see above (sender-or-recipient check)
- [x] ~~`PUT /api/compliance/:id`~~ — fixed, see above
- [x] ~~`PUT /api/trainings/:id`~~ — fixed, see above
- [x] ~~`GET /api/incident-reports/:id`, `PUT /api/incident-reports/:id`~~ — fixed, see above
- [x] ~~`PATCH /api/follow-ups/:id`~~ — fixed, see above
- [x] ~~`GET /api/dashboard/metrics`, `/api/dashboard/monthly-stats`, `/api/admin/care-quality-metrics`, `/api/reports/schedule-overlaps`, `/api/incident-reports`, `/api/compliance`, `/api/trainings`, `/api/tasks`~~ — fixed, see above
- [x] ~~`POST/PUT/DELETE /api/offices`, `DELETE /api/communications/:id`~~ — fixed, see above (`/api/coordinators/*` was already hardened in the Coordinator Compensation build)
- [x] ~~Nested resources never checking the parent id's office/org: `care-plans`, `progress-notes`, `master-week`, `billing-rates`, `documents-by-client/caregiver`, `certifications`, `compliance` (client/caregiver sub-resources)~~ — fixed, see above
- [x] ~~`GET /api/users/:id`~~ — fixed, see above
- [x] ~~`GET/PUT /api/documents/:id`, `/download`, `/view`~~ — fixed, see above

### Office config, EVV, medications, vitals, applicants, background checks (lines ~4500–9300)
- [x] ~~`GET/POST/PUT/DELETE /api/offices/:officeId/mcos`, `/licenses`, `/expenses`, `/dashboard-links`, `/payroll-config`, `/mco-rates`~~ — fixed, see above
- [x] ~~`GET/PUT/DELETE /api/eligibility-checks/:id`, `/api/caregiver-compliance/:id`, `/api/evv-data/:id` (+ `GET /api/evv-data` officeId-trust)~~ — fixed, see above
- [x] ~~`PUT /api/admin/family-updates/:id/review`, `GET /api/admin/family-updates`~~ — fixed, see above
- [x] ~~`GET/PUT/DELETE /api/authorizations/:id`, `POST /api/authorizations/bulk-import`~~ — fixed, see above
- [x] ~~`GET/PUT/DELETE /api/billing/:id`, `/api/payroll/:id` (+ `/line-items`)~~ — fixed, see above
- [x] ~~`GET/PUT/DELETE /api/admin/mcos[/:id]`~~ — fixed, see above
- [x] ~~`GET/POST/PUT/DELETE /api/admin/settings[/:key]`, `/api/admin/field-configs`, `/api/admin/mco-types[/:id]`~~ — fixed, see above
- [x] ~~`GET /api/admin/financial-reports`~~ — fixed, see above
- [x] ~~Every caregiver profile sub-resource: notes, preferences, absences, availability(+exceptions), payroll-info, expenses, paychecks, rates, in-services, office-moves, schedules~~ — fixed, see above
- [x] ~~`POST /api/schedules/:id/clock-in`, `/clock-out`~~ — fixed, see above (note: the "emails PHI in-flow" behavior on clock-out is by design — an EVV confirmation email — not a bug)
- [x] ~~`GET /api/clients/:id/medications`, `GET/PATCH/DELETE /api/medications/:id`, `/log`, `/adherence`, `/logs`~~ — fixed, see above
- [x] ~~`GET/POST /api/clients/:id/vitals`, `/history`, `/trends`~~ — fixed, see above
- [x] ~~`GET /api/notifications/history`~~ — fixed, see above
- [x] ~~`GET/POST /api/applicants*`, `/interviews`, `/notes`~~ — fixed, see above
- [x] ~~`GET /api/mileage/pending`, `/approve`~~ — fixed, see above

### Payroll runs, PTO, performance reviews, shift matching (lines ~9100–13900)
- [x] ~~`GET/PUT/DELETE /api/payroll/:id`, `/api/payroll-line-items/:id`, `POST /api/payroll/:runId/import-hours`, `/calculate-overtime`, `GET .../export-hours[/pdf]`, `/time-entries`~~ — fixed, see above
- [x] ~~`GET/POST/PUT/DELETE /api/payroll-holidays`~~ — fixed, see above
- [x] ~~`GET /api/time-off-requests`, `/pending`~~ — fixed, see above
- [x] ~~`PATCH /api/time-off-requests/:id`~~ — fixed, see above
- [x] ~~`POST /api/time-off-requests/:id/cancel`~~ — fixed, see above (owner-or-office-staff logic)
- [x] ~~`GET /api/caregivers/:id/time-off-requests`, `/pto-balance`~~ — fixed, see above
- [x] ~~`GET /api/pto-policies`, `/api/pto-balances[/export.csv]`~~ — fixed, see above
- [x] ~~`GET /api/performance-reviews/:id/metrics`, `/calculate-rating`~~ — fixed, see above
- [x] ~~`POST /api/performance-reviews/:id/acknowledge`~~ — fixed, see above
- [x] ~~`GET /api/shift-matching/suggest`, `calculate-score`, `check-conflict`~~ — fixed, see above
- [x] ~~`GET/POST /api/caregivers/:id/mileage`, `PATCH /api/mileage/:id`~~ — fixed, see above

### Claims, surveys, analytics, referrals, letter templates, coordinator pay (lines ~13700–18500)
- [x] ~~`GET/PATCH /api/claims/:id`, `DELETE /api/claims/:claimId/line-items/:id`, `/submit`, `/void`, `/resubmit`, `/line-items`~~ — fixed, see above
- [x] ~~`GET /api/claims`, `/aging`, `/summary`, `/by-client/:clientId`~~ — fixed, see above
- [x] ~~`GET /api/surveys/by-client/:clientId`, `/by-caregiver/:caregiverId`, `GET /api/surveys`, `/stats`, `PATCH /api/surveys/:id`, `POST /api/surveys/send-bulk`~~ — fixed, see above
- [x] ~~`GET /api/analytics/*`~~ — fixed, see above (made `parseOfficeId` scope-aware)
- [x] ~~`GET /api/pto-balances[/export.csv]`~~ — fixed, see above
- [x] ~~`POST /api/letter-templates/:id/generate`~~ — fixed, see above
- [x] ~~`GET/PUT/DELETE /api/letter-templates/:id`, `/versions`~~ — fixed, see above
- [x] ~~`GET /api/coordinator-pay-records[/coordinator/:id][/:id]`~~ — fixed, see above
- [x] ~~`GET/PATCH/DELETE /api/referral-sources[...]`, `GET/PATCH/POST /api/client-referrals[...]`, `GET /api/referral-stats`~~ — fixed, see above
- [x] ~~`POST /api/caregivers/:id/exclusion-check`, `GET /api/exclusions/caregiver/:caregiverId`, `GET /api/exclusions/checks`, `PATCH /api/exclusions/checks/:checkId`~~ — fixed, see above
- [x] ~~`POST /api/admin/visit-log/upload`~~ — fixed, see above

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
- [x] ~~`GET/PATCH/DELETE /api/client-surveys[/:id]`~~ — fixed, see above. `POST /api/client-surveys/:id/responses` — **fixed in an eleventh pass**: added an `accessToken` column to `client_satisfaction_surveys` (generated on create, same `crypto.randomBytes(32).toString('hex')` pattern as the existing `surveys`/`accessToken` system); replaced the unauthenticated, unvalidated `/:id/responses` route (any authenticated-or-not caller could post an arbitrary body against any survey UUID, with zero schema validation and no way to know if it was even open for responses) with `GET /api/public/client-surveys/:token` + `POST /api/public/client-surveys/:token/responses`, which resolve the survey via the token, require `status === "active"`, validate the body with `insertClientSurveyResponseSchema`, and cross-check any supplied `clientId` against the survey's own office. Note: there is still no public survey-taking frontend page for either this or the sibling `surveys`/`accessToken` system — that's a frontend feature to build later, not a security gap (the backend endpoints are now safe to call once a page exists).
- [x] ~~Quality-management family (plans, measurable-outcomes, quarterly-reviews, oadri-cycles, patient-complaints[-stats], quality-management-logs)~~ — fixed. Every route in this family compared against `user?.officeId` (which doesn't exist on the session → always undefined): the list/create routes leaked/defaulted to a client-supplied officeId, and the by-id routes fail-closed 403'd everyone. Replaced with scope-aware `parseOfficeId` on lists, `canAccessOffice` on by-id routes, and caller's-office-on-create — fixing both the leak and the functional bug in one pass.

### Lower priority / lower sensitivity (reference data, not PHI)
- [x] ~~`GET /api/offices/:officeId/pa-survey`, `PUT .../pa-survey/:checklistItemId`~~ — fixed, see above
- [x] ~~`GET/POST/PATCH/DELETE /api/shift-differentials*`, `/api/holidays*`~~ — fixed, see above
- [x] ~~`GET /api/birthday-notifications*`~~ — fixed, see above
- [x] `GET /api/email-templates/type/:type` — intentionally left as-is: system templates, not tenant/PHI data (unchanged from original audit note)

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
