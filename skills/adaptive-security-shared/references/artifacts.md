# Artifact templates (shared)

Use these shapes unless the operator names different paths.

Redact secrets. Distinguish **discovered vulnerabilities** from **tester-induced state changes**.

---

## Dynamic test plan item

```text
TEST-001
Authentication
Priority: Critical
Reason: Account controls access to private customer data.

TEST-002
Object-Level Authorization
Priority: Critical
Reason: Users own individually addressable resources.

TEST-003
Smart Contract Security
Status: Not Applicable
Reason: No smart contracts detected.
```

Priorities: `Critical` | `High Value` | `Useful` | `Low Priority` | `Not Applicable`

---

## Finding (`RT-###`)

Required fields:

- ID, title, severity, status
- Affected component / endpoint / roles
- Failed security property (authn, authz, integrity, confidentiality, …)
- Related asset IDs (`ASSET-###`)
- Description, security impact
- Test conditions and evidence
- Reproduction steps
- Data accessed / modified
- System state before and after
- Cleanup performed
- Recommended remediation (advisory — Blue Team may reject it)
- Recommended Blue Team priority
- Retest requirements

Severity is **profile-relative**. A public-info leak on a brochure site is not the same as a private-key leak on a wallet. Calibrate using the application risk tier and the affected asset rank.

Default scale (adjust with justification in the report):

| Severity | Typical meaning |
| --- | --- |
| CRITICAL | Full auth bypass, secret-key leak, admin takeover, unauthorized movement of high-value assets, system-wide cross-user access to the top assets |
| HIGH | Privilege escalation, cross-account modification, sensitive disclosure, major authz failure |
| MEDIUM | Limited leakage, missing rate limits, weak config with realistic abuse |
| LOW | Verbose errors, minor disclosure, hardening gaps |
| INFORMATIONAL | Defense-in-depth notes, non-exploitable observations |

---

## Red Team change log entry

```text
Change ID: CHANGE-004
Associated Finding: RT-007
Original State: …
Modified State: …
Method: …
Impact: …
Cleanup: …
Verified: Yes/No
```

---

## Handoff header

```markdown
# SECURITY REMEDIATION HANDOFF

Red Team Assessment Date:
Environment:
Application Type (from profile):
Application Version:
Commit / Build Tested:
Red Team Tester:
Blue Team Owner:
Risk Tier:
Selected Red Team Persona:
```

---

## Blue Team task (`BT-###`)

```markdown
## BT-001

Source Finding: RT-003
Severity: …
Status: READY FOR RETEST

Issue:
…

Affected Component:
…

Failed Security Property:
…

Root Cause:
…

Required Fix:
(Blue Team's architectural choice — not a copy of Red Team's suggestion if a better boundary exists)

Tests Required:
- Authorized case still works
- Original attack is denied
- Adjacent same-class paths if the failure was systemic

Expected Result:
…

Regression Test: Required / Not practical (reason)
```

---

## Blue Team change log entry

```text
Change ID: BT-CHANGE-001
Source Finding: RT-003
Blue Team Task: BT-001
Files Modified: …
Fix Summary: …
Tests Added: …
Risk Notes: …
```

---

## Remediation statuses

```text
OPEN
ASSIGNED
IN PROGRESS
FIX IMPLEMENTED
TESTS PASSING
READY FOR RETEST
RETEST FAILED
RETEST PASSED
CLOSED
ACCEPTED RISK
```

- `READY FOR RETEST` = Blue Team believes it is fixed; awaiting independent proof.
- `CLOSED` after behavioral retest PASS, or documented owner risk acceptance.
- `ACCEPTED RISK` requires owner, rationale, residual risk, and review date.

---

## Audit chain

One vulnerability keeps one Red Team ID for life:

```text
RT-004
  → BT-004 (source RT-004)
    → RETEST-004 (source RT-004)
```

Statuses change; IDs do not.

Suggested overall statuses:

```text
identified → confirmed → handed_off → fix_in_progress → ready_for_retest
  → retest_passed → closed
  → retest_failed → fix_in_progress (loop)
  → accepted_risk
```

---

## `security-findings.json`

```json
{
  "assessment": {
    "environment": "security-sandbox",
    "application_type": "<from profile>",
    "risk_tier": 3,
    "status": "in-progress",
    "mode": "red-team | blue-team | red-blue-cycle",
    "red_persona": "",
    "blue_persona": ""
  },
  "findings": [
    {
      "id": "RT-001",
      "severity": "high",
      "title": "Broken object authorization",
      "asset_ids": ["ASSET-002"],
      "red_team_status": "confirmed",
      "blue_team_status": "pending",
      "retest_status": "not_tested",
      "blue_id": null,
      "retest_id": null
    }
  ]
}
```
