# Pennsylvania Home Care & MCO Compliance — Gap Analysis

**Scope confirmed with the agency:** non-medical home care agency licensed under **28 Pa. Code Chapter 611**
(not a Chapter 601 skilled home health agency), billing PA Medicaid MCOs under **Community HealthChoices
(CHC)** — AmeriHealth Caritas / Keystone First CHC, PA Health & Wellness, and UPMC Community HealthChoices.
EVV is already submitted to the state aggregator (HHAeXchange) through a channel outside this app.

**Important caveat:** this document is engineering research, not legal advice. Every citation below was
pulled from primary or near-primary sources (PA Code, PA DHS/OLTL pages, MCO provider manuals, CMS/Medicaid.gov),
but PA Medicaid managed-care rules change frequently and several source PDFs could not be fully parsed during
research (flagged inline). Anything that would become hard business logic (a deadline, a billing code, a
cadence) should be confirmed directly with DOH, OLTL, or the relevant MCO's current provider manual before
being built.

---

## 1. What's already in place

The app already has substantial, genuinely PA-specific compliance tooling. No action needed on these —
listed here so a developer extending any of the gaps below knows what to build on top of.

| Area | What it does | Where |
|---|---|---|
| Exclusion screening | Automated OIG LEIE, SAM.gov, and PA MediCheck pulls, twice-monthly (1st & 15th) — exceeds the MCO-required monthly cadence. NPI → license# → exact-name → fuzzy-name matching. | `server/exclusion-service.ts`, cron in `server/scheduler.ts` |
| DOH survey checklist | Seeded with real regulation citations: 28 Pa. Code §§ 611.51–611.58 (personnel records, clearances, TB testing, training, care plans, incident reporting, HIPAA/infection-control/emergency-prep/complaint/QA policies) and 23 Pa.C.S. § 6344 (child abuse clearances). | `pa_survey_checklist_items` / `office_pa_survey_statuses`, seed data in `server/storage.ts:4579-4598` |
| Background check tracking | PA-specific check types: `fbi_fingerprint`, `state_criminal`, `child_abuse`, `adult_protective`, `sex_offender`, `oig_exclusion` — matches OAPSA/Act 169. | `background_checks` table, `shared/schema.ts:2761` |
| Survey Readiness Hub | Computed 0–100 readiness score; flags background-check age, TB test/CPR expiry, supervisory-visit gaps, policy-acknowledgment gaps, missing emergency plans, and overdue DOH CIR submissions. One-click reminder emails + printable report. | `GET /api/survey-readiness`, `server/routes.ts:23575-23712`, `client/src/pages/survey-readiness.tsx` / `survey-readiness-print.tsx` |
| Expiration alerts | Daily scan of caregiver compliance items (background checks, TB, CPR, etc.) and client Medicaid/SNAP expiry, configurable alert thresholds (default 30/14/7/1 days), email + SMS. | `server/expiration-alert-service.ts`, cron in `server/scheduler.ts` |
| Critical incident tracking | Severity/category classification, CIR Class I/II with computed DOH deadline, follow-ups with due dates and status. | `incident_reports`, `incident_follow_ups`, `client/src/pages/incidents.tsx` |
| Claims lifecycle | draft → submit → process → paid/denied/void/resubmit, resubmission chain, aging report. | `claims` / `claim_line_items`, `server/routes.ts:16557-16654` |
| Eligibility checks | Scheduled recurring checks (weekly/monthly/quarterly), PROMISe-portal-referenced verification source. | `eligibility_checks` / `eligibility_schedule`, `shared/schema.ts:2362,2402` |
| HR/wage compliance | FLSA weekly-40hr overtime split (also in the newer Coordinator Compensation module), PTO accrual engine, mileage reimbursement, e-signature infrastructure, configurable onboarding/offboarding workflows. | `pto-service.ts`, `comp_*` tables, `esignature_templates`, `onboarding_templates` |

---

## 2. Gaps, in priority order

Each item: what's missing, why it matters (with citation), and where it would plug into the existing codebase.

### Tier 1 — concrete, high-value, directly tied to CHC billing

**2.1 — MCO records are unconfigured.**
`mcos` and `mco_types` tables exist (`shared/schema.ts:1271,1285`) with full support for per-office,
per-service-code billing rates, but **no MCO is actually seeded anywhere in the codebase** — the only place
the names AmeriHealth Caritas, Keystone First, or UPMC Community HealthChoices appear at all is inside a
static training-quiz HTML page (`client/public/tools/staff-training.html`), as a trivia question, not
configuration. Seeding the three real CHC-MCOs would let `office_mco_billing_rates`, `client_authorizations`,
and `claims` reference real payers instead of ad hoc admin-entered free text.
*Recommended action:* seed AmeriHealth Caritas / Keystone First CHC, PA Health & Wellness, and UPMC Community
HealthChoices as `mcos` records for each office that bills them.

