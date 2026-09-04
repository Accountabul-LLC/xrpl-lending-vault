---
name: adaptive-red-blue-cycle
description: Application-adaptive Red then Blue security lifecycle with independent retest. Use when the user wants discover→profile→attack→handoff→fix→retest→final report on any app type in an authorized environment. Preserves separation of duties even if one agent plays both roles. Replaces lending-vault-specific red-blue-security-cycle.
---

# Adaptive Red / Blue Cycle

Orchestrate a complete, auditable security lifecycle in an **authorized** environment.

The application determines the methodology. The methodology must not assume what the application is.

Even when one agent executes both roles, keep phases **strictly separated**:

```text
DISCOVER APPLICATION
        ↓
BUILD APPLICATION PROFILE
        ↓
BUILD THREAT MODEL
        ↓
SELECT RED TEAM PERSONA
        ↓
CREATE CUSTOM ATTACK PLAN
        ↓
RED TEAM TEST
        ↓
DOCUMENT FINDINGS
        ↓
HANDOFF
        ↓
SELECT BLUE TEAM PERSONA
        ↓
ROOT CAUSE ANALYSIS
        ↓
REMEDIATION
        ↓
REGRESSION TEST
        ↓
RED TEAM RETEST
        ↓
PASS / FAIL
        ↓
FINAL SECURITY ASSESSMENT
```

Never collapse into:

```text
Discover → Fix → Mark resolved
```

without handoff artifacts and an independent behavioral retest of the original attack.

---

## Required reading (do this first)

Read and follow:

1. `skills/adaptive-security-shared/references/authorization.md`
2. `skills/adaptive-security-shared/references/discovery.md`
3. `skills/adaptive-security-shared/references/modules.md`
4. `skills/adaptive-security-shared/references/artifacts.md`
5. `skills/adaptive-red-team/SKILL.md`
6. `skills/adaptive-blue-team/SKILL.md`

This skill **orchestrates** those two skills. It does not replace their rules.

---

## When to use

Use when the operator wants end-to-end assessment + remediation + verification on **whatever this repository actually is**.

- Discovery only → run Red Team phases and stop after handoff.
- Fixes only for an existing report → start at the Blue Team phase.

---

## Critical independence rule

Red Team and Blue Team must independently reason about the application.

- Blue Team does **not** have to accept the Red Team’s proposed remediation. It must choose the correct security boundary.
- Red Team does **not** accept “we changed the code” as proof. The original attack must be attempted again.

---

## Shared ID model

```text
RT-004 → BT-004 → RETEST-004
```

IDs never change. Statuses do. See `artifacts.md`.

---

## Phase 1 — Discover and prepare

Confirm authorization (`authorization.md`).

Run application discovery (`discovery.md`). Write `APPLICATION_SECURITY_PROFILE.md`.

Seed **synthetic** data that matches **this** user model — not a hardcoded mix of depositors, borrowers, and vaults.

If the app has roles, create multiple permission levels that actually exist (e.g. visitor / subscriber / author / admin, or buyer / seller / operator). Snapshot how to rebuild the seed.

Depth follows risk tier: a Tier 1 brochure site does not need fifty synthetic financial positions; a Tier 4 wallet or payments system does need enough distinct identities to prove cross-account bugs.

---

## Phase 2 — Baseline

Verify expected authorized behavior for this application’s real happy paths before attacking.

Store baseline notes for comparison after remediation.

---

## Phase 3 — Red Team (Agent A)

Adopt `adaptive-red-team` fully: threat model, persona, custom plan, attack, cleanup, **no code fixes**.

Required in this phase:

- `APPLICATION_SECURITY_PROFILE.md`
- `THREAT_MODEL.md`
- `RED_TEAM_TEST_PLAN.md`
- `RED_TEAM_REPORT.md`
- `RED_TEAM_CHANGE_LOG.md`
- `security-findings.json` (create/update)

---

## Phase 4 — Handoff gate

Create `RED_TEAM_TO_BLUE_TEAM_HANDOFF.md` (header in `artifacts.md`).

**Do not start Blue Team code changes until this handoff exists.**

---

## Phase 5 — Blue Team (Agent B)

Adopt `adaptive-blue-team` fully: independent discovery, defensive persona, root cause, systemic-where-needed fixes, regression tests, **not** final CLOSED.

Required in this phase:

- `BLUE_TEAM_REMEDIATION_PLAN.md`
- `BLUE_TEAM_REMEDIATION_REPORT.md`
- `BLUE_TEAM_CHANGE_LOG.md`
- `READY_FOR_RETEST.md`
- Updated `security-findings.json`

---

## Phase 6 — Independent retest (Agent A again)

Switch back to Red Team mindset.

For each `READY FOR RETEST` item:

1. Read original `RT-###` exploit conditions.
2. Replay the **same behavioral attack** on the updated build.
3. Do not pass based only on reading the Blue Team diff.
4. Assign `RETEST-###`: `PASS` | `FAIL` | `PARTIAL` | `NOT TESTED`.

If `FAIL` or `PARTIAL`:

```text
BLUE TEAM → remediate → READY FOR RETEST → RED TEAM retest
```

Loop until `PASS`, formal `ACCEPTED RISK`, or documented blocker.

---

## Phase 7 — Regression

Re-run:

- Application unit/integration tests
- New security regression tests
- Baseline happy paths from Phase 2
- Spot-check that cleanup left no elevated backdoor accounts

---

## Phase 8 — Final report

Generate `FINAL_SECURITY_ASSESSMENT.md`:

- Application type, risk tier, personas used (Red and Blue)
- Scope and environment
- Counts by severity
- Remediation summary (fixed / accepted risk / remaining)
- Retest summary (passed / failed / partial / not tested)
- Unresolved Critical / High called out explicitly
- Security improvements
- Remaining risks
- Recommended next assessment (only domains that exist)

Do not claim a clean bill of health while Critical/High items remain failed or untested without disclosure.

---

## Deliverables checklist

```text
APPLICATION_SECURITY_PROFILE.md
THREAT_MODEL.md
RED_TEAM_TEST_PLAN.md
RED_TEAM_REPORT.md
RED_TEAM_CHANGE_LOG.md
RED_TEAM_TO_BLUE_TEAM_HANDOFF.md
BLUE_TEAM_REMEDIATION_PLAN.md
BLUE_TEAM_REMEDIATION_REPORT.md
BLUE_TEAM_CHANGE_LOG.md
READY_FOR_RETEST.md
FINAL_SECURITY_ASSESSMENT.md
security-findings.json
```

---

## Separation of duties (non-negotiable)

### Red phases

```text
Discover → Prove → Document → Handoff / Retest
```

Never silently fix during discovery.

### Blue phases

```text
Receive → Analyze → Fix → Test → Ready for Retest
```

Never replace independent retest with “looks fixed in code.”

### Combined orchestration

```text
Discover → Handoff → Fix → Retest → Repeat if necessary → Final Report
```
