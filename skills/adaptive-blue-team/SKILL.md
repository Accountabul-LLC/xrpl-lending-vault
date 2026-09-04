---
name: adaptive-blue-team
description: Application-adaptive Blue Team remediation. Use when the user provides a Red Team report, pentest findings, or handoff and wants root-cause analysis, code fixes, regression tests, and a retest package. Understand the app and the failed security property; do not only patch the reported line. Replaces lending-vault-specific blue-team-security.
---

# Adaptive Blue Team (Solo)

Act exclusively as the **Blue Team**.

Receive confirmed findings, understand the application independently, fix the failed security property, add regression tests, harden nearby identical weaknesses conservatively, and return work for **independent retest**.

```text
Understand app
        ↓
Read finding
        ↓
Reproduce
        ↓
Determine security boundary
        ↓
Identify root cause
        ↓
Search for similar weaknesses
        ↓
Design fix (may differ from Red Team advice)
        ↓
Implement
        ↓
Regression + security tests
        ↓
Ready for retest
```

Do **not** run an unrestricted penetration test. Do **not** declare findings permanently CLOSED when an independent Red Team retest is expected.

---

## Required reading (do this first)

Read and follow, in order:

1. `skills/adaptive-security-shared/references/authorization.md`
2. `skills/adaptive-security-shared/references/discovery.md`
3. `skills/adaptive-security-shared/references/modules.md`
4. `skills/adaptive-security-shared/references/artifacts.md`

---

## When to use

Use when the operator provides (or points to):

- `RED_TEAM_REPORT.md`
- `RED_TEAM_TO_BLUE_TEAM_HANDOFF.md`
- `APPLICATION_SECURITY_PROFILE.md` from Red Team (re-validate; do not blindly trust)
- Another structured security audit / pentest report
- Security tickets with reproducible findings

If no findings exist and the operator wants offensive testing, use `adaptive-red-team` or `adaptive-red-blue-cycle`.

---

## Independent reasoning (critical)

Understand **both**:

1. The application (run discovery yourself)
2. The vulnerability (which security property failed)

Do not merely patch the line the Red Team named.

Do not automatically implement the Red Team’s suggested remediation if a better architectural control exists (central policy layer vs one `if` on one route, ownership checks in storage vs presentation, capability tokens vs ad-hoc IDs, etc.). Record disagreement and the chosen boundary.

Do not accept “we changed the code” as the definition of done. Mark `READY FOR RETEST`.

---

## Inputs

Require at least one of:

| Input | Purpose |
| --- | --- |
| `RED_TEAM_TO_BLUE_TEAM_HANDOFF.md` | Preferred prioritized queue |
| `RED_TEAM_REPORT.md` | Full findings |
| `RED_TEAM_CHANGE_LOG.md` | Tester-induced state vs true vulns |
| `APPLICATION_SECURITY_PROFILE.md` | Starting profile to re-validate |
| `security-findings.json` | Machine-readable queue |
| Repo access | Inspect and patch |
| Environment notes | How to run tests |

If reproduction steps are incomplete, document blockers rather than guessing.

---

## Phase 0 — Understand the application

Run discovery from `discovery.md` **independently** of the Red Team narrative.

Write or update `APPLICATION_SECURITY_PROFILE.md`. If you disagree with the Red Team’s type, assets, or modules, say so and proceed from evidence.

Select a **defensive** persona from `modules.md` (Secure Backend Engineer, Identity Security Engineer, Wallet Security Engineer, etc.) that matches the failed properties and the real app. Declare it with the SECURITY PERSONA block.

---

## Phase 1 — Intake (no code changes yet)

Read all findings. Queue:

1. CRITICAL  
2. HIGH  
3. MEDIUM  
4. LOW  
5. INFORMATIONAL  

Within the same severity, prioritize using **this application’s** ranked assets — not a hardcoded “funds then vault then loans” list.

Typical high-rank failures (only if those assets exist): secret material, auth bypass, admin takeover, unauthorized movement of value, cross-user access to top private objects, integrity of irreversible operations.

Write `BLUE_TEAM_REMEDIATION_PLAN.md` before coding.

---

## Phase 2 — Reproduce and root-cause

For each finding:

- Reproduce in the authorized environment when possible
- Name the failed security property
- Separate root cause from symptom
- Find adjacent endpoints / jobs / clients sharing the flaw

**Systemic rule:** if `/api/books/123` lacks object authorization, inspect `/api/books/*` (and sibling resources) before declaring the class fixed. If one wallet endpoint skips ownership checks, inspect the other wallet endpoints. Do not rewrite unrelated subsystems.

---

## Phase 3 — Tasks

Preserve the audit chain:

```text
BT-001  ← source RT-003
```

Each task uses the template in `artifacts.md`.

---

## Phase 4 — Implement

Apply the **minimum safe change** that restores the security property without breaking authorized behavior.

Fix classes depend on what this app actually is. Examples — use only if relevant:

- Server-side ownership / tenant / entitlement checks on every object access
- Central authorization middleware or policy
- Schema / input validation
- Parameterized queries / safe datastore APIs
- Idempotency for operations that must not double-apply
- Transactional integrity for balances or inventory
- Replay protection for signed or paid requests
- Rate limiting on auth and other sensitive actions
- Secret handling (no secrets in logs, client bundles, or errors)
- Session expiry, rotation, logout invalidation
- Least-privilege admin and tool/agent permissions
- Entitlement checks on file/content URLs

**Frontend-only checks are not sufficient** for authorization, entitlements, or financial/inventory invariants.

Never introduce backdoors, debug auth bypasses, or temporary control weakening that can ship.

---

## Phase 5 — Tests

Where practical, add automated tests for every fix.

Always include:

- Authorized actor can still complete the legitimate action
- Original attack is denied without leaking the object/body
- Same-class adjacent path if the failure was systemic

Do **not** copy lending-specific invariant tests into an ebook app (or content tests into a wallet) unless those features exist. Derive invariants from the profile’s critical assets.

Run the project’s relevant test suite. Fix regressions you introduced.

---

## Phase 6 — Limited adjacent hardening

Harden clearly identical issues if small and safe. Record broader recommendations as follow-ups. Do not silently expand into a major rewrite.

---

## Phase 7 — Documentation

Required:

1. `BLUE_TEAM_REMEDIATION_PLAN.md`
2. `BLUE_TEAM_REMEDIATION_REPORT.md` — persona, findings received/fixed/blocked/accepted, `BT-###` → `RT-###`, root cause, files changed, tests, residual risk
3. `BLUE_TEAM_CHANGE_LOG.md`
4. `READY_FOR_RETEST.md` — original attack, expected post-fix behavior, exact retest steps, build/commit, limitations

Optional: `security-remediation.json` / updated `security-findings.json`

Statuses: see `artifacts.md`. Mark `READY FOR RETEST`, not final `CLOSED`, when Red Team retest is expected.

---

## Stop conditions

Stop when in-scope findings are fixed, blocked with reason, or accepted as risk by the owner; tests exist where practical; and the required artifacts exist.

Do **not**:

- Run a broad new offensive campaign under this skill
- Close findings as final solely because code changed
- Claim production is “secure” without retest and a deployment process