**2.2 — No Service-Coordinator incident-notification tracking for CHC clients.**
The existing incident model (`incident_reports.cirClass`: `class_1`/`class_2`, with `dohReportDue` /
`dohSubmissionStatus`, `client/src/pages/incidents.tsx:961`) computes a **24-hour (Class I) / 5-calendar-day
(Class II) DOH submission deadline**. Research could not confirm this exact Class I/II, 24hr/5-day framework
is what 28 Pa. Code Chapter 611 actually imposes on non-medical home care agencies — it may have been modeled
on a different license type (personal care home / assisted living residence rules under 55 Pa. Code Ch.
2600/2800, which do use a Class I/II scheme). Separately — and this is the part that's clearly missing
regardless of that ambiguity — for **CHC waiver participants specifically**, the real required path is:
report the incident to the participant's Service Coordinator within 24 hours of discovery; the SC/MCO (not
the provider) then investigates and logs it in the state's Enterprise Incident Management (EIM) system, with
abuse/neglect/exploitation categories separately routed to Adult Protective Services under OAPSA.
There is currently no field anywhere for "which Service Coordinator was notified, when, for this incident."
*Recommended action:* add SC-notification fields (SC name/contact, notified-at timestamp, computed 24-hour
deadline) to `incident_reports` **alongside** the existing DOH fields, not replacing them — a single incident
may need both, depending on whether the affected client is a CHC waiver participant. Before finalizing
category-specific timeframes (e.g., whether death or elopement carry a stricter window than the general
24-hour rule), get a clean copy of the OLTL Critical Incident Management Bulletin directly — the source PDF
returned as unparseable binary during this research and could not be independently verified
(`https://www.pa.gov/content/dam/copapwp-pagov/en/dhs/documents/docs/publications/documents/forms-and-pubs-oltl/Critical-Incident-Management-Bulletin.pdf`).

**2.3 — No claims timely-filing alerting.**
CHC-MCO provider manuals (Keystone First CHC, AmeriHealth Caritas PA CHC, and the general PA Health & Wellness
pattern) confirm a **180-calendar-day timely filing deadline** from date of service. The existing `claims`
aging report (`GET /api/claims/aging`) surfaces how old unpaid claims are, but nothing proactively flags a
claim that's approaching the 180-day cutoff the way `expiration-alert-service.ts` already does for
certifications and background checks.
*Recommended action:* extend the same expiration-alert pattern to claims with `status` still in a
pre-submission state as they approach 180 days from `serviceDate`.

**2.4 — Authorizations aren't linked to care plans.**
`client_authorizations` (authorization #, approved vs. used hours, start/end/renewal dates, linked to `mcos`
and `clients`) and `care_plans` / `care_plan_goals` / `care_plan_interventions`
(`shared/schema.ts:252-300`) are two entirely separate features with no foreign-key relationship. Under CHC,
every participant has a **Person-Centered Service Plan (PCSP)** that combines the care-management plan and
the authorized-hours LTSS services plan — the 2022 CHC Agreement requires MCOs to decide authorization
requests within **2 business days**, and participants undergo a full reassessment **at least every 12
months**. None of that SLA/cadence is currently tracked.
*Recommended action:* add a FK linking `client_authorizations` to a `care_plans` record, and add reminders for
(a) the 12-month reassessment cycle and (b) authorizations nearing their end date, following the existing
`expiration-alert-service.ts` pattern.

### Tier 2 — audit/licensing risk, less immediately financial

