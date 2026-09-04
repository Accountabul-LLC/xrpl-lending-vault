---
name: red-blue-security-cycle
description: Full authorized Red Team then Blue Team security lifecycle with independent retest. Use when the user wants discover→handoff→fix→retest→final report for an app or lending/vault protocol in a sandbox, with separation of duties preserved even if one agent plays both roles.
---

# Red Team / Blue Team Combined Cycle

Orchestrate a complete, auditable security lifecycle in an **authorized test environment**.

Even when one agent executes both roles, keep phases **strictly separated**:

```text
Discover  →  Handoff  →  Fix  →  Retest  →  (repeat if needed)  →  Final Report
```

Never collapse into:

```text
Discover → Fix → Mark resolved
```

without handoff artifacts and an independent behavioral retest of the original attack.

---

## When to use

Use this skill when the user wants:

- End-to-end assessment + remediation + verification
- A full security engagement with audit trail
- Dashboard-ready findings lifecycle data
- Coordinated Red and Blue work on a lending, vault, wallet, or API-backed application

If the user only wants discovery, use Red Team Solo methodology **within Phase 3** and stop after handoff.  
If the user only wants fixes for an existing report, use Blue Team Solo methodology **within Phase 5**.

---

## Authorization boundaries (hard stop)

Before seeding or testing:

1. Confirm dedicated security sandbox / authorized staging.
2. Confirm synthetic users, wallets, vaults, loans, and credentials only.
3. Confirm production and real customer data are out of scope unless explicitly authorized.

**Stop** if the target appears to be production, a third party, or otherwise unauthorized.

Never:

- Attack third-party infrastructure
- Use real customer data or live wallets/funds
- Plant persistence or backdoors
- Leave elevated accounts or exploit artifacts behind
- Run uncontrolled denial-of-service

Redact secrets in all artifacts.

---

## Shared ID model (audit chain)

One vulnerability keeps one Red Team ID for life:

```text
RT-004
  → BT-004 (source RT-004)
    → RETEST-004 (source RT-004)
```

Statuses may evolve; IDs do not change.

Suggested overall statuses:

```text
identified → confirmed → handed_off → fix_in_progress → ready_for_retest
  → retest_passed → closed
  → retest_failed → fix_in_progress (loop)
  → accepted_risk
```

---

## End-to-end workflow

```text
AUTHORIZED TEST ENVIRONMENT
          ↓
      SEED DATA
          ↓
     BASELINE TEST
          ↓
       RED TEAM
          ↓
    SECURITY REPORT
          ↓
   BLUE TEAM HANDOFF
          ↓
       BLUE TEAM
          ↓
     REMEDIATION
          ↓
       RED TEAM
          ↓
        RETEST
          ↓
    REGRESSION TEST
          ↓
     FINAL REPORT
```

---

## Phase 1 — Environment preparation

Verify authorization.

Seed approximately **50** synthetic records when the system supports it. Example mix:

```text
10 Depositors
10 Borrowers
5 Brokers / Originators
5 Guarantors
5 Administrators
15 General Users
```

Also create synthetic vaults, loans (pending / approved / rejected / active), deposits, repayments, wallets, documents, and audit log entries.

Create multiple permission levels, for example:

Guest · Authenticated User · Depositor · Borrower · Broker · Vault Administrator · Platform Administrator · Security Administrator

Snapshot how to rebuild the seed data.

---

## Phase 2 — Baseline

Before attacking, verify expected authorized behavior:

- Login / logout / session
- Deposit and withdraw happy paths
- Loan request → approve → fund → repay happy paths
- Admin-only actions reject non-admins
- Users cannot access each other’s objects in normal UI flows

Store baseline notes for comparison after remediation.

---

## Phase 3 — Red Team assessment (Agent A)

Adopt the **Red Team Solo** role fully.

Rules for this phase:

- Inspect attack surface and test boundaries
- Prove exploitability with evidence
- Document findings as `RT-###`
- Log every intentional state change
- Clean up test artifacts
- **Do not fix application code**

Test categories (minimum):

- Authentication weaknesses
- Authorization failures (horizontal and vertical)
- Insecure direct object references
- Injection and unsafe DB access
- API authz and excessive data exposure
- Secret leakage
- Session issues
- Financial business-logic flaws
- Transaction replay / duplicate operations
- Race conditions on balances and funding
- Wallet ownership and signature validation (test wallets only)
- Rate limiting and logging gaps

Financial impossible states to pursue in the sandbox:

```text
vault balance < 0
withdrawal > authorized position
loan funded twice
loan repaid without sufficient payment
yield credited twice
user A controls user B's financial position
```

### Red Team outputs (this phase)

- `RED_TEAM_REPORT.md`
- `RED_TEAM_CHANGE_LOG.md`
- `security-findings.json` (create/update)

Finding fields required: ID, title, severity, status, component, endpoint, roles, description, impact, test performed, evidence, reproduction, data exposed/modified, original/modified state, cleanup, recommended remediation, Blue Team priority, retest requirements.

Severity: CRITICAL | HIGH | MEDIUM | LOW | INFORMATIONAL

---

## Phase 4 — Formal handoff

Create `RED_TEAM_TO_BLUE_TEAM_HANDOFF.md`:

```markdown
# SECURITY REMEDIATION HANDOFF

Red Team Assessment Date:
Environment:
Application Version:
Database Version:
Commit / Build Tested:
Red Team Tester:
Blue Team Owner:
```

Include a priority queue (Critical → Informational) with enough detail for remediation without Red Team present.

**Gate:** Do not start Blue Team code changes until this handoff exists.

---

## Phase 5 — Blue Team remediation (Agent B)

Adopt the **Blue Team Solo** role fully.

Rules for this phase:

- Work from the handoff / report — not a new unscoped offensive campaign
- Analyze root causes (prefer systemic fixes for systemic failures)
- Implement secure patches
- Add regression and financial invariant tests
- Document changes
- Mark items `READY FOR RETEST`
- **Do not** mark final `CLOSED` here when retest is required

Prioritize unauthorized funds movement, key exposure, DB compromise, auth bypass, privilege escalation, then cross-user leakage.

### Blue Team outputs (this phase)

- `BLUE_TEAM_REMEDIATION_REPORT.md`
- `BLUE_TEAM_CHANGE_LOG.md`
- `READY_FOR_RETEST.md`
- Updated `security-findings.json`

---

## Phase 6 — Independent Red Team retest (Agent A again)

Switch back to Red Team mindset.

For each `READY FOR RETEST` item:

1. Read original `RT-###` exploit conditions.
2. Replay the **same behavioral attack** on the updated build.
3. Do not pass based only on reading the Blue Team diff.
4. Assign `RETEST-###` result: `PASS` | `FAIL` | `PARTIAL` | `NOT TESTED`.

Example:

```text
Original: User A GET /api/loans/200 received User B's loan
Retest:   Repeat the same request as User A
Expect:   403 (or equivalent) with no loan payload
```

If `FAIL` or `PARTIAL`:

```text
BLUE TEAM → remediate → READY FOR RETEST → RED TEAM retest
```

Loop until `PASS`, formal `ACCEPTED RISK`, or documented blocker.

Update `security-findings.json` after each retest.

---

## Phase 7 — Regression and final verification

Re-run:

- Application unit/integration tests
- New security regression tests
- Baseline happy-path financial flows from Phase 2
- Spot-check that cleanup left no elevated backdoor accounts

---

## Phase 8 — Final report

Generate `FINAL_SECURITY_ASSESSMENT.md` including:

### Scope

Systems and features tested.

### Environment

Sandbox identity, versions, commit/build.

### Security summary

```text
Total findings: N
Critical: …
High: …
Medium: …
Low: …
Informational: …
```

### Remediation summary

```text
Fixed: …
Accepted Risk: …
Remaining: …
```

### Retest summary

```text
Passed: …
Failed: …
Partial: …
Not Tested: …
```

### Critical / High remaining

Call out unresolved serious issues explicitly.

### Security improvements

What changed in controls, tests, and operations.

### Remaining risks

What still needs work.

### Recommended next assessment

Follow-up scope (e.g. deeper race tests, chain-specific review, chaos on ledger concurrency).

---

## Machine-readable state

Maintain `security-findings.json` throughout:

```json
{
  "assessment": {
    "environment": "security-sandbox",
    "status": "in-progress",
    "mode": "red-blue-cycle"
  },
  "findings": [
    {
      "id": "RT-001",
      "severity": "high",
      "title": "Broken object authorization",
      "red_team_status": "confirmed",
      "blue_team_status": "fixed",
      "retest_status": "passed",
      "blue_id": "BT-001",
      "retest_id": "RETEST-001"
    }
  ]
}
```

Design artifacts so a future dashboard can show:

```text
SECURITY ASSESSMENT
N Findings
… by severity
… Fixed / Awaiting Retest / Accepted Risk / Remaining
```

With drill-down:

```text
Finding → Evidence → Red Report → Blue Fix → Tests → Retest Result
```

---

## Change / breakage log (entire engagement)

Keep `RED_TEAM_CHANGE_LOG.md` for offensive mutations and `BLUE_TEAM_CHANGE_LOG.md` for remediation commits.

Blue Team must be able to distinguish:

- vulnerabilities discovered  
vs  
- intentional temporary state changes during testing  

Restore disposable state after Red Team phases whenever practical.

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

Preserve the handoff gate and retest gate even when one model plays both agents.

---

## Deliverables checklist

At engagement end, these should exist:

```text
RED_TEAM_REPORT.md
RED_TEAM_CHANGE_LOG.md
RED_TEAM_TO_BLUE_TEAM_HANDOFF.md
BLUE_TEAM_REMEDIATION_REPORT.md
BLUE_TEAM_CHANGE_LOG.md
READY_FOR_RETEST.md
FINAL_SECURITY_ASSESSMENT.md
security-findings.json
```

---

## Stop conditions

Stop and publish the final report when:

- In-scope Red Team testing is complete
- Handoff and remediation are complete for confirmed issues (or explicitly deferred)
- Behavioral retests are recorded for items marked ready
- Failed retests are either fixed+retested, accepted as risk, or listed as remaining
- Cleanup is done
- `FINAL_SECURITY_ASSESSMENT.md` accurately states remaining Critical/High issues

Do not claim a clean bill of health while Critical/High items remain failed or untested without clear disclosure.
