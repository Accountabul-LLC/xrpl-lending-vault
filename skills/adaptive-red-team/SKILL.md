---
name: adaptive-red-team
description: Application-adaptive authorized Red Team assessment. Use when the user asks for red team testing, pentesting, vulnerability discovery, attack-surface mapping, or a Red Team report/handoff without fixing code. Discover what the app actually is, then select personas and tests. Replaces lending-vault-specific red-team-security.
---

# Adaptive Red Team (Solo)

Act exclusively as the **Red Team**. Discover, prove, document, and hand off vulnerabilities in an **explicitly authorized** environment. Recommend remediation. **Do not fix application code.**

```text
Discover application
        ↓
Model threats
        ↓
Select persona
        ↓
Custom test plan
        ↓
Attack / validate
        ↓
Cleanup
        ↓
Report / handoff
```

Never:

```text
Generic checklist → Attack everything → Patch code
```

A skilled human security engineer does not walk into every application and perform the same assessment. This skill must not either.

---

## Required reading (do this first)

Read and follow, in order:

1. `skills/adaptive-security-shared/references/authorization.md`
2. `skills/adaptive-security-shared/references/discovery.md`
3. `skills/adaptive-security-shared/references/modules.md`
4. `skills/adaptive-security-shared/references/artifacts.md`

---

## When to use

Use when the operator wants:

- Offensive assessment only
- Sandbox / authorized penetration testing
- Attack-surface mapping and exploit verification
- A findings report and Blue Team handoff
- Retest of previously fixed findings (retest-only mode)

Do **not** implement patches. Point remediations to `adaptive-blue-team` or `adaptive-red-blue-cycle`.

---

## Inputs

Accept or determine:

| Input | Notes |
| --- | --- |
| Target | URL, repo, or local stack |
| Authorized environment | Sandbox / staging / local unless scope is expanded |
| Test identities | Whatever roles this app actually has |
| Allowed scope | Features, networks, accounts |
| Prohibited actions | Explicit denylist |
| Prior reports | Optional, for retest mode |

Do not invent roles such as Depositor / Borrower / Vault Administrator unless discovery finds them.

---

## Phase 0 — Understand the application

Run the full discovery workflow from `discovery.md`.

Write `APPLICATION_SECURITY_PROFILE.md` **before** aggressive testing.

If discovery shows a low-tier static site, keep the assessment proportionate. If it shows wallets, payments, or admin isolation failures, go deep on those assets.

---

## Phase 1 — Reconstruct

From the repo and (if available) running app, produce:

```text
Application Profile
Architecture Map
Role Map
Data Classification
Critical Asset Map
Trust Boundary Map
Attack Surface Map
```

Record expected happy-path outcomes for later comparison. Baseline **this application's** real flows (login, the actual create/read/update/delete paths, checkout, publish, sign, etc. — only those that exist).

---

## Phase 2 — Threat model

For each critical asset:

```text
Who should access it?
Who should not access it?
Who can modify it?
What validates modification?
What happens if validation fails?
What boundaries protect it?
```

Write realistic abuse scenarios. Save as `THREAT_MODEL.md`.

---

## Phase 3 — Build persona

Select specializations from the catalog in `modules.md` that match the profile. Combine several if needed.

Declare the persona in the report using the **SECURITY PERSONA** block from `discovery.md`.

Examples of the *idea*, not defaults:

- Wallet → wallet + auth + API + financial business logic
- Ebook → account + entitlement + file delivery + API authz
- Marketplace → API + authorization + payments + business logic
- Internal admin tool → identity + authorization + audit logging

Do not use a single permanent “Red Team Security Engineer for lending vaults” persona.

---

## Phase 4 — Custom test plan

Write `RED_TEAM_TEST_PLAN.md` for **this** application.

Separate tests:

```text
Critical
High Value
Useful
Low Priority
Not Applicable
```

Evaluate CORE domains for relevance, then only the modules discovery loaded. Explicitly list **Not Applicable** items with reasons (e.g. “No smart contracts detected”).

Prioritize attacks against:

1. Critical assets
2. Trust boundaries
3. Privileged functionality
4. Sensitive data
5. Irreversible operations
6. Authentication
7. Authorization
8. Business logic

Do not perform irrelevant tests because they appeared on a generic or vault-specific checklist.

---

## Phase 5 — Controlled testing

Stay inside authorized scope. Be adversarial toward developer assumptions.

Cover what the plan marked Critical / High Value. Typical CORE probes (skip if N/A):

- **Authentication** — login, registration, reset, MFA, session expiry, token validation, API auth bypass
- **Authorization** — User A vs User B vs admin; horizontal and vertical escalation; IDOR on whatever objects this app owns
- **API** — object-level authz, unexpected methods, over-sharing, ID enumeration, hidden/debug endpoints
- **Input / datastore** — injection appropriate to the actual datastore, mass assignment, error leakage
- **Secrets / disclosure** — payloads, errors, client bundles, configs, logs (redact)
- **Logging probe** — generate controlled failed-auth / unauthorized events; note whether they were recorded without leaking secrets

Then execute loaded **non-CORE modules** (FINANCIAL, BLOCKCHAIN, CONTENT, MARKETPLACE, AI) using `modules.md`.

Prove exploitability with evidence. Do not mark a finding confirmed on static suspicion alone if a safe synthetic proof is possible.

---

## Phase 6 — Cleanup

Follow `authorization.md`. Log unrestored mutations.

---

## Phase 7 — Report and handoff

Stop. Do not patch code.

Required:

1. `APPLICATION_SECURITY_PROFILE.md`
2. `THREAT_MODEL.md`
3. `RED_TEAM_TEST_PLAN.md`
4. `RED_TEAM_REPORT.md` — executive summary, persona, attack surface, `RT-###` findings, scope metadata, residual risks
5. `RED_TEAM_CHANGE_LOG.md`
6. `RED_TEAM_TO_BLUE_TEAM_HANDOFF.md`

Optional: `security-findings.json`

Use templates in `artifacts.md`. Recommended remediations are **advice**. Blue Team may choose a better architectural fix.

---

## Retest-only mode

When asked to retest after Blue Team work:

1. Load original `RT-###` and `READY_FOR_RETEST.md` if present.
2. Re-read the application profile; do not assume the app type changed.
3. Reproduce the **original attack conditions** against the updated build.
4. Do not pass by code review alone.
5. Record `PASS` | `FAIL` | `PARTIAL` | `NOT TESTED`.
6. On FAIL / PARTIAL, return to Blue Team with fresh evidence.
7. Only mark CLOSED after behavioral retest PASS (or documented owner risk acceptance).

---

## Stop conditions

Stop when authorized scope is covered (or blocked with reason), findings are documented, cleanup is done, and the required artifacts exist.

**Do not** modify application code to resolve vulnerabilities.

**Do not** silently mark issues fixed.

---

## Separation of duties

| This skill does | This skill does not |
| --- | --- |
| Discover the app, then attack what matters | Assume lending / vault / wallet / ebook |
| Prove and document issues | Run every test on a universal checklist |
| Hand off to Blue Team | Implement patches |
| Independent behavioral retest | Close findings because code changed |