**2.5 — No agency-level credentialing/recredentialing tracker.**
Individual staff certifications are tracked in detail (`caregiver_compliance`), but nothing tracks the
**agency's own** PA Medicaid PROMISe enrollment revalidation (a federal 5-year cycle, confirmed via CMS/DHS
guidance, submitted at least 60 days before the due date) or each MCO's separate recredentialing cycle
(commonly ~3 years under NCQA-aligned standards and 42 CFR § 438.214, though this session could not confirm
the exact cycle length verbatim for AmeriHealth Caritas, PA Health & Wellness, or UPMC specifically — check
each MCO's provider manual, Credentialing chapter, directly).
*Recommended action:* a simple per-office, per-payer (PROMISe + each MCO) credentialing-date tracker with the
same expiration-alert pattern used elsewhere.

**2.6 — No FWA (Fraud, Waste & Abuse) training + attestation tracking as its own record type.**
CHC-MCOs require network-provider staff to complete FWA training with a follow-up attestation (confirmed for
AmeriHealth Caritas via an online attestation form; PA Health & Wellness's "2026 HCBS Annual Training
Presentation" naming strongly implies an annual cycle, though the exact cadence wasn't independently
confirmed in readable text for every MCO). The generic `trainings`/`training_records` tables could hold this,
but there's no seeded FWA training type or attestation-specific tracking distinct from general in-services.
*Recommended action:* seed an FWA training type with an annual due-date cadence and route it through the
existing expiration-alert / policy-acknowledgment infrastructure rather than building something new.

**2.7 — EVV reconciliation (optional enhancement, not an urgent gap).**
Confirmed in code: `evvStatus` on `caregiver_schedules` (`server/storage.ts:5299-5315`) is computed purely
from GPS distance at clock-in/out (compliant if both readings are within 150m of the expected address) — it
has no connection to HHAeXchange or Sandata. Since the agency already submits real EVV data to HHAeXchange
through a separate channel, **this is not a compliance gap today**. It's worth flagging as a future
enhancement anyway: PA raised the required auto-verification rate to **≥85% effective January 1, 2025**, with
a mandatory Corrective Action Plan triggered after 3 consecutive months below that threshold, and claims
without a matching aggregator-side visit are denied with error code 928. A reconciliation view (comparing this
app's clock-in/out records against what HHAeXchange actually received) would catch missed or late visits
before they turn into a denial or drag the 85% number down — but only worth building if/when the manual
cross-checking process becomes a real pain point.

### Tier 3 — organizational / lower urgency

**2.8 — Client rights tracking (28 Pa. Code § 611.57).**
No tracking exists for: the required pre-service "information packet" (services offered, schedule, fees,
worker competency requirements, DOH complaint hotline 1-866-826-3644, and the local Area Agency on Aging
Ombudsman contact); the **10-calendar-day advance written notice** requirement before terminating services
(shorter only for non-payment 14+ days after warning, or worker-safety risk); or the **"Consumer Notice of
Direct Care Worker Status"** disclosure (whether the worker is an employee or independent contractor, per 40
Pa.B. 234). These could plug into the existing e-signature engine (`esignature_templates`) and
`client-intake.tsx` flow as required documents/checklist items at intake.

**2.9 — No formal OIG "Seven Elements" compliance-program tracking.**
MCO provider agreements commonly incorporate by reference the OIG's seven elements of an effective compliance
program (written policies, a designated compliance officer/committee, training, communication/hotline lines,
internal monitoring/auditing, disciplinary enforcement, and prompt corrective action — refreshed in OIG's
General Compliance Program Guidance, Nov. 2023). `patient_complaints` partially overlaps as a
grievance-adjacent log but isn't the same thing as a designated compliance-officer record or an anonymous
reporting hotline log. Lower priority — this is as much an organizational/policy decision as a software
feature.

**2.10 — Record retention.**
No enforced retention policy exists in the app. The federal 7-year home-health clinical-record retention rule
(28 Pa. Code § 601.36) **does not apply** to this agency's Chapter 611 license. Research could not find a
definitive numeric retention period for Chapter 611 HCA employee/background-check files specifically (the
regulation requires files be kept "available for DOH inspection" without a citable numeric duration in the
sections retrieved). Recommend getting a direct answer from DOH's Division of Home Health before building any
retention-period enforcement — there's currently no clear rule to encode.

---

## 3. Research caveats — verify before hard-coding

- **W1793 HCPCS code** — appeared in only one secondary source as a "PA-specific" companion/personal-assistance
  billing code; could not be independently confirmed against a primary MCO fee schedule. Don't encode this
  without checking each MCO's current approved billing-code list directly.
- **S5125 vs. T1019** — both are legitimate personal-care/attendant-care HCPCS codes, but which one a given MCO
  expects can differ; confirm per-MCO before hardcoding a default.
- **Sandata/HHAeXchange merger (Oct. 2024)** — the current model (CHC-MCOs → HHAeXchange, FFS/PROMISe →
  Sandata, participant-directed → Time4Care/PPL) may not stay stable now that HHAeXchange has acquired Sandata.
  Re-check before building any EVV integration.
- **Critical-incident timeframes by category** — the 24-hour rule is confirmed for the general case, but
  whether death, elopement, or hospitalization carry a stricter/immediate window couldn't be confirmed (the
  source Bulletin PDF wasn't parseable in this research). Get a clean copy before encoding per-category logic.
- **MCO recredentialing cycle length** — assumed ~3 years from the general NCQA/42 CFR § 438.214 baseline, not
  confirmed verbatim for AmeriHealth Caritas, PA Health & Wellness, or UPMC specifically.
- **Background-check recheck cadence** — **PA does not require periodic rechecks** for Chapter 611 HCA/HCR
  staff; the Chapter 611 rulemaking preamble explicitly states a one-time check suffices unless the agency has
  reason to believe another is warranted. If `expiration-alert-service.ts` currently nags about background
  checks "expiring," that's a stricter-than-required internal policy choice, which is fine to keep, but should
  not be presented anywhere in the app as a legal mandate.

---

## 4. Suggested next step

Pick items from Tier 1 first (MCO seeding, Service-Coordinator incident tracking, claims timely-filing alerts,
authorization–care-plan linkage) for a follow-up implementation session — they're the most concretely
specified and carry the most direct financial/audit consequence given the agency bills CHC-MCOs today. Before
building the Service-Coordinator incident fields or the credentialing tracker specifically, get a clean copy
of the OLTL Critical Incident Management Bulletin and each MCO's Credentialing provider-manual chapter so the
deadlines/cycles encoded in the software match the current, real requirement rather than a research estimate.
